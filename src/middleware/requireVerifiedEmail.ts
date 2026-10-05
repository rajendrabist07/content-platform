import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { ForbiddenError, UnauthorizedError } from '../core/errors/HttpError';

export async function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  if (!env.REQUIRE_VERIFIED_EMAIL) {
    return next();
  }

  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { emailVerifiedAt: true },
    });

    if (!user || !user.emailVerifiedAt) {
      return next(
        new ForbiddenError('Email verification required. Please verify your email to perform this action.')
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}
