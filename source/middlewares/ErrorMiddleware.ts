import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/HTTPException';

export default function errorMiddleware(
  error: HttpException,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): Response | void {
  const status = error.status || 500;
  const message = error.message || 'Something went wrong';

  // res.append('Content-Type', 'application/json');
  res.statusCode = status;
  return res.send({
    error: true,
    status,
    message
  });
}
