import { body, envelope, commonErrors } from '../helpers';
import { createReportSchema } from '../../modules/reports/report.validation';

export const reportsSchemas = {
  ReportResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'report_cuid123' },
      targetType: { type: 'string', enum: ['POST', 'COMMENT', 'USER'], example: 'POST' },
      targetId: { type: 'string', example: 'cuid123456789' },
      reason: {
        type: 'string',
        enum: ['SPAM', 'HARASSMENT', 'MISINFORMATION', 'ILLEGAL', 'OTHER'],
        example: 'SPAM',
      },
      details: { type: 'string', nullable: true, example: 'Contains spam links' },
      status: { type: 'string', enum: ['OPEN', 'RESOLVED', 'DISMISSED'], example: 'OPEN' },
      reporterId: { type: 'string', example: 'user_123' },
      reporterName: { type: 'string', example: 'Alice' },
      resolvedById: { type: 'string', nullable: true, example: null },
      resolvedByName: { type: 'string', nullable: true, example: null },
      resolutionNote: { type: 'string', nullable: true, example: null },
      resolvedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
};

export const reportsPaths = {
  '/reports': {
    post: {
      tags: ['Reports'],
      summary: 'Submit a moderation report',
      description: 'Report abusive or violating content. Requires verified email.',
      security: [{ bearerAuth: [] }],
      requestBody: body(createReportSchema),
      responses: {
        '201': envelope({ $ref: '#/components/schemas/ReportResponse' }, 'Report submitted successfully'),
        '400': commonErrors.validation(),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden('Email verification required'),
        '404': commonErrors.notFound('Target item'),
        '409': commonErrors.conflict('You have already submitted an active report for this item'),
      },
    },
  },
};
