import { env } from '../../config/env';
import { logger } from '../../core/logger/logger';
import { ServiceUnavailableError } from '../../core/errors/HttpError';

export const GEMINI_TIMEOUT_MS = 15000;

export interface GeminiGenerateOptions {
  systemInstruction?: string;
  userPrompt: string;
}

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
  finishReason?: string;
}

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export async function generateJson(options: GeminiGenerateOptions): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const bodyPayload: Record<string, unknown> = {
      contents: [
        {
          parts: [{ text: options.userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    if (options.systemInstruction) {
      bodyPayload.systemInstruction = {
        parts: [{ text: options.systemInstruction }],
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unable to read error body');
      logger.error({ status: response.status, errorBody }, 'Gemini API returned error response');
      throw new ServiceUnavailableError('AI suggestion service is temporarily unavailable');
    }

    const data = (await response.json()) as GeminiResponse;

    if (data.usageMetadata) {
      logger.info(
        {
          model,
          promptTokens: data.usageMetadata.promptTokenCount,
          candidateTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        },
        'Gemini generation completed'
      );
    }

    const firstCandidate = data.candidates?.[0];
    if (!firstCandidate) {
      logger.error({ data }, 'Gemini API returned no candidates');
      throw new ServiceUnavailableError('AI suggestion service is temporarily unavailable');
    }

    if (firstCandidate.finishReason && firstCandidate.finishReason !== 'STOP') {
      logger.warn(
        { finishReason: firstCandidate.finishReason },
        'Gemini candidate finished with non-STOP reason'
      );
      if (firstCandidate.finishReason === 'SAFETY' || firstCandidate.finishReason === 'BLOCKED') {
        throw new ServiceUnavailableError('AI suggestion service is temporarily unavailable');
      }
    }

    const text = firstCandidate.content?.parts?.[0]?.text?.trim();
    if (!text) {
      logger.error({ firstCandidate }, 'Gemini candidate contains empty text part');
      throw new ServiceUnavailableError('AI suggestion service is temporarily unavailable');
    }

    return text;
  } catch (err: unknown) {
    if (err instanceof ServiceUnavailableError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      logger.error({ timeoutMs: GEMINI_TIMEOUT_MS }, 'Gemini API request timed out');
      throw new ServiceUnavailableError('AI suggestion service is temporarily unavailable');
    }
    logger.error({ err }, 'Unexpected error calling Gemini API');
    throw new ServiceUnavailableError('AI suggestion service is temporarily unavailable');
  } finally {
    clearTimeout(timeoutId);
  }
}
