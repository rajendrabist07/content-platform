import { body, envelope, commonErrors } from '../helpers';
import {
  generateQuizSchema,
  attemptQuizSchema,
  askArticleSchema,
} from '../../modules/comprehension/comprehension.validation';

export const comprehensionSchemas = {
  QuizQuestion: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'q_1' },
      question: { type: 'string', example: 'What is the primary trade-off of using PostgreSQL advisory locks?' },
      options: {
        type: 'array',
        items: { type: 'string' },
        example: ['Distributed node coordination', 'Memory overhead', 'Session lifetime coupling', 'Slow query parsing'],
      },
    },
    required: ['id', 'question', 'options'],
  },
  QuizResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'quiz_cuid123' },
      postId: { type: 'string', example: 'post_cuid456' },
      questionCount: { type: 'integer', example: 3 },
      questions: { type: 'array', items: { $ref: '#/components/schemas/QuizQuestion' } },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'postId', 'questionCount', 'questions', 'createdAt'],
  },
  QuestionExplanation: {
    type: 'object',
    properties: {
      questionIndex: { type: 'integer', example: 0 },
      question: { type: 'string', example: 'What is the primary trade-off?' },
      userAnswer: { type: 'integer', example: 2 },
      correctAnswer: { type: 'integer', example: 2 },
      isCorrect: { type: 'boolean', example: true },
      explanation: { type: 'string', example: 'Advisory locks are scoped to application connections.' },
      sourceEvidence: { type: 'string', example: 'Verbatim quote from article text...' },
    },
    required: ['questionIndex', 'question', 'userAnswer', 'correctAnswer', 'isCorrect', 'explanation', 'sourceEvidence'],
  },
  QuizAttemptResponse: {
    type: 'object',
    properties: {
      attemptId: { type: 'string', example: 'attempt_123' },
      score: { type: 'integer', example: 3 },
      totalQuestions: { type: 'integer', example: 3 },
      percentage: { type: 'integer', example: 100 },
      passed: { type: 'boolean', example: true },
      feedback: { type: 'array', items: { $ref: '#/components/schemas/QuestionExplanation' } },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['attemptId', 'score', 'totalQuestions', 'percentage', 'passed', 'feedback', 'createdAt'],
  },
  AskArticleResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'qna_cuid123' },
      postId: { type: 'string', example: 'post_cuid456' },
      question: { type: 'string', example: 'How does connection pooling work in this architecture?' },
      answer: { type: 'string', example: 'Connection pooling maintains persistent connections to reduce latency.' },
      groundedQuotes: {
        type: 'array',
        items: { type: 'string' },
        example: ['"Connection pooling amortizes TLS handshake latency."'],
      },
      isGrounded: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'postId', 'question', 'answer', 'groundedQuotes', 'isGrounded', 'createdAt'],
  },
  ComprehensionAnalyticsResponse: {
    type: 'object',
    properties: {
      postId: { type: 'string', example: 'post_cuid456' },
      totalAttempts: { type: 'integer', example: 24 },
      averageScore: { type: 'number', example: 2.4 },
      averagePercentage: { type: 'number', example: 80 },
      passRate: { type: 'number', example: 75 },
      questionStats: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            questionIndex: { type: 'integer', example: 0 },
            question: { type: 'string', example: 'What is the primary trade-off?' },
            totalAnswers: { type: 'integer', example: 24 },
            correctAnswers: { type: 'integer', example: 18 },
            accuracyRate: { type: 'number', example: 75 },
            confusingOptions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  optionIndex: { type: 'integer', example: 1 },
                  optionText: { type: 'string', example: 'Memory overhead' },
                  count: { type: 'integer', example: 4 },
                },
              },
            },
          },
        },
      },
    },
    required: ['postId', 'totalAttempts', 'averageScore', 'averagePercentage', 'passRate', 'questionStats'],
  },
};

export const comprehensionPaths = {
  '/posts/{postId}/quiz/generate': {
    post: {
      tags: ['Comprehension'],
      summary: 'Generate an AI-grounded comprehension quiz for an article',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: body(generateQuizSchema),
      responses: {
        '201': envelope({ $ref: '#/components/schemas/QuizResponse' }, 'Quiz generated successfully'),
        '400': commonErrors.validation(),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
        '404': commonErrors.notFound('Post'),
      },
    },
  },
  '/posts/{postId}/quiz': {
    get: {
      tags: ['Comprehension'],
      summary: 'Get the comprehension quiz for an article (without spoilers/answers)',
      parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': envelope({ $ref: '#/components/schemas/QuizResponse' }, 'Quiz retrieved'),
        '404': commonErrors.notFound('Quiz'),
      },
    },
  },
  '/posts/{postId}/quiz/attempt': {
    post: {
      tags: ['Comprehension'],
      summary: 'Submit answers to an article quiz and receive instant grounded feedback',
      parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: body(attemptQuizSchema),
      responses: {
        '200': envelope({ $ref: '#/components/schemas/QuizAttemptResponse' }, 'Attempt submitted'),
        '400': commonErrors.validation(),
        '404': commonErrors.notFound('Quiz'),
      },
    },
  },
  '/posts/{postId}/ask': {
    post: {
      tags: ['Comprehension'],
      summary: 'Ask this article a question and receive a grounded answer with verbatim quotes',
      parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: body(askArticleSchema),
      responses: {
        '200': envelope({ $ref: '#/components/schemas/AskArticleResponse' }, 'Answer generated'),
        '400': commonErrors.validation(),
        '404': commonErrors.notFound('Post'),
      },
    },
  },
  '/posts/{postId}/analytics/comprehension': {
    get: {
      tags: ['Comprehension'],
      summary: 'Get reader comprehension analytics & confusion points for an article',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': envelope({ $ref: '#/components/schemas/ComprehensionAnalyticsResponse' }, 'Analytics data'),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
        '404': commonErrors.notFound('Post'),
      },
    },
  },
};
