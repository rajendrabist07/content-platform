import type { PostStatus, TrustLevel } from '@prisma/client';
import crypto from 'crypto';
import { postRepository, type PublicPostFilters } from './post.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../../core/errors/HttpError';
import type { CreatePostInput, UpdatePostInput } from './post.validation';
import { logger } from '../../core/logger/logger';
import { env } from '../../config/env';
import { validateContentLinks, AUTO_PROMOTION_RULES } from '../../config/trust-policy';
import { prisma } from '../../lib/prisma';
import { auditService } from '../audit/audit.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export class PostService {
  async createPost(
    input: CreatePostInput,
    authorId: string,
    organizationId: string,
    authorTrustLevel: TrustLevel = 'NEW',
    isPrivileged: boolean = false
  ) {
    if (!isPrivileged) {
      validateContentLinks(input.content, authorTrustLevel);
    } else {
      validateContentLinks(input.content, 'TRUSTED');
    }

    let initialStatus: PostStatus = input.status;
    let publishedAt: Date | null = null;

    if (input.status === 'PUBLISHED') {
      initialStatus = 'PUBLISHED';
      publishedAt = new Date();
    }

    const slug = await this.generateUniqueSlug(organizationId, input.title);

    const post = await postRepository.create({
      title: input.title,
      slug,
      content: input.content,
      status: initialStatus,
      publishedAt,
      author: { connect: { id: authorId } },
      organization: { connect: { id: organizationId } },
      ...(input.tagIds && input.tagIds.length > 0
        ? {
            tags: {
              create: input.tagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            },
          }
        : {}),
    });

    logger.info({ postId: post.id, authorId, slug, status: initialStatus }, 'Post created successfully');
    return post;
  }

  async publishPost(
    postId: string,
    requestingUserId: string,
    requestingUserRole: string,
    authorTrustLevel: TrustLevel = 'NEW'
  ) {
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

    const targetStatus: PostStatus = 'PUBLISHED';
    const publishedAt: Date | null = new Date();

    const updated = await postRepository.update(postId, {
      status: targetStatus,
      publishedAt,
      rejectionReason: null,
    });

    logger.info({ postId, status: targetStatus }, 'Post publication status updated');
    return updated;
  }

  async getPosts(organizationId: string, rawPage?: number, rawLimit?: number, status?: PostStatus) {
    const page = this.sanitizePage(rawPage);
    const limit = this.sanitizeLimit(rawLimit);

    const { data, total } = await postRepository.findMany(organizationId, { page, limit }, status);
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

  async getPublicPosts(filters: PublicPostFilters, rawPage?: number, rawLimit?: number) {
    const page = this.sanitizePage(rawPage);
    const limit = this.sanitizeLimit(rawLimit);

    const { data, total } = await postRepository.findPublicMany(filters, { page, limit });
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

  async getPublicPostBySlug(slug: string) {
    const post = await postRepository.findPublicBySlug(slug);
    if (!post) {
      throw new NotFoundError('Post');
    }
    return post;
  }

  async getPublicSitemap() {
    const posts = await postRepository.findPublishedSitemap();
    return posts.map((p) => ({
      slug: p.slug,
      url: `${env.APP_URL}/posts/${p.slug}`,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      updatedAt: p.updatedAt.toISOString(),
    }));
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

  async updatePost(
    postId: string,
    requestingUserId: string,
    requestingUserRole: string,
    input: UpdatePostInput,
    userTrustLevel: TrustLevel = 'NEW'
  ) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    const isAuthor = post.authorId === requestingUserId;
    const isPrivileged = requestingUserRole === 'ADMIN' || requestingUserRole === 'OWNER';
    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenError('Only the author or an admin can update this post');
    }

    if (input.content !== undefined) {
      validateContentLinks(input.content, userTrustLevel);
    }

    const updateData: { title?: string; content?: string; slug?: string } = {};
    if (input.title !== undefined) {
      updateData.title = input.title;
      if (post.status === 'DRAFT') {
        updateData.slug = await this.generateUniqueSlug(post.organizationId, input.title);
      }
    }
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

  async checkAndPromoteAuthor(authorId: string): Promise<boolean> {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, trustLevel: true, createdAt: true, organizationId: true },
    });

    if (!author || author.trustLevel !== 'NEW') {
      return false;
    }

    const accountAgeMs = Date.now() - author.createdAt.getTime();
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

    const publishedPostsCount = await prisma.post.count({
      where: { authorId, status: 'PUBLISHED', deletedAt: null },
    });

    if (
      accountAgeDays >= AUTO_PROMOTION_RULES.NEW_TO_MEMBER.minAccountAgeDays &&
      publishedPostsCount >= AUTO_PROMOTION_RULES.NEW_TO_MEMBER.minApprovedPosts
    ) {
      await prisma.user.update({
        where: { id: authorId },
        data: { trustLevel: 'MEMBER' },
      });

      auditService.log({
        action: 'USER_TRUST_LEVEL_PROMOTED',
        userId: authorId,
        organizationId: author.organizationId,
        resource: 'User',
        resourceId: authorId,
        metadata: {
          previousLevel: 'NEW',
          newLevel: 'MEMBER',
          publishedPostsCount,
          accountAgeDays: Math.floor(accountAgeDays),
        },
      });

      logger.info({ userId: authorId }, 'User auto-promoted from NEW to MEMBER');
      return true;
    }

    return false;
  }

  async likePost(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    const likeCount = await postRepository.addLike(postId, userId);
    logger.info({ postId, userId, likeCount }, 'Post liked');
    return { liked: true, likeCount };
  }

  async unlikePost(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    const likeCount = await postRepository.removeLike(postId, userId);
    logger.info({ postId, userId, likeCount }, 'Post unliked');
    return { liked: false, likeCount };
  }

  async bookmarkPost(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    await postRepository.addBookmark(postId, userId);
    logger.info({ postId, userId }, 'Post bookmarked');
    return { bookmarked: true };
  }

  async unbookmarkPost(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post');
    }

    await postRepository.removeBookmark(postId, userId);
    logger.info({ postId, userId }, 'Post unbookmarked');
    return { bookmarked: false };
  }

  async getBookmarks(userId: string, rawPage?: number, rawLimit?: number) {
    const page = this.sanitizePage(rawPage);
    const limit = this.sanitizeLimit(rawLimit);

    const { data, total } = await postRepository.findBookmarks(userId, { page, limit });
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

  private async generateUniqueSlug(organizationId: string, title: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    const existing = await postRepository.findBySlug(organizationId, baseSlug);
    if (!existing) {
      return baseSlug;
    }

    return `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
  }
}

export const postService = new PostService();