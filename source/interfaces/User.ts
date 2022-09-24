import { NextFunction } from 'express';
import { Model, Types } from 'mongoose';

export interface IUser {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  avatar: string;
  phones: Types.Array<string>;
  role: string;
  account_type: string;
  verificationToken: string;
  current_location: {
    type: string;
    coords: Types.Array<number>;
  };
  address: {
    city: string;
    country: string;
    formatted_address: string;
    street: string;
    apartment: string;
    block: string;
    room: string;
  };
  physical_address: string;
  profile: Types.ObjectId;
}

export interface IUserMethods {
  isValidPassword(
    password: string,
    next: NextFunction
  ): Promise<boolean | void>;

  avatarUpload(file: any, next: NextFunction): Promise<string | void>;
}

export type TUserModel = Model<
  IUser,
  // eslint-disable-next-line @typescript-eslint/ban-types
  {},
  IUserMethods
>;
