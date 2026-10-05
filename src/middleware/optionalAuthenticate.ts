import type { Request, Response, NextFunction } from 'express';
import { authService } from '../modules/auth/auth.service';
import { prisma } from '../lib/prisma';

export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
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

    if (user && user.status !== 'SUSPENDED') {
      req.user = {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        trustLevel: user.trustLevel,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
      };
    }

    next();
  } catch {
    // If optional token is invalid, simply proceed as unauthenticated without throwing
    next();
  }
}
