import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleReadinessCheck } from '../../src/app/api/v1/health/route';
import { prisma } from '../../src/lib/prisma';
import type { Request, Response } from 'express';

describe('Readiness Probe (handleReadinessCheck) - Unit Tests', () => {
    let mockReq: any;
    let mockRes: any;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ json: jsonMock });

        mockReq = {
            log: {
                error: vi.fn(),
                warn: vi.fn(),
                info: vi.fn(),
            },
        };

        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
    });

    it('should return 200 and latestMigration when database and all migrations are healthy', async () => {
        const queryRawSpy = vi.spyOn(prisma, '$queryRaw');

        queryRawSpy
            .mockResolvedValueOnce([{ '?column?': 1 }] as any)
            .mockResolvedValueOnce([] as any) // no failed migrations
            .mockResolvedValueOnce([{ migration_name: '20261003140533_add_audit_logs', finished_at: new Date(), rolled_back_at: null }] as any);

        await handleReadinessCheck(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'ready',
                database: expect.objectContaining({
                    status: 'connected',
                    latestMigration: '20261003140533_add_audit_logs',
                }),
            })
        );
    });

    it('should return 503 when a migration is failed (finished_at IS NULL)', async () => {
        const queryRawSpy = vi.spyOn(prisma, '$queryRaw');

        queryRawSpy
            .mockResolvedValueOnce([{ '?column?': 1 }] as any)
            .mockResolvedValueOnce([
                { migration_name: '20261003140533_add_audit_logs', finished_at: null, rolled_back_at: null },
            ] as any);

        await handleReadinessCheck(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'unhealthy',
                database: expect.objectContaining({
                    status: 'migration_failed',
                    failedMigration: '20261003140533_add_audit_logs',
                }),
            })
        );
    });

    it('should return 503 when a migration was rolled back', async () => {
        const queryRawSpy = vi.spyOn(prisma, '$queryRaw');

        queryRawSpy
            .mockResolvedValueOnce([{ '?column?': 1 }] as any)
            .mockResolvedValueOnce([
                { migration_name: '20261003135851_add_likes_and_bookmarks', finished_at: new Date(), rolled_back_at: new Date() },
            ] as any);

        await handleReadinessCheck(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'unhealthy',
                database: expect.objectContaining({
                    status: 'migration_failed',
                    failedMigration: '20261003135851_add_likes_and_bookmarks',
                }),
            })
        );
    });

    it('should return 503 when _prisma_migrations table does not exist', async () => {
        const queryRawSpy = vi.spyOn(prisma, '$queryRaw');

        queryRawSpy
            .mockResolvedValueOnce([{ '?column?': 1 }] as any)
            .mockRejectedValueOnce(new Error('relation "_prisma_migrations" does not exist'));

        await handleReadinessCheck(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'unhealthy',
                database: {
                    status: 'disconnected',
                },
            })
        );
    });

    it('should return 503 when database is completely unreachable', async () => {
        const queryRawSpy = vi.spyOn(prisma, '$queryRaw');

        queryRawSpy.mockRejectedValueOnce(new Error('Connection refused'));

        await handleReadinessCheck(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'unhealthy',
                database: {
                    status: 'disconnected',
                },
            })
        );
    });
});
