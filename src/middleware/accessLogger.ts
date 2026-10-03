import type { Request, Response, NextFunction } from 'express';

export function accessLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const path = req.originalUrl || req.url;
    const log = req.log;

    // Suppress high-frequency health / ready logs unless warning / error
    const isHealthCheck =
      path.startsWith('/api/v1/health') ||
      path.startsWith('/api/v1/ready') ||
      path === '/health' ||
      path === '/ready';

    if (isHealthCheck) {
      if (res.statusCode >= 400 && log) {
        log.warn(
          {
            method: req.method,
            path,
            status: res.statusCode,
            duration: `${durationMs}ms`,
            reqId: req.id,
          },
          'Health check non-200 response'
        );
      }
      return;
    }

    const logData = {
      method: req.method,
      path,
      status: res.statusCode,
      duration: `${durationMs}ms`,
      userId: req.user?.userId,
      organizationId: req.user?.organizationId,
      reqId: req.id,
    };

    if (!log) return;

    if (res.statusCode >= 500) {
      log.error(logData, 'HTTP request completed with server error');
    } else if (res.statusCode >= 400) {
      log.warn(logData, 'HTTP request completed with client error');
    } else {
      log.info(logData, 'HTTP request completed');
    }
  });

  next();
}
