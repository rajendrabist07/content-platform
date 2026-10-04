export const healthSchemas = {
    HealthResponse: {
        type: 'object',
        properties: {
            status: { type: 'string', example: 'healthy' },
            timestamp: { type: 'string', format: 'date-time', example: '2026-10-04T12:00:00.000Z' },
            uptime: { type: 'number', example: 123.45 },
        },
        required: ['status', 'timestamp', 'uptime'],
    },
    ReadyResponse: {
        type: 'object',
        properties: {
            status: { type: 'string', example: 'ready' },
            timestamp: { type: 'string', format: 'date-time', example: '2026-10-04T12:00:00.000Z' },
            uptime: { type: 'number', example: 123.45 },
            database: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'connected' },
                    responseTimeMs: { type: 'number', example: 4 },
                    latestMigration: { type: 'string', example: '20261003140533_add_audit_logs' },
                },
                required: ['status'],
            },
        },
        required: ['status', 'timestamp', 'uptime', 'database'],
    },
    UnhealthyResponse: {
        type: 'object',
        properties: {
            status: { type: 'string', example: 'unhealthy' },
            timestamp: { type: 'string', format: 'date-time', example: '2026-10-04T12:00:00.000Z' },
            database: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'disconnected' },
                },
                required: ['status'],
            },
        },
        required: ['status', 'timestamp', 'database'],
    },
};

export const healthPaths = {
    '/health': {
        get: {
            tags: ['Health'],
            summary: 'Liveness probe',
            description: 'Returns 200 if the Node.js process is alive and responsive. Does not touch the database.',
            responses: {
                '200': {
                    description: 'Server is healthy',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/HealthResponse' },
                        },
                    },
                },
            },
        },
    },
    '/ready': {
        get: {
            tags: ['Health'],
            summary: 'Readiness probe',
            description: 'Verifies database connectivity and asserts migration table integrity. Returns 503 if DB is unreachable or if any migration is failed/rolled back.',
            responses: {
                '200': {
                    description: 'Server and database are ready to handle traffic',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ReadyResponse' },
                        },
                    },
                },
                '503': {
                    description: 'Database is disconnected or migration failure detected',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UnhealthyResponse' },
                        },
                    },
                },
            },
        },
    },
};
