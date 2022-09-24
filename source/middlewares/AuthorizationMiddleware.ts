import { Request, Response, NextFunction } from 'express';
import HTTPException from '../utils/HTTPException';

export default function (roles: Array<string>) {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Response | void => {
    const currentUser = req.user;
    if (!roles.map((role) => role.toUpperCase()).includes(currentUser.role))
      return next(new HTTPException(403, 'Unauthorised'));

    return next();
  };
}
