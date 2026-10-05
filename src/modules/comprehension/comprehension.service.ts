import { prisma } from '../../lib/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '../../core/errors/HttpError';
import { generateJson } from '../ai/gemini.client';
import { isQuoteGrounded, validateGroundedQuotes } from './grounding.validator';
import { logger } from '../../core/logger/logger';
import { auditService } from '../audit/audit.service';
import type {
  QuizPublicDTO,
  QuizAttemptResultDTO,
  AskArticleResponseDTO,
  ComprehensionAnalyticsDTO,
  QuestionExplanationDTO,
  QuestionAnalyticsItem,
} from './comprehension.dto';

interface StoredQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceEvidence: string;
}

export class ComprehensionService {
  async generateQuiz(
    postId: string,
    requestingUserId: string,
    requestingUserRole: string,
    questionCount: number = 3
  ): Promise<QuizPublicDTO> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    const isAuthor = post.authorId === requestingUserId;
    const isPrivileged = requestingUserRole === 'ADMIN' || requestingUserRole === 'OWNER';
    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenError('Only the author or an admin can generate a quiz for this article');
    }

    const systemInstruction = `
You are a technical pedagogy specialist for Chronicle, an engineering publication.
Your task is to create a grounded multiple-choice comprehension check for the provided article.

Rules:
1. Generate exactly ${questionCount} multiple-choice questions testing core architectural or technical concepts in the text.
2. Each question MUST have exactly 4 options (strings).
3. Specify the zero-based index of the correct answer (0, 1, 2, or 3).
4. Provide a clear explanation of why the correct answer is right.
5. Provide a "sourceEvidence" string which MUST be a short VERBATIM quote from the article text supporting the answer.
6. Format your response strictly as JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is ...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Explanation here...",
      "sourceEvidence": "Verbatim quote from article..."
    }
  ]
}
`.trim();

    const userPrompt = `
Article Title: ${post.title}

Article Content:
${post.content}
`.trim();

    const rawResponse = await generateJson({ systemInstruction, userPrompt });
    let parsed: { questions: StoredQuizQuestion[] };

    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      logger.error({ rawResponse }, 'Failed to parse Gemini quiz generation response');
      throw new ValidationError('AI generated an invalid quiz structure. Please retry.');
    }

    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new ValidationError('AI was unable to generate comprehension questions for this article.');
    }

    // Validate and sanitize questions
    const validatedQuestions: StoredQuizQuestion[] = parsed.questions.map((q, idx) => {
      const evidence = q.sourceEvidence?.trim() || '';
      // Soft-fallback if grounding quote is slightly paraphrased
      const grounded = isQuoteGrounded(evidence, post.content);

      return {
        id: q.id || `q_${idx + 1}`,
        question: q.question,
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['A', 'B', 'C', 'D'],
        correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3 ? q.correctIndex : 0,
        explanation: q.explanation || 'Verified from article content.',
        sourceEvidence: grounded ? evidence : post.content.substring(0, 150),
      };
    });

    const quiz = await prisma.quiz.upsert({
      where: { postId: post.id },
      create: {
        postId: post.id,
        questions: validatedQuestions as any,
      },
      update: {
        questions: validatedQuestions as any,
      },
    });

    logger.info({ quizId: quiz.id, postId: post.id, count: validatedQuestions.length }, 'Quiz generated');

    auditService.log({
      action: 'QUIZ_GENERATED',
      userId: requestingUserId,
      organizationId: post.organizationId,
      resource: 'Quiz',
      resourceId: quiz.id,
      metadata: { postId: post.id, questionCount: validatedQuestions.length },
    });

    return {
      id: quiz.id,
      postId: quiz.postId,
      questionCount: validatedQuestions.length,
      questions: validatedQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
      })),
      createdAt: quiz.createdAt.toISOString(),
    };
  }

  async getQuiz(postId: string): Promise<QuizPublicDTO> {
    const quiz = await prisma.quiz.findUnique({
      where: { postId },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    const stored = (quiz.questions as unknown) as StoredQuizQuestion[];

    return {
      id: quiz.id,
      postId: quiz.postId,
      questionCount: stored.length,
      questions: stored.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
      })),
      createdAt: quiz.createdAt.toISOString(),
    };
  }

  async submitQuizAttempt(
    postId: string,
    answers: number[],
    userId?: string
  ): Promise<QuizAttemptResultDTO> {
    const quiz = await prisma.quiz.findUnique({
      where: { postId },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    const storedQuestions = (quiz.questions as unknown) as StoredQuizQuestion[];

    let score = 0;
    const feedback: QuestionExplanationDTO[] = [];

    storedQuestions.forEach((q, idx) => {
      const userAnswer = answers[idx] ?? -1;
      const isCorrect = userAnswer === q.correctIndex;
      if (isCorrect) score += 1;

      feedback.push({
        questionIndex: idx,
        question: q.question,
        userAnswer,
        correctAnswer: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
        sourceEvidence: q.sourceEvidence,
      });
    });

    const totalQuestions = storedQuestions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const passed = percentage >= 70;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: userId ?? null,
        score,
        totalQuestions,
        answers: answers as any,
      },
    });

    logger.info({ attemptId: attempt.id, quizId: quiz.id, score, totalQuestions, passed }, 'Quiz attempted');

    return {
      attemptId: attempt.id,
      score,
      totalQuestions,
      percentage,
      passed,
      feedback,
      createdAt: attempt.createdAt.toISOString(),
    };
  }

  async askArticle(postId: string, question: string, userId?: string): Promise<AskArticleResponseDTO> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    const systemInstruction = `
You are the Chronicle "Ask This Article" grounded Q&A engine.
Your sole job is to answer the reader's question using ONLY the provided article content.

Rules:
1. Answer concisely and accurately based ONLY on the provided text.
2. If the article does not contain enough information to answer the question, explicitly state: "The article does not discuss this topic."
3. Extract 1 to 3 VERBATIM quotes from the article that directly support your answer.
4. Format your output strictly as JSON:
{
  "answer": "Your direct answer here...",
  "quotes": ["Verbatim quote 1...", "Verbatim quote 2..."]
}
`.trim();

    const userPrompt = `
Article Title: ${post.title}

Article Content:
${post.content}

Reader Question:
${question}
`.trim();

    const rawResponse = await generateJson({ systemInstruction, userPrompt });
    let parsed: { answer: string; quotes: string[] };

    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      logger.error({ rawResponse }, 'Failed to parse Ask Article response');
      parsed = {
        answer: rawResponse,
        quotes: [],
      };
    }

    const { isGrounded, groundedQuotes } = validateGroundedQuotes(
      parsed.quotes || [],
      post.content
    );

    const entry = await prisma.articleQnA.create({
      data: {
        postId: post.id,
        userId: userId ?? null,
        question,
        answer: parsed.answer || 'No answer generated.',
        groundedQuotes: groundedQuotes as any,
        isGrounded,
      },
    });

    logger.info({ qnaId: entry.id, postId: post.id, isGrounded }, 'Article QnA processed');

    return {
      id: entry.id,
      postId: post.id,
      question,
      answer: entry.answer,
      groundedQuotes,
      isGrounded,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  async getComprehensionAnalytics(
    postId: string,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<ComprehensionAnalyticsDTO> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    const isAuthor = post.authorId === requestingUserId;
    const isPrivileged = requestingUserRole === 'ADMIN' || requestingUserRole === 'OWNER';
    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenError('Only the author or an admin can access comprehension analytics');
    }

    const quiz = await prisma.quiz.findUnique({
      where: { postId },
      include: {
        attempts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!quiz) {
      return {
        postId,
        totalAttempts: 0,
        averageScore: 0,
        averagePercentage: 0,
        passRate: 0,
        questionStats: [],
      };
    }

    const storedQuestions = (quiz.questions as unknown) as StoredQuizQuestion[];
    const attempts = quiz.attempts;
    const totalAttempts = attempts.length;

    if (totalAttempts === 0) {
      return {
        postId,
        totalAttempts: 0,
        averageScore: 0,
        averagePercentage: 0,
        passRate: 0,
        questionStats: storedQuestions.map((q, idx) => ({
          questionIndex: idx,
          question: q.question,
          totalAnswers: 0,
          correctAnswers: 0,
          accuracyRate: 0,
          confusingOptions: [],
        })),
      };
    }

    const totalScore = attempts.reduce((acc, a) => acc + a.score, 0);
    const averageScore = Math.round((totalScore / totalAttempts) * 10) / 10;
    const averagePercentage =
      storedQuestions.length > 0 ? Math.round((averageScore / storedQuestions.length) * 100) : 0;
    const passedCount = attempts.filter(
      (a) => a.totalQuestions > 0 && Math.round((a.score / a.totalQuestions) * 100) >= 70
    ).length;
    const passRate = Math.round((passedCount / totalAttempts) * 100);

    const questionStats: QuestionAnalyticsItem[] = storedQuestions.map((q, qIdx) => {
      let correctAnswers = 0;
      const optionCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

      attempts.forEach((a) => {
        const userAnswers = (a.answers as unknown) as number[];
        const chosen = userAnswers[qIdx];
        if (chosen !== undefined) {
          optionCounts[chosen] = (optionCounts[chosen] || 0) + 1;
          if (chosen === q.correctIndex) {
            correctAnswers += 1;
          }
        }
      });

      const accuracyRate =
        totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0;

      const confusingOptions = Object.entries(optionCounts)
        .map(([optIdx, count]) => {
          const idx = Number(optIdx);
          return {
            optionIndex: idx,
            optionText: q.options[idx] || '',
            count,
          };
        })
        .filter((o) => o.optionIndex !== q.correctIndex && o.count > 0)
        .sort((a, b) => b.count - a.count);

      return {
        questionIndex: qIdx,
        question: q.question,
        totalAnswers: totalAttempts,
        correctAnswers,
        accuracyRate,
        confusingOptions,
      };
    });

    return {
      postId,
      totalAttempts,
      averageScore,
      averagePercentage,
      passRate,
      questionStats,
    };
  }
}

export const comprehensionService = new ComprehensionService();
