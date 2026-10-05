import type { TrustLevel, UserRole, UserStatus } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        organizationId: string;
        role: UserRole | string;
        trustLevel: TrustLevel;
        status: UserStatus;
        emailVerifiedAt: Date | null;
      };
      authSessionId?: string;
    }
  }
}

export {};