import { env } from '../../config/env';
import { logger } from '../../core/logger/logger';
import { ServiceUnavailableError } from '../../core/errors/HttpError';
import type { AiSuggestionResponseDTO } from './ai.dto';
import type { SuggestContentInput } from './ai.validation';

export class AiService {
  async generateSuggestions(input: SuggestContentInput): Promise<AiSuggestionResponseDTO> {
    try {
      const systemInstruction = `You are an AI assistant for a publishing and content platform.
Given user-provided content, generate:
1. A concise, compelling title (under 70 characters).
2. 3 to 5 relevant tags (lowercase, single words or short phrases).
3. A concise one-sentence summary.

You must respond ONLY with a raw, valid JSON object matching this exact shape:
{
  "title": "...",
  "tags": ["..."],
  "summary": "..."
}

Do not include any markdown formatting (no \`\`\` or \`\`\`json), no explanations, and no surrounding text.`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              parts: [{ text: input.content }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read error body');
        logger.error({ status: response.status, errorBody }, 'Gemini API returned error response');
        throw new ServiceUnavailableError('AI suggestion service is temporarily unavailable');
      }

      const rawJson = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const text = rawJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        logger.error({ rawJson }, 'Gemini API response contained no text candidate');
        throw new ServiceUnavailableError('AI suggestion service is temporarily unavailable');
      }

      const sanitizedText = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      const parsed = JSON.parse(sanitizedText);

      if (
        typeof parsed.title !== 'string' ||
        !Array.isArray(parsed.tags) ||
        typeof parsed.summary !== 'string' ||
        parsed.tags.length === 0
      ) {
        logger.error({ parsed }, 'AI response format validation failed');
        throw new ServiceUnavailableError('AI suggestion service is temporarily unavailable');
      }

      const result: AiSuggestionResponseDTO = {
        title: parsed.title.trim(),
        tags: parsed.tags.map((t: unknown) => String(t).toLowerCase().trim()).filter(Boolean),
        summary: parsed.summary.trim(),
      };

      logger.info('AI suggestions successfully generated');
      return result;
    } catch (err) {
      if (err instanceof ServiceUnavailableError) {
        throw err;
      }
      logger.error({ err }, 'Error during AI suggestions generation');
      throw new ServiceUnavailableError('AI suggestion service is temporarily unavailable');
    }
  }
}

export const aiService = new AiService();
