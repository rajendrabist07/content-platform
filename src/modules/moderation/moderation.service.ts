import type { TrustLevel } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors/HttpError';
import { auditService } from '../audit/audit.service';
import { notificationService } from '../notifications/notification.service';
import { postService } from '../posts/post.service';
import { reportService } from '../reports/report.service';
import { toPostDTO } from '../posts/post.mapper';
import { toReportDTO } from '../reports/report.mapper';
import type { UpdateReportInput } from '../reports/report.validation';
import { logger } from '../../core/logger/logger';

export interface AuthContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export class ModerationService {
  async getModerationQueue(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [pendingPosts, pendingPostsTotal, openReports, openReportsTotal] = await Promise.all([
      prisma.post.findMany({
        where: { status: 'PENDING_REVIEW', deletedAt: null },
        orderBy: [{ createdAt: 'asc' }],
        skip,
        take: limit,
        include: {
          author: { select: { name: true } },
          tags: { include: { tag: true } },
          _count: { select: { likes: true } },
        },
      }),
      prisma.post.count({
        where: { status: 'PENDING_REVIEW', deletedAt: null },
      }),
      prisma.report.findMany({
        where: { status: 'OPEN' },
        orderBy: [{ createdAt: 'asc' }],
        skip,
        take: limit,
        include: {
          reporter: { select: { name: true } },
        },
      }),
      prisma.report.count({
        where: { status: 'OPEN' },
      }),
    ]);

    return {
      pendingPosts: {
        data: pendingPosts.map(toPostDTO),
        total: pendingPostsTotal,
      },
      openReports: {
        data: openReports.map(toReportDTO),
        total: openReportsTotal,
      },
    };
  }

  async approvePost(postId: string, adminId: string, context?: AuthContext) {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    if (post.status === 'PUBLISHED') {
      throw new ConflictError('Post is already published');
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'PUBLISHED',
        publishedAt: post.publishedAt || new Date(),
        rejectionReason: null,
      },
      include: {
        author: { select: { name: true } },
        tags: { include: { tag: true } },
        _count: { select: { likes: true } },
      },
    });

    // Notify author
    await notificationService.createNotification({
      userId: post.authorId,
      type: 'POST_PUBLISHED',
      title: 'Post Approved and Published',
      body: `Your post "${post.title}" has been reviewed and published.`,
      data: { postId: post.id, slug: post.slug },
    });

    // Check auto-promotion for author
    await postService.checkAndPromoteAuthor(post.authorId);

    logger.info({ postId, adminId }, 'Post approved by admin');

    auditService.log({
      action: 'ADMIN_POST_APPROVED',
      userId: adminId,
      organizationId: post.organizationId,
      resource: 'Post',
      resourceId: postId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { postId, authorId: post.authorId },
    });

    return updated;
  }

  async rejectPost(postId: string, adminId: string, reason: string, context?: AuthContext) {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
      include: {
        author: { select: { name: true } },
        tags: { include: { tag: true } },
        _count: { select: { likes: true } },
      },
    });

    // Notify author
    await notificationService.createNotification({
      userId: post.authorId,
      type: 'SYSTEM',
      title: 'Post Review Feedback',
      body: `Your post "${post.title}" was not approved for publication. Reason: ${reason}`,
      data: { postId: post.id, reason },
    });

    logger.info({ postId, adminId, reason }, 'Post rejected by admin');

    auditService.log({
      action: 'ADMIN_POST_REJECTED',
      userId: adminId,
      organizationId: post.organizationId,
      resource: 'Post',
      resourceId: postId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { postId, authorId: post.authorId, reason },
    });

    return updated;
  }

  async unpublishPost(postId: string, adminId: string, context?: AuthContext) {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'DRAFT',
      },
      include: {
        author: { select: { name: true } },
        tags: { include: { tag: true } },
        _count: { select: { likes: true } },
      },
    });

    logger.info({ postId, adminId }, 'Post unpublished by admin');

    auditService.log({
      action: 'ADMIN_POST_UNPUBLISHED',
      userId: adminId,
      organizationId: post.organizationId,
      resource: 'Post',
      resourceId: postId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { postId, authorId: post.authorId },
    });

    return updated;
  }

  async updateReport(reportId: string, adminId: string, input: UpdateReportInput, context?: AuthContext) {
    return reportService.resolveReport(reportId, adminId, input, context);
  }

  async suspendUser(userId: string, adminId: string, reason?: string, context?: AuthContext) {
    if (userId === adminId) {
      throw new ValidationError('You cannot suspend your own account');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundError('User');
    }

    // Set user status to SUSPENDED and revoke all active refresh tokens immediately
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);

    logger.info({ userId, adminId, reason }, 'User suspended and sessions revoked');

    auditService.log({
      action: 'ADMIN_USER_SUSPENDED',
      userId: adminId,
      organizationId: targetUser.organizationId,
      resource: 'User',
      resourceId: userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { suspendedUserId: userId, reason },
    });
  }

  async restoreUser(userId: string, adminId: string, context?: AuthContext) {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundError('User');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });

    logger.info({ userId, adminId }, 'User restored to ACTIVE');

    auditService.log({
      action: 'ADMIN_USER_RESTORED',
      userId: adminId,
      organizationId: targetUser.organizationId,
      resource: 'User',
      resourceId: userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { restoredUserId: userId },
    });
  }

  async setUserTrustLevel(userId: string, adminId: string, trustLevel: TrustLevel, context?: AuthContext) {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundError('User');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { trustLevel },
    });

    logger.info({ userId, adminId, previousTrust: targetUser.trustLevel, newTrust: trustLevel }, 'User trust level changed');

    auditService.log({
      action: 'ADMIN_USER_TRUST_LEVEL_SET',
      userId: adminId,
      organizationId: targetUser.organizationId,
      resource: 'User',
      resourceId: userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { previousLevel: targetUser.trustLevel, newLevel: trustLevel },
    });

    return updated;
  }
}

export const moderationService = new ModerationService();
