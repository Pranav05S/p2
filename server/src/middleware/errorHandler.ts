import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isAxiosError } from 'axios';
import { ApiError } from '../lib/errors';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ code: 'bad_request', message: 'Validation failed', details: err.issues });
  }
  if (isAxiosError(err)) {
    console.error('Upstream request failed:', err.config?.url, err.response?.status, err.response?.data);
    return res.status(502).json({
      code: 'upstream_error',
      message: `Request to ${err.config?.url ?? 'an upstream provider'} failed`,
      details: err.response?.data,
    });
  }
  console.error(err);
  return res.status(500).json({ code: 'internal_error', message: 'Something went wrong' });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ code: 'not_found', message: 'Route not found' });
}
