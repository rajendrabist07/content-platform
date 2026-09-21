import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../core/errors/HttpError';
import { logger } from '../../core/logger/logger';
import type { RegisterInput, LoginInput } from './auth.validation';

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

    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        organizationId: input.organizationId,
      },
    });

    logger.info({ userId: user.id }, 'New user registered');

    const accessToken = this.generateAccessToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });
    const refreshToken = await this.generateRefreshToken(user.id);

    return { user, accessToken, refreshToken };
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
}

export const authService = new AuthService();