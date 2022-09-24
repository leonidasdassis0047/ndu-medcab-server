import fs from 'fs/promises';
import { NextFunction } from 'express';
import HTTPException from '../utils/HTTPException';
import { cloudinary } from '../utils/imageUpload';
import mongoose, { Types } from 'mongoose';

export const uploadImage = async (
  file: any,
  id: Types.ObjectId,
  next: NextFunction
): Promise<string | void> => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      public_id: `${id}_cover_photo`,
      format: 'jpg',
      folder: 'medcab/stores'
    });

    await fs.unlink(file.path);
    return result.secure_url;
  } catch (error: any) {
    next(new HTTPException(500, error?.message));
  }
};

export const checkObjectIdValidity = (id: string): boolean => {
  if (mongoose.isValidObjectId(id)) {
    return true;
  } else {
    return false;
  }
};
