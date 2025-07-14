import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
}

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const payload = jwt.verify(token, secret) as JwtPayload;
    
    // Add user info to request object
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Type guard to check if request has user property
export const isAuthenticatedRequest = (req: Request): req is AuthenticatedRequest => {
  return 'user' in req;
}; 