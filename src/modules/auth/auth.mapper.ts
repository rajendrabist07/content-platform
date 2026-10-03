import type { UserResponseDTO } from './auth.dto';

export function toUserDTO(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerifiedAt?: Date | null;
}): UserResponseDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}
