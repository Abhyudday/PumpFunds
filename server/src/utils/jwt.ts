import jwt from 'jsonwebtoken';

export const generateToken = (userId: number): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '7d' }
  );
}; 