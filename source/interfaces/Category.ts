import { Types } from 'mongoose';

export interface ICategory {
  name: string;
  description: string;
  icon: string;
  image: {
    id: string;
    url: string;
  };
  parent: Types.ObjectId;
  featured: boolean;
}
