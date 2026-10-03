import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../core/errors/HttpError';
import { logger } from '../../core/logger/logger';
import type { UpdateProfileInput } from './user.validation';

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const userData: { name?: string; emailNotifications?: boolean } = {};
    if (input.name !== undefined) userData.name = input.name;
    if (input.emailNotifications !== undefined) userData.emailNotifications = input.emailNotifications;

    const profileData: { bio?: string | null; avatarUrl?: string | null } = {};
    if (input.bio !== undefined) profileData.bio = input.bio;
    if (input.avatarUrl !== undefined) profileData.avatarUrl = input.avatarUrl || null;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...userData,
        profile: {
          upsert: {
            create: {
              bio: profileData.bio ?? null,
              avatarUrl: profileData.avatarUrl ?? null,
            },
            update: profileData,
          },
        },
      },
      include: { profile: true },
    });

    logger.info({ userId }, 'User profile updated');
    return updatedUser;
  }
}

export const userService = new UserService();
