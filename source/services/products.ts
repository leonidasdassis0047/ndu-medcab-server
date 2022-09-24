import fs from 'fs/promises';
import { NextFunction } from 'express';
import HTTPException from '../utils/HTTPException';
import { cloudinary } from '../utils/imageUpload';
import { Types } from 'mongoose';

export const uploadImage = async (
  files: Array<any>
): Promise<Array<{ id: string; url: string }> | void> => {
  try {
    const results = files.map(async (file) => {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'medcab/products',
        format: 'jpg',
        public_id: `${file.filename}`
      });

      await fs.unlink(file.path);
      return { url: result.secure_url, id: file.filename };
    });

    const images = await Promise.all([...results]);
    console.log(images[0].id);
    return images;
  } catch (error: any) {
    // next(new HTTPException(500, error?.message));
    throw new HTTPException(500, error.message);
  }
};
