import jwt from 'jsonwebtoken';
import { Token } from '../interfaces/Token';
import { IUser } from '../interfaces/User';
import { Document } from 'mongoose';

export const createToken = (
  user: Document<IUser>,
  expiration?: string
): string => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY as jwt.Secret, {
    expiresIn: expiration || '1d'
  });
};

export const verifyToken = async (
  token: string
): Promise<jwt.VerifyErrors | Token> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      process.env.JWT_SECRET_KEY as jwt.Secret,
      (err, payload) => {
        if (err) return reject(err);

        resolve(payload as Token);
      }
    );
  });
};

export default { createToken, verifyToken };
