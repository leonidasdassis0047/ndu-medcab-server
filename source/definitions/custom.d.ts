import { Types } from 'mongoose';
import { Multer } from 'multer';
import { IUser } from '../../resources/users/Interfaces';

declare global {
  namespace Express {
    export interface Request {
      file: Multer.File;
      files: [Multer.File];
      user: IUser & { _id: Types.ObjectId };
    }
  }
}
