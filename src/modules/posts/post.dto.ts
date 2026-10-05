export interface PostResponseDTO {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  rejectionReason?: string | null;
  publishedAt: string | null;
  authorName: string;
  authorId: string;
  likeCount: number;
  tags?: { id: string; name: string }[];
  createdAt: string;
}
