import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postService } from '../../src/modules/posts/post.service';
import { postRepository } from '../../src/modules/posts/post.repository';



vi.mock('../../src/modules/posts/post.repository', () => ({
    postRepository: {
        findMany: vi.fn(),
        findById: vi.fn(),
        findBySlug: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        softDelete: vi.fn(),
    },
}));

describe('PostService - getPosts (pagination sanitization)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should default to page 1 when no page is provided', async () => {

        vi.mocked(postRepository.findMany).mockResolvedValue({
            data: [],
            total: 0,
        });


        await postService.getPosts('org-123', undefined, undefined);


        expect(postRepository.findMany).toHaveBeenCalledWith('org-123', {
            page: 1,
            limit: 10,
        });
    });

    it('should reject negative page numbers and default to 1', async () => {
        vi.mocked(postRepository.findMany).mockResolvedValue({ data: [], total: 0 });

        await postService.getPosts('org-123', -5, undefined);

        expect(postRepository.findMany).toHaveBeenCalledWith('org-123', {
            page: 1,
            limit: 10,
        });
    });

    it('should cap limit at MAX_LIMIT (100) even if client requests more', async () => {
        vi.mocked(postRepository.findMany).mockResolvedValue({ data: [], total: 0 });

        await postService.getPosts('org-123', 1, 99999);

        expect(postRepository.findMany).toHaveBeenCalledWith('org-123', {
            page: 1,
            limit: 100,
        });
    });

    it('should calculate totalPages correctly', async () => {
        vi.mocked(postRepository.findMany).mockResolvedValue({
            data: [],
            total: 25,
        });

        const result = await postService.getPosts('org-123', 1, 10);

        expect(result.pagination.totalPages).toBe(3);
    });
});


describe('PostService - publishPost (authorization)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw ForbiddenError when a non-author tries to publish', async () => {

        vi.mocked(postRepository.findById).mockResolvedValue({
            id: 'post-1',
            authorId: 'user-A',
            status: 'DRAFT',

        } as any);


        await expect(
            postService.publishPost('post-1', 'user-B', 'MEMBER')
        ).rejects.toThrow('Only the author or an admin can publish this post');
    });

    it('should succeed when the author publishes their own post', async () => {
        vi.mocked(postRepository.findById).mockResolvedValue({
            id: 'post-1',
            authorId: 'user-A',
            status: 'DRAFT',
        } as any);

        vi.mocked(postRepository.update).mockResolvedValue({
            id: 'post-1',
            authorId: 'user-A',
            status: 'PUBLISHED',
        } as any);

        const result = await postService.publishPost('post-1', 'user-A', 'MEMBER');

        expect(result.status).toBe('PUBLISHED');
    });

    it('should throw ConflictError when post is already published', async () => {
        vi.mocked(postRepository.findById).mockResolvedValue({
            id: 'post-1',
            authorId: 'user-A',
            status: 'PUBLISHED',
        } as any);

        await expect(
            postService.publishPost('post-1', 'user-A', 'MEMBER')
        ).rejects.toThrow('Post is already published');
    });
});