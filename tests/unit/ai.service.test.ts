import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiService } from '../../src/modules/ai/ai.service';
import { ServiceUnavailableError } from '../../src/core/errors/HttpError';

describe('AiService - (Gemini Hardened Client)', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe('generateSuggestions', () => {
        it('should successfully parse and return AI suggestions from Gemini response', async () => {
            const mockResponseData = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: JSON.stringify({
                                        title: 'Mastering TypeScript Clean Architecture',
                                        tags: ['TypeScript', 'Backend', 'Architecture'],
                                        summary: 'A deep dive into clean architecture with TypeScript and Express.',
                                    }),
                                },
                            ],
                        },
                        finishReason: 'STOP',
                    },
                ],
                usageMetadata: {
                    promptTokenCount: 50,
                    candidatesTokenCount: 30,
                    totalTokenCount: 80,
                },
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponseData,
            } as unknown as Response);

            const result = await aiService.generateSuggestions({
                content: 'This is a sufficiently long post content about clean architecture in TypeScript backend development.',
            });

            expect(result).toEqual({
                title: 'Mastering TypeScript Clean Architecture',
                tags: ['typescript', 'backend', 'architecture'],
                summary: 'A deep dive into clean architecture with TypeScript and Express.',
            });
            expect(global.fetch).toHaveBeenCalledTimes(1);

            const fetchCall = vi.mocked(global.fetch).mock.calls[0];
            const headers = (fetchCall?.[1]?.headers ?? {}) as Record<string, string>;
            expect(headers['x-goog-api-key']).toBeDefined();
        });

        it('should normalize and deduplicate tags in model response', async () => {
            const mockResponseData = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: JSON.stringify({
                                        title: 'Tags Normalization Test',
                                        tags: [' TypeScript ', 'TYPESCRIPT', 'backend ', 'NodeJS', 'API'],
                                        summary: 'Testing tag normalization and deduplication behavior.',
                                    }),
                                },
                            ],
                        },
                        finishReason: 'STOP',
                    },
                ],
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponseData,
            } as unknown as Response);

            const result = await aiService.generateSuggestions({
                content: 'This is a test content string to check tag normalization and deduplication.',
            });

            expect(result.tags).toEqual(['typescript', 'backend', 'nodejs', 'api']);
        });

        it('should handle markdown fenced JSON returned by LLM', async () => {
            const mockResponseData = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: '```json\n{\n  "title": "Fenced Title",\n  "tags": ["tag1", "tag2", "tag3"],\n  "summary": "Fenced summary text."\n}\n```',
                                },
                            ],
                        },
                        finishReason: 'STOP',
                    },
                ],
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponseData,
            } as unknown as Response);

            const result = await aiService.generateSuggestions({
                content: 'This is another sufficiently long post content for testing markdown fenced json removal.',
            });

            expect(result).toEqual({
                title: 'Fenced Title',
                tags: ['tag1', 'tag2', 'tag3'],
                summary: 'Fenced summary text.',
            });
        });

        it('should throw ServiceUnavailableError when Gemini API returns 429 rate limit', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                text: async () => 'Quota exceeded',
            } as unknown as Response);

            await expect(
                aiService.generateSuggestions({
                    content: 'This is a test content that should trigger an upstream rate limit failure.',
                })
            ).rejects.toThrow(ServiceUnavailableError);
        });

        it('should throw ServiceUnavailableError when Gemini API returns 500 internal error', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            } as unknown as Response);

            await expect(
                aiService.generateSuggestions({
                    content: 'This is a test content that should trigger an upstream failure.',
                })
            ).rejects.toThrow(ServiceUnavailableError);
        });

        it('should throw ServiceUnavailableError when candidate is blocked due to safety', async () => {
            const mockResponseData = {
                candidates: [
                    {
                        finishReason: 'SAFETY',
                        content: {
                            parts: [],
                        },
                    },
                ],
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponseData,
            } as unknown as Response);

            await expect(
                aiService.generateSuggestions({
                    content: 'This content triggers safety policy on upstream provider.',
                })
            ).rejects.toThrow(ServiceUnavailableError);
        });
    });

    describe('improveContent', () => {
        it('should successfully improve content and return changes list', async () => {
            const mockImproveData = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: JSON.stringify({
                                        improvedContent: 'Clean architecture establishes maintainable systems with decoupling.',
                                        changes: ['Enhanced clarity and flow', 'Adopted professional tone'],
                                        readingTimeMinutes: 1,
                                    }),
                                },
                            ],
                        },
                        finishReason: 'STOP',
                    },
                ],
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockImproveData,
            } as unknown as Response);

            const result = await aiService.improveContent({
                content: 'Clean architecture makes stuff good and testable and separated.',
                tone: 'professional',
            });

            expect(result.improvedContent).toBe('Clean architecture establishes maintainable systems with decoupling.');
            expect(result.changes.length).toBe(2);
            expect(result.readingTimeMinutes).toBe(1);
        });
    });

    describe('generateOutline', () => {
        it('should successfully generate structured article outline', async () => {
            const mockOutlineData = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: JSON.stringify({
                                        title: 'Mastering Microservices with Node.js',
                                        targetAudience: 'Senior backend engineers',
                                        sections: [
                                            {
                                                heading: '1. Service Boundaries',
                                                keyPoints: ['Domain Driven Design', 'Context mapping'],
                                            },
                                            {
                                                heading: '2. Asynchronous Messaging',
                                                keyPoints: ['Message brokers', 'Idempotency'],
                                            },
                                        ],
                                    }),
                                },
                            ],
                        },
                        finishReason: 'STOP',
                    },
                ],
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockOutlineData,
            } as unknown as Response);

            const result = await aiService.generateOutline({
                topic: 'Mastering Microservices with Node.js',
                sectionsCount: 2,
            });

            expect(result.title).toBe('Mastering Microservices with Node.js');
            expect(result.sections.length).toBe(2);
            expect(result.sections[0]?.heading).toBe('1. Service Boundaries');
        });
    });
});
