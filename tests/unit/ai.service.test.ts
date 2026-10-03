import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiService } from '../../src/modules/ai/ai.service';
import { ServiceUnavailableError } from '../../src/core/errors/HttpError';

describe('AiService - generateSuggestions (Gemini)', () => {
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
                },
            ],
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
    });

    it('should handle markdown fenced JSON returned by LLM', async () => {
        const mockResponseData = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: '```json\n{\n  "title": "Fenced Title",\n  "tags": ["tag1", "tag2"],\n  "summary": "Fenced summary."\n}\n```',
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

        const result = await aiService.generateSuggestions({
            content: 'This is another sufficiently long post content for testing markdown fenced json removal.',
        });

        expect(result).toEqual({
            title: 'Fenced Title',
            tags: ['tag1', 'tag2'],
            summary: 'Fenced summary.',
        });
    });

    it('should throw ServiceUnavailableError when Gemini API returns non-200', async () => {
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

    it('should throw ServiceUnavailableError when LLM returns non-JSON or malformed schema', async () => {
        const mockResponseData = {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: 'Sorry, I cannot help with that.',
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
                content: 'This is a test content that will receive invalid non-JSON output.',
            })
        ).rejects.toThrow(ServiceUnavailableError);
    });

    it('should throw ServiceUnavailableError on network error / fetch rejection', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));

        await expect(
            aiService.generateSuggestions({
                content: 'This is a test content that will encounter a network error.',
            })
        ).rejects.toThrow(ServiceUnavailableError);
    });
});
