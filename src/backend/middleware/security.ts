import type { NextFunction, Request, Response } from 'express';
import { findForbiddenKeysDeep } from '../forbidden-fields.js';

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'interest-cohort=()');
  next();
}

/** Rejette tout corps contenant des clés interdites (défense RGPD). */
export function rejectForbiddenTelemetryBody(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method !== 'POST' || !req.path.endsWith('/telemetry')) {
    next();
    return;
  }

  const forbidden = findForbiddenKeysDeep(req.body);
  if (forbidden.length > 0) {
    res.status(400).json({ error: 'Payload interdit', details: forbidden });
    return;
  }

  next();
}
