import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from '../../core/errors/HttpError';
import { logger } from '../../core/logger/logger';
import { emailService } from '../email/email.service';
import type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from './auth.validation';

const SALT_ROUNDS = 10;

interface JwtPayload {
  userId: string;
  organizationId: string;
  role: string;
}

class AuthService {
  async register(input: RegisterInput) {
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
        emailVerifiedAt: null,
      },
    });

    logger.info({ userId: user.id, organizationId, role }, 'New user registered');

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
    const refreshToken = await this.generateRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }

  async verifyEmail(token: string) {
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
    return user;
  }

  async resendVerification(email: string): Promise<void> {
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

    emailService
      .sendVerificationEmail(user.email, user.name, verificationToken)
      .catch((err) => logger.error({ err, userId: user.id }, 'Failed to resend verification email'));
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
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

  async resetPassword(input: ResetPasswordInput): Promise<void> {
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
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
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
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    logger.info({ userId: user.id }, 'User logged in');

    const accessToken = this.generateAccessToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });
    const refreshToken = await this.generateRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string) {
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

  private generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(40).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  async findUserById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }
}

export const authService = new AuthService();