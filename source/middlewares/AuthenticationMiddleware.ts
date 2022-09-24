import { Request, Response, NextFunction } from 'express';
import token from '../services/tokens';
import { User } from '../models/User';
import { Token } from '../interfaces/Token';
import jwt from 'jsonwebtoken';
import HTTPException from '../utils/HTTPException';

export default async function (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<Response | void> {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith('Bearer ')) {
    return next(new HTTPException(401, 'Unauthorised'));
  }

  const accessToken = bearer.split('Bearer ')[1].trim();
  try {
    const payload: Token | jwt.JsonWebTokenError = await token.verifyToken(
      accessToken
    );

    if (payload instanceof jwt.JsonWebTokenError) {
      return next(new HTTPException(401, 'Unauthorised'));
    }

    const user = await User.findById(payload.id).select('-password').exec();

    if (!user) {
      return next(new HTTPException(401, 'Unauthorised'));
    }

    req.user = user;

    return next();
  } catch (error) {
    return next(new HTTPException(401, 'Unauthorised'));
  }
}
