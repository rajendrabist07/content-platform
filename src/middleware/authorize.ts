import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../core/errors/HttpError';

type Role = 'OWNER' | 'ADMIN' | 'MEMBER';


export function authorize(...allowedRoles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ForbiddenError('Authentication required'));
        }

        if (!allowedRoles.includes(req.user.role as Role)) {
            return next(new ForbiddenError(`This action requires one of these roles: ${allowedRoles.join(', ')}`));
        }

        next();
    };
}