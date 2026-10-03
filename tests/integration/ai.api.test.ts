import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { aiService } from '../../src/modules/ai/ai.service';
import { ServiceUnavailableError } from '../../src/core/errors/HttpError';

const app = createApp();

describe('AI API - Integration', () => {
    const testOrgId = 'test-org-ai-integration';
    let userToken: string;

    beforeAll(async () => {
        await prisma.organization.upsert({
            where: { id: testOrgId },
            update: {},
            create: { id: testOrgId, name: 'AI Test Org', slug: 'ai-test-org' },
        });
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.organization.delete({ where: { id: testOrgId } });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });

        const user = await request(app).post('/api/v1/auth/register').send({
            email: 'aitester@example.com',
            password: 'password123',
            name: 'AI Tester',
            organizationId: testOrgId,
        });
        userToken = user.body.data.accessToken;
    });

    describe('POST /api/v1/ai/suggest', () => {
        it('should reject request without authentication token', async () => {
            const response = await request(app)
                .post('/api/v1/ai/suggest')
                .send({ content: 'This is a test post content with sufficient length.' });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should reject request when content is less than 20 characters', async () => {
            const response = await request(app)
                .post('/api/v1/ai/suggest')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ content: 'Too short' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Content must be at least 20 characters');
        });

        it('should return AI suggestions when authenticated with valid content', async () => {
            const mockSuggestions = {
                title: 'Building Scalable APIs with Clean Architecture',
                tags: ['nodejs', 'clean-architecture', 'typescript'],
                summary: 'An architectural pattern overview for building scalable enterprise APIs.',
            };

            const generateSpy = vi
                .spyOn(aiService, 'generateSuggestions')
                .mockResolvedValueOnce(mockSuggestions);

            const response = await request(app)
                .post('/api/v1/ai/suggest')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    content: 'Clean architecture decouples software elements from external dependencies and UI frameworks.',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockSuggestions);

            generateSpy.mockRestore();
        });

        it('should return 503 when AI service is unavailable', async () => {
            const generateSpy = vi
                .spyOn(aiService, 'generateSuggestions')
                .mockRejectedValueOnce(
                    new ServiceUnavailableError('AI suggestion service is temporarily unavailable')
                );

            const response = await request(app)
                .post('/api/v1/ai/suggest')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    content: 'This request will simulate an upstream Anthropic API failure in integration test.',
                });

            expect(response.status).toBe(503);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('AI suggestion service is temporarily unavailable');

            generateSpy.mockRestore();
        });
    });

    describe('POST /api/v1/ai/improve', () => {
        it('should reject unauthenticated request', async () => {
            const response = await request(app)
                .post('/api/v1/ai/improve')
                .send({ content: 'Some valid content with sufficient length to pass body validation.' });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should return improved content when authenticated', async () => {
            const mockImprovement = {
                improvedContent: '# Scalable Node.js Architecture\n\nClean architecture is great.',
                critique: 'Added structured headings and improved prose clarity.',
                changes: ['Fixed grammar', 'Added headings'],
                readabilityScore: 85,
                readingTimeMinutes: 2,
            };

            const improveSpy = vi
                .spyOn(aiService, 'improveContent')
                .mockResolvedValueOnce(mockImprovement);

            const response = await request(app)
                .post('/api/v1/ai/improve')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    content: 'Clean architecture decouples software elements from external dependencies.',
                    tone: 'technical',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockImprovement);

            improveSpy.mockRestore();
        });
    });

    describe('POST /api/v1/ai/outline', () => {
        it('should reject unauthenticated request', async () => {
            const response = await request(app)
                .post('/api/v1/ai/outline')
                .send({ topic: 'Database Indexing in PostgreSQL' });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should return generated outline when authenticated', async () => {
            const mockOutline = {
                title: 'Mastering PostgreSQL Indexes',
                targetAudience: 'Backend Engineers',
                estimatedTotalWords: 1500,
                sections: [
                    { heading: 'Introduction', keyPoints: ['Why indexes matter', 'B-Tree vs Hash'], estimatedWordCount: 300 },
                    { heading: 'Performance Tuning', keyPoints: ['EXPLAIN ANALYZE', 'Partial indexes'], estimatedWordCount: 600 },
                ],
            };

            const outlineSpy = vi
                .spyOn(aiService, 'generateOutline')
                .mockResolvedValueOnce(mockOutline);

            const response = await request(app)
                .post('/api/v1/ai/outline')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    topic: 'Database Indexing in PostgreSQL',
                    targetAudience: 'Backend Engineers',
                    depth: 'in-depth',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockOutline);

            outlineSpy.mockRestore();
        });

    });
});

