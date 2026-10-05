export interface QuizQuestionPublicDTO {
  id: string;
  question: string;
  options: string[];
}

export interface QuizPublicDTO {
  id: string;
  postId: string;
  questionCount: number;
  questions: QuizQuestionPublicDTO[];
  createdAt: string;
}

export interface QuestionExplanationDTO {
  questionIndex: number;
  question: string;
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
  sourceEvidence: string;
}

export interface QuizAttemptResultDTO {
  attemptId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  feedback: QuestionExplanationDTO[];
  createdAt: string;
}

export interface AskArticleResponseDTO {
  id: string;
  postId: string;
  question: string;
  answer: string;
  groundedQuotes: string[];
  isGrounded: boolean;
  createdAt: string;
}

export interface QuestionAnalyticsItem {
  questionIndex: number;
  question: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracyRate: number;
  confusingOptions: { optionIndex: number; optionText: string; count: number }[];
}

export interface ComprehensionAnalyticsDTO {
  postId: string;
  totalAttempts: number;
  averageScore: number;
  averagePercentage: number;
  passRate: number;
  questionStats: QuestionAnalyticsItem[];
}
