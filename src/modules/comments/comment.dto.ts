export interface CommentResponseDTO {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  replies?: CommentResponseDTO[];
}