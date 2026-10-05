import type { Request, Response, NextFunction } from 'express';
import { authService } from '../modules/auth/auth.service';
import { UnauthorizedError, ForbiddenError } from '../core/errors/HttpError';
import { prisma } from '../lib/prisma';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const payload = authService.verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        organizationId: true,
        role: true,
        trustLevel: true,
        status: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Your account has been suspended');
    }

    req.user = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      trustLevel: user.trustLevel,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
    };

    next();
  } catch (err) {
    next(err);
  }
}