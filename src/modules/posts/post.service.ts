import { postRepository } from './post.repository';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '../../core/errors/HttpError';
import type { CreatePostInput, UpdatePostInput } from './post.validation';
import { logger } from '../../core/logger/logger';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

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

  async publishPost(postId: string, requestingUserId: string, requestingUserRole: string) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    const isAuthor = post.authorId === requestingUserId;
    const isPrivileged = requestingUserRole === 'ADMIN' || requestingUserRole === 'OWNER';
    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenError('Only the author or an admin can publish this post');
    }

    if (post.status === 'PUBLISHED') {
      throw new ConflictError('Post is already published');
    }

    const updated = await postRepository.update(postId, { status: 'PUBLISHED', publishedAt: new Date() });
    logger.info({ postId }, 'Post published');
    return updated;
  }

  async getPosts(organizationId: string, rawPage?: number, rawLimit?: number) {
    const page = this.sanitizePage(rawPage);
    const limit = this.sanitizeLimit(rawLimit);

    const { data, total } = await postRepository.findMany(organizationId, { page, limit });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getPostById(postId: string, organizationId: string) {
    const post = await postRepository.findById(postId);

    if (!post) {
      throw new NotFoundError('Post');
    }


    if (post.organizationId !== organizationId) {
      throw new NotFoundError('Post');
    }

    return post;
  }

  async updatePost(postId: string, requestingUserId: string, requestingUserRole: string, input: UpdatePostInput) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    const isAuthor = post.authorId === requestingUserId;
    const isPrivileged = requestingUserRole === 'ADMIN' || requestingUserRole === 'OWNER';
    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenError('Only the author or an admin can update this post');
    }

    const updateData: { title?: string; content?: string } = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;

    const updated = await postRepository.update(postId, updateData);
    logger.info({ postId }, 'Post updated');
    return updated;
  }

  async deletePost(postId: string, requestingUserId: string, requestingUserRole: string) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    const isAuthor = post.authorId === requestingUserId;
    const isPrivileged = requestingUserRole === 'ADMIN' || requestingUserRole === 'OWNER';
    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenError('Only the author or an admin can delete this post');
    }

    await postRepository.softDelete(postId);
    logger.info({ postId, deletedBy: requestingUserId }, 'Post deleted');
  }

  private sanitizePage(rawPage?: number): number {
    if (!rawPage || !Number.isInteger(rawPage) || rawPage < 1) {
      return DEFAULT_PAGE;
    }
    return rawPage;
  }

  private sanitizeLimit(rawLimit?: number): number {
    if (!rawLimit || !Number.isInteger(rawLimit) || rawLimit < 1) {
      return DEFAULT_LIMIT;
    }
    if (rawLimit > MAX_LIMIT) {
      return MAX_LIMIT;
    }
    return rawLimit;
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