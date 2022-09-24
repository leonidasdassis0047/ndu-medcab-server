import fs from 'fs/promises';
import { NextFunction } from 'express';
import HTTPException from '../utils/HTTPException';
import { cloudinary } from '../utils/imageUpload';
import { Types } from 'mongoose';

interface ImageUploadProps {
  file: any;
  id: Types.ObjectId;
  public_id?: string;
  next: NextFunction;
}

export const avatarImageUpload = async ({
  file,
  id,
  public_id = 'avatar',
  next
}: ImageUploadProps): Promise<string | void> => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      public_id: `${id}_${public_id}`,
      format: 'jpg',
      folder: 'medcab/users'
    });

    await fs.unlink(file.path);
    return result.secure_url;
  } catch (error: any) {
    next(new HTTPException(500, error?.message));
  }
};
