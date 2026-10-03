import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiService } from '../../src/modules/ai/ai.service';
import { ServiceUnavailableError } from '../../src/core/errors/HttpError';

describe('AiService - generateSuggestions (Gemini Hardened Client)', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

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

    it('should throw ServiceUnavailableError when LLM returns non-JSON text', async () => {
        const mockResponseData = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: 'Sorry, I cannot process this content as structured JSON.',
                            },
                        ],
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
                content: 'This is a test content that receives plain text output.',
            })
        ).rejects.toThrow(ServiceUnavailableError);
    });

    it('should throw ServiceUnavailableError when JSON has wrong shape (title > 70 chars)', async () => {
        const mockResponseData = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    title: 'A'.repeat(85), // Exceeds 70 character limit
                                    tags: ['tag1', 'tag2', 'tag3'],
                                    summary: 'Valid summary here.',
                                }),
                            },
                        ],
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
                content: 'This is a test content string testing schema validation on oversized title.',
            })
        ).rejects.toThrow(ServiceUnavailableError);
    });

    it('should throw ServiceUnavailableError when JSON has fewer than 3 unique tags', async () => {
        const mockResponseData = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    title: 'Valid Short Title',
                                    tags: ['tag1', 'TAG1'], // Deduplicates to 1 tag, less than 3
                                    summary: 'Valid summary here.',
                                }),
                            },
                        ],
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
                content: 'This is a test content string testing tag length constraint.',
            })
        ).rejects.toThrow(ServiceUnavailableError);
    });

    it('should throw ServiceUnavailableError on fetch network timeout / AbortError', async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        global.fetch = vi.fn().mockRejectedValue(abortError);

        await expect(
            aiService.generateSuggestions({
                content: 'This is a test content that times out on outbound fetch.',
            })
        ).rejects.toThrow(ServiceUnavailableError);
    });
});
