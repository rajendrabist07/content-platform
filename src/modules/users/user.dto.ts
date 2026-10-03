export interface UserProfileDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  emailNotifications: boolean;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}
