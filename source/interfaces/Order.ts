import { Model, Types } from 'mongoose';
import { IProduct } from '../interfaces/Product';

export interface IOrderItem {
  quantity: number;
  item: Types.ObjectId;
}

export interface IOrder {
  user: Types.ObjectId;
  store: Types.ObjectId;
  order_items: Array<Types.ObjectId>;
  status: string;
  total: number;
  currency: string;
  address: {
    street: string;
    apartment: string;
    room: string;
    city: string;
    formatted_address: string;
    landmark: string;
  };
  shipping_address: string;
  payment: {
    mode: string;
  };
}

export interface IOrderMethods {
  getStoreDetails(store_id: string): Promise<void | Types.ObjectId>;
}

export type TOrderModel = Model<
  IOrder,
  // eslint-disable-next-line @typescript-eslint/ban-types
  {},
  IOrderMethods
>;
