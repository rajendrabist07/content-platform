import type { User, Profile } from '@prisma/client';
import type { UserProfileDTO } from './user.dto';

export type UserWithProfile = User & {
  profile?: Profile | null;
};

export function toUserProfileDTO(user: UserWithProfile): UserProfileDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    emailNotifications: user.emailNotifications,
    bio: user.profile?.bio ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
