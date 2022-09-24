import { Model, Types } from 'mongoose';

export interface IProduct {
  name: string;
  tradename: string;
  description: string;
  catch_phrase: string;
  tags: Array<string>;
  categories: Array<Types.ObjectId>;
  prescription: string;
  directions: string;
  caution: string;
  pricing: {
    currency: string;
    price: number;
    discount: number;
  };
  rating: number;
  reviews: [{ user: Types.ObjectId; content: string; rating: number }];

  images: Array<{ url: string; id: string }>;

  manufacturer: string;
  packaging: {
    size: string;
    quantity: string;
    weight: string;
  };
  store: Types.ObjectId;
}

export interface IProductMethods {
  assignStore(store_id: string): Promise<Types.ObjectId | void>;
}

export type TProductModel = Model<
  IProduct,
  { actual_price: string },
  IProductMethods
>;
