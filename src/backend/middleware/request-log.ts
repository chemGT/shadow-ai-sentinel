import type { NextFunction, Request, Response } from 'express';

/** Log minimal sans corps (pas de contenu télémétrie / policy). */
export function safeRequestLog(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const tenantId = (req as Request & { tenantId?: string }).tenantId ?? '-';
    console.info(
      `[API] ${req.method} ${req.path} ${res.statusCode} ${duration}ms tenant=${tenantId}`,
    );
  });

  next();
}
