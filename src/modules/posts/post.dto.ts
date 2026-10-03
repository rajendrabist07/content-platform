export interface PostResponseDTO {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  publishedAt: string | null;
  authorName: string;
  authorId: string;
  createdAt: string;
}

