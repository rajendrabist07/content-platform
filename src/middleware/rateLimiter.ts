import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

const isTest = process.env.NODE_ENV === 'test';
const passThrough = (_req: Request, _res: Response, next: NextFunction) => next();

export const generalLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: {
        success: false,
        message: 'Too many requests, please try again later',
        statusCode: 429,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

export const loginLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes',
        statusCode: 429,
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
    });

export const authActionLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: {
        success: false,
        message: 'Too many requests, please try again after 1 hour',
        statusCode: 429,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

export const aiLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: {
        success: false,
        message: 'Too many AI requests, please try again after 15 minutes',
        statusCode: 429,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });