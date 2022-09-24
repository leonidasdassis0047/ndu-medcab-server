import { Schema, model } from 'mongoose';
import { NextFunction } from 'express';
import bcrypt from 'bcrypt';

import HTTPException from '../utils/HTTPException';
import { IUser, IUserMethods, TUserModel } from '../interfaces/User';
import { avatarImageUpload } from '../services/users';

const UserSchema = new Schema<IUser, TUserModel, IUserMethods>(
  {
    first_name: { type: String },
    last_name: { type: String },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, trim: true },
    phones: [{ type: String }],
    password: { type: String, select: false },
    avatar: { id: { type: String }, url: { type: String } },
    role: {
      type: String,
      enum: ['CUSTOMER', 'STORE_ADMIN', 'DELIVERY_AGENT', 'STORE_WORKER'],
      default: 'CUSTOMER'
    },
    account_type: {
      type: String,
      enum: ['customer', 'store_admin', 'store_worker', 'delivery_agent'],
      default: 'customer',
      select: false
    },
    address: {
      city: { type: String }
    },
    verificationToken: { type: String }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

UserSchema.pre('save', async function (next) {
  try {
    // password hashing
    if (!this.isModified('password')) return next();

    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    this.role = this.account_type.toUpperCase();
    next();
  } catch (error: any) {
    next(new HTTPException(500, error.message));
  }
});

UserSchema.methods.isValidPassword = async function (
  password: string,
  next: NextFunction
): Promise<boolean | void> {
  try {
    const result = await bcrypt.compare(password, this.password);
    return result;
  } catch (error: any) {
    next(new HTTPException(500, error.message));
  }
};

UserSchema.methods.avatarUpload = async function (
  file: any,
  next: NextFunction
): Promise<string | void> {
  try {
    const id = this.id;
    return await avatarImageUpload({ file, id, next });
  } catch (error: any) {
    next(new HTTPException(500, error.message));
  }
};

export const User = model<IUser, TUserModel>('User', UserSchema);
