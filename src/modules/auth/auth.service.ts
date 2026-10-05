import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../core/errors/HttpError';
import { logger } from '../../core/logger/logger';
import { emailService } from '../email/email.service';
import { auditService } from '../audit/audit.service';
import { verifyTurnstileToken } from './turnstile.client';
import { validateEmailDeliverability } from './email.validator';
import type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from './auth.validation';

const SALT_ROUNDS = 10;

export interface AuthContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

interface JwtPayload {
  userId: string;
  organizationId: string;
  role: string;
}

export interface SessionItem {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  isCurrent: boolean;
}

class AuthService {
  async register(input: RegisterInput, context?: AuthContext) {
    // 1. Email syntax, MX, and disposable domain verification
    await validateEmailDeliverability(input.email);

    // 2. Turnstile verification if enabled
    if (env.TURNSTILE_ENABLED) {
      await verifyTurnstileToken(input.captchaToken, context?.ipAddress);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    let organizationId: string;
    let role: 'OWNER' | 'MEMBER';

    if (input.organizationName) {
      const baseSlug = input.organizationName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      let slug = baseSlug;
      const existingOrg = await prisma.organization.findUnique({ where: { slug } });
      if (existingOrg) {
        slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
      }

      const newOrg = await prisma.organization.create({
        data: { name: input.organizationName, slug },
      });

      organizationId = newOrg.id;
      role = 'OWNER';
    } else {
      if (!input.organizationId) {
        throw new NotFoundError('Organization');
      }

      const org = await prisma.organization.findUnique({
        where: { id: input.organizationId },
      });

      if (!org) {
        throw new NotFoundError('Organization');
      }

      organizationId = org.id;
      role = 'MEMBER';
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        organizationId,
        role,
        trustLevel: 'NEW',
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
    });

    logger.info({ userId: user.id, organizationId, role }, 'New user registered');

    // Audit log
    auditService.log({
      action: 'AUTH_REGISTER',
      userId: user.id,
      organizationId,
      resource: 'User',
      resourceId: user.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { email: user.email, role },
    });

    // Create verification token and send verification email asynchronously
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.authToken.create({
      data: {
        token: verificationToken,
        type: 'EMAIL_VERIFICATION',
        userId: user.id,
        expiresAt: verificationExpiresAt,
      },
    });

    emailService
      .sendVerificationEmail(user.email, user.name, verificationToken)
      .catch((err) => logger.error({ err, userId: user.id }, 'Failed to dispatch verification email'));

    const accessToken = this.generateAccessToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });
    const refreshToken = await this.generateRefreshToken(user.id, context);

    return { user, accessToken, refreshToken };
  }

  async verifyEmail(token: string, context?: AuthContext) {
    const authToken = await prisma.authToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !authToken ||
      authToken.type !== 'EMAIL_VERIFICATION' ||
      authToken.usedAt !== null ||
      authToken.expiresAt < new Date()
    ) {
      throw new ValidationError('Invalid or expired verification token');
    }

    const now = new Date();

    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: authToken.userId },
        data: { emailVerifiedAt: now },
      }),
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: now },
      }),
    ]);

    logger.info({ userId: user.id }, 'User email verified successfully');

    auditService.log({
      action: 'AUTH_VERIFY_EMAIL',
      userId: user.id,
      organizationId: user.organizationId,
      resource: 'User',
      resourceId: user.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return user;
  }

  async resendVerification(email: string, context?: AuthContext): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Constant behavior / no user enumeration
    if (!user || user.emailVerifiedAt) {
      return;
    }

    // Invalidate previous unused verification tokens
    await prisma.authToken.updateMany({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.authToken.create({
      data: {
        token: verificationToken,
        type: 'EMAIL_VERIFICATION',
        userId: user.id,
        expiresAt,
      },
    });

    auditService.log({
      action: 'AUTH_RESEND_VERIFICATION',
      userId: user.id,
      organizationId: user.organizationId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    emailService
      .sendVerificationEmail(user.email, user.name, verificationToken)
      .catch((err) => logger.error({ err, userId: user.id }, 'Failed to resend verification email'));
  }

  async forgotPassword(email: string, context?: AuthContext): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Audit log attempt
    auditService.log({
      action: 'AUTH_PASSWORD_RESET_REQUEST',
      userId: user?.id,
      organizationId: user?.organizationId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { email },
    });

    // Constant timing / anti user enumeration
    if (!user) {
      return;
    }

    // Invalidate old password reset tokens
    await prisma.authToken.updateMany({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    await prisma.authToken.create({
      data: {
        token: resetToken,
        type: 'PASSWORD_RESET',
        userId: user.id,
        expiresAt,
      },
    });

    emailService
      .sendPasswordResetEmail(user.email, user.name, resetToken)
      .catch((err) => logger.error({ err, userId: user.id }, 'Failed to send password reset email'));
  }

  async resetPassword(input: ResetPasswordInput, context?: AuthContext): Promise<void> {
    const authToken = await prisma.authToken.findUnique({
      where: { token: input.token },
    });

    if (
      !authToken ||
      authToken.type !== 'PASSWORD_RESET' ||
      authToken.usedAt !== null ||
      authToken.expiresAt < new Date()
    ) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: authToken.userId },
        data: { passwordHash },
      }),
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: now },
      }),
      // Invalidate all refresh tokens to force re-login across all devices
      prisma.refreshToken.deleteMany({
        where: { userId: authToken.userId },
      }),
    ]);

    logger.info({ userId: authToken.userId }, 'Password reset successfully');

    auditService.log({
      action: 'AUTH_PASSWORD_RESET_SUCCESS',
      userId: authToken.userId,
      resource: 'User',
      resourceId: authToken.userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  async changePassword(userId: string, input: ChangePasswordInput, context?: AuthContext): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const isMatch = await bcrypt.compare(input.oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);

    logger.info({ userId }, 'Password changed successfully');

    auditService.log({
      action: 'AUTH_PASSWORD_CHANGED',
      userId,
      organizationId: user.organizationId,
      resource: 'User',
      resourceId: userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  async login(input: LoginInput, context?: AuthContext) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      auditService.log({
        action: 'AUTH_LOGIN_FAILURE',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { email: input.email, reason: 'user_not_found' },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === 'SUSPENDED') {
      auditService.log({
        action: 'AUTH_LOGIN_SUSPENDED',
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
      throw new ForbiddenError('Your account has been suspended');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      auditService.log({
        action: 'AUTH_LOGIN_FAILURE',
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: { email: input.email, reason: 'invalid_credentials' },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    logger.info({ userId: user.id }, 'User logged in');

    auditService.log({
      action: 'AUTH_LOGIN_SUCCESS',
      userId: user.id,
      organizationId: user.organizationId,
      resource: 'User',
      resourceId: user.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // Fire login alert email asynchronously
    emailService
      .sendLoginAlertEmail(user.email, user.name, context?.ipAddress, context?.userAgent)
      .catch((err) => logger.warn({ err, userId: user.id }, 'Failed to send login alert email'));

    const accessToken = this.generateAccessToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });
    const refreshToken = await this.generateRefreshToken(user.id, context);

    return { user, accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string, context?: AuthContext) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedError('Refresh token expired, please login again');
    }

    if (stored.user.status === 'SUSPENDED') {
      await prisma.refreshToken.deleteMany({ where: { userId: stored.user.id } });
      throw new ForbiddenError('Your account has been suspended');
    }

    // Update lastUsedAt
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        lastUsedAt: new Date(),
        ...(context?.userAgent ? { userAgent: context.userAgent } : {}),
        ...(context?.ipAddress ? { ipAddress: context.ipAddress } : {}),
      },
    });

    const accessToken = this.generateAccessToken({
      userId: stored.user.id,
      organizationId: stored.user.organizationId,
      role: stored.user.role,
    });

    return { accessToken };
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  async listSessions(userId: string, currentRefreshToken?: string): Promise<SessionItem[]> {
    const tokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
        token: true,
      },
    });

    return tokens.map((t) => ({
      id: t.id,
      userAgent: t.userAgent,
      ipAddress: t.ipAddress,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
      isCurrent: currentRefreshToken ? t.token === currentRefreshToken : false,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    await prisma.refreshToken.delete({ where: { id: sessionId } });
  }

  async revokeAllOtherSessions(userId: string, currentRefreshToken?: string): Promise<{ revokedCount: number }> {
    if (!currentRefreshToken) {
      throw new ValidationError('Current refresh token is required to preserve this session');
    }

    const { count } = await prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: { not: currentRefreshToken },
      },
    });

    return { revokedCount: count };
  }

  private generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  private async generateRefreshToken(userId: string, context?: AuthContext): Promise<string> {
    const token = crypto.randomBytes(40).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        userAgent: context?.userAgent ?? null,
        ipAddress: context?.ipAddress ?? null,
        lastUsedAt: new Date(),
        expiresAt,
      },
    });

    return token;
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  async findUserById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }
}

export const authService = new AuthService();