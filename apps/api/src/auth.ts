import type { Request, Response, NextFunction } from 'express';
import { prisma, type User } from '@harmony/db';

export type AuthedRequest = Request & { user: User };

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const mode = process.env.AUTH_MODE ?? 'dev';
  if (mode !== 'dev') {
    res.status(401).json({ error: { code: 'AUTH_NOT_CONFIGURED', message: 'Cognito auth is not enabled in this environment.' } });
    return;
  }
  const email =
    (typeof req.query.devUser === 'string' ? req.query.devUser : '') ||
    (req.header('x-dev-user') ?? process.env.DEV_USER_EMAIL ?? '').trim() ||
    'doc@thrivingharmony.example';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: { code: 'UNKNOWN_USER', message: `No user for ${email}` } });
    return;
  }
  (req as AuthedRequest).user = user;
  next();
}

export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthedRequest).user;
  if (user.role !== 'OWNER') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Owner role required.' } });
    return;
  }
  next();
}
