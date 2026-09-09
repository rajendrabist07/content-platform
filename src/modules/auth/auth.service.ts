import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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


    const token = this.generateToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });

    return { user, token };
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

    const token = this.generateToken({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });

    return { user, token };
  }

  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
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