import {
  suggestContentSchema,
  improveContentSchema,
  outlineContentSchema,
} from '../../modules/ai/ai.validation';
import { body, envelope, commonErrors } from '../helpers';

export const aiSchemas = {
  AiSuggestion: {
    type: 'object',
    properties: {
      title: { type: 'string', example: 'Getting Started with Clean Architecture in TypeScript' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        example: ['typescript', 'clean-architecture', 'backend'],
      },
      summary: {
        type: 'string',
        example:
          'A comprehensive guide to structuring scalable Node.js and TypeScript backends using Clean Architecture principles.',
      },
    },
    required: ['title', 'tags', 'summary'],
  },
  AiImprovement: {
    type: 'object',
    properties: {
      improvedContent: { type: 'string', example: 'Clean architecture establishes scalable and testable applications...' },
      changes: {
        type: 'array',
        items: { type: 'string' },
        example: ['Enhanced clarity and eliminated redundant wording', 'Adapted professional tone'],
      },
      readingTimeMinutes: { type: 'integer', example: 2 },
    },
    required: ['improvedContent', 'changes', 'readingTimeMinutes'],
  },
  AiOutline: {
    type: 'object',
    properties: {
      title: { type: 'string', example: 'Architecting Scalable Microservices with Node.js' },
      targetAudience: { type: 'string', example: 'Senior backend engineers' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string', example: 'Introduction to Event-Driven Design' },
            keyPoints: {
              type: 'array',
              items: { type: 'string' },
              example: ['Understanding broker semantics', 'Idempotency patterns'],
            },
          },
        },
      },
    },
    required: ['title', 'targetAudience', 'sections'],
  },
};

export const aiPaths = {
  '/ai/suggest': {
    post: {
      tags: ['AI'],
      summary: 'Generate post suggestions (title, tags, summary)',
      description:
        'Stateless helper endpoint powered by Google Gemini API. Analyzes post content (minimum 20 characters) and generates a structured title, tags, and summary. Authenticated and rate-limited.',
      security: [{ bearerAuth: [] }],
      requestBody: body(suggestContentSchema, {
        content:
          'Clean architecture helps create scalable and maintainable applications by decoupling core business logic from frameworks and external services.',
      }),
      responses: {
        '200': envelope({ $ref: '#/components/schemas/AiSuggestion' }, 'AI suggestions generated successfully'),
        '400': commonErrors.validation('Content must be at least 20 characters'),
        '401': commonErrors.unauthorized(),
        '429': commonErrors.tooManyRequests('Too many AI requests, please try again after 15 minutes'),
      },
    },
  },
  '/ai/improve': {
    post: {
      tags: ['AI'],
      summary: 'Improve and polish blog post prose with tone selection',
      description: 'Rewrites content according to desired tone (technical, casual, professional, concise).',
      security: [{ bearerAuth: [] }],
      requestBody: body(improveContentSchema, {
        content: 'This text is kinda rough and needs to sound much more professional for an enterprise audience.',
        tone: 'professional',
      }),
      responses: {
        '200': envelope({ $ref: '#/components/schemas/AiImprovement' }, 'Content improved successfully'),
        '400': commonErrors.validation('Content must be at least 20 characters'),
        '401': commonErrors.unauthorized(),
        '429': commonErrors.tooManyRequests('Too many AI requests, please try again after 15 minutes'),
      },
    },
  },
  '/ai/outline': {
    post: {
      tags: ['AI'],
      summary: 'Generate structured article outline for topic',
      description: 'Generates structured outline with sections and key bullet points based on topic.',
      security: [{ bearerAuth: [] }],
      requestBody: body(outlineContentSchema, {
        topic: 'Mastering Distributed Systems in Node.js',
        targetAudience: 'Senior backend developers',
        sectionsCount: 4,
      }),
      responses: {
        '200': envelope({ $ref: '#/components/schemas/AiOutline' }, 'Outline generated successfully'),
        '400': commonErrors.validation('Topic must be at least 5 characters'),
        '401': commonErrors.unauthorized(),
        '429': commonErrors.tooManyRequests('Too many AI requests, please try again after 15 minutes'),
      },
    },
  },
};
