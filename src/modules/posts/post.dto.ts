export interface PostResponseDTO {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  publishedAt: string | null;
  authorId: string;
  createdAt: string;
}