import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserSession } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const user = AuthService.verifyToken(token);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};
