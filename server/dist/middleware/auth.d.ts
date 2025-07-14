import { Request, Response, NextFunction } from 'express';
interface JwtPayload {
    userId: number;
}
interface AuthenticatedRequest extends Request {
    user: JwtPayload;
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => void;
export declare const isAuthenticatedRequest: (req: Request) => req is AuthenticatedRequest;
export {};
//# sourceMappingURL=auth.d.ts.map