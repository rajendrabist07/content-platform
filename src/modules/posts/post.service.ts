import { postRepository } from './post.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../core/errors/HttpError';
import { CreatePostInput } from './post.validation';
import { logger } from '../../core/logger/logger';

export class PostService {
  async createPost(input: CreatePostInput, authorId: string, organizationId: string) {

    const slug = this.generateSlug(input.title);


    const existing = await postRepository.findBySlug(organizationId, slug);
    if (existing) {
      throw new ConflictError(`A post with slug "${slug}" already exists in this organization`);
    }


    const post = await postRepository.create({
      title: input.title,
      slug,
      content: input.content,
      status: input.status,
      author: { connect: { id: authorId } },
      organization: { connect: { id: organizationId } },
    });

    logger.info({ postId: post.id, authorId }, 'Post created successfully');
    return post;
  }

  async publishPost(postId: string, requestingUserId: string) {
    const post = await postRepository.findById(postId);


    if (!post) {
      throw new NotFoundError('Post');
    }


    if (post.authorId !== requestingUserId) {
      throw new ForbiddenError('Only the author can publish this post');
    }


    if (post.status === 'PUBLISHED') {
      throw new ConflictError('Post is already published');
    }

    const updated = await postRepository.update(postId, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    logger.info({ postId }, 'Post published');
    return updated;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')  
      .replace(/\s+/g, '-');     
  }
}

export const postService = new PostService();