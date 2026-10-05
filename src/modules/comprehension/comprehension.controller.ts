import type { Request, Response, NextFunction } from 'express';
import { comprehensionService } from './comprehension.service';
import {
  generateQuizSchema,
  attemptQuizSchema,
  askArticleSchema,
} from './comprehension.validation';
import { ValidationError, UnauthorizedError } from '../../core/errors/HttpError';

export class ComprehensionController {
  async generateQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const postId = req.params.postId as string;
      if (!postId) {
        throw new ValidationError('Post ID is required');
      }

      const result = generateQuizSchema.safeParse(req.body);
      const questionCount = result.success ? result.data.questionCount : 3;

      const quiz = await comprehensionService.generateQuiz(
        postId,
        req.user.userId,
        req.user.role,
        questionCount
      );

      res.status(201).json({
        success: true,
        message: 'Comprehension quiz generated successfully',
        data: quiz,
      });
    } catch (err) {
      next(err);
    }
  }

  async getQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.postId as string;
      if (!postId) {
        throw new ValidationError('Post ID is required');
      }

      const quiz = await comprehensionService.getQuiz(postId);

      res.status(200).json({
        success: true,
        data: quiz,
      });
    } catch (err) {
      next(err);
    }
  }

  async submitAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.postId as string;
      if (!postId) {
        throw new ValidationError('Post ID is required');
      }

      const result = attemptQuizSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const userId = req.user?.userId;
      const attemptResult = await comprehensionService.submitQuizAttempt(
        postId,
        result.data.answers,
        userId
      );

      res.status(200).json({
        success: true,
        message: attemptResult.passed
          ? 'Great job! You demonstrated a strong grasp of the material.'
          : 'Comprehension check submitted. Review the feedback and explanations below.',
        data: attemptResult,
      });
    } catch (err) {
      next(err);
    }
  }

  async askArticle(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.postId as string;
      if (!postId) {
        throw new ValidationError('Post ID is required');
      }

      const result = askArticleSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const userId = req.user?.userId;
      const qna = await comprehensionService.askArticle(
        postId,
        result.data.question,
        userId
      );

      res.status(200).json({
        success: true,
        data: qna,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const postId = req.params.postId as string;
      if (!postId) {
        throw new ValidationError('Post ID is required');
      }

      const analytics = await comprehensionService.getComprehensionAnalytics(
        postId,
        req.user.userId,
        req.user.role
      );

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const comprehensionController = new ComprehensionController();
