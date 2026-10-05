import type { TrustLevel, UserStatus } from '@prisma/client';
import type { UserResponseDTO } from './auth.dto';

export function toUserDTO(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  trustLevel?: TrustLevel;
  status?: UserStatus;
  emailVerifiedAt?: Date | null;
}): UserResponseDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    trustLevel: user.trustLevel ?? 'NEW',
    status: user.status ?? 'ACTIVE',
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}
