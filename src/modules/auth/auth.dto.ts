import type { TrustLevel, UserStatus } from '@prisma/client';

export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  trustLevel: TrustLevel;
  status: UserStatus;
  emailVerified: boolean;
}

export interface AuthResponseDTO {
  user: UserResponseDTO;
  accessToken: string;
  refreshToken: string;
}
