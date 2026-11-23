import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from './types.js';

const jwtSecret = process.env.JWT_SECRET || 'atelier-local-development-secret';

export interface AuthRequest extends Request {
  auth: { userId: string; role: Role };
}

export function signToken(userId: string, role: Role) {
  return jwt.sign({ sub: userId, role }, jwtSecret, { expiresIn: '7d' });
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ message: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (typeof payload === 'string' || !payload.sub || (payload.role !== 'user' && payload.role !== 'admin')) throw new Error();
    (request as AuthRequest).auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    response.status(401).json({ message: 'Your session is invalid or has expired.' });
  }
}

export function requireAdmin(request: Request, response: Response, next: NextFunction) {
  if ((request as AuthRequest).auth.role !== 'admin') return response.status(403).json({ message: 'Administrator access required.' });
  next();
}

