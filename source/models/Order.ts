import mongoose, { Schema, Types } from 'mongoose';
import HTTPException from '../utils/HTTPException';
import {
  IOrder,
  IOrderItem,
  IOrderMethods,
  TOrderModel
} from '../interfaces/Order';

const OrderItemSchema = new Schema<IOrderItem>({
  item: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number }
});

export const OrderItem = mongoose.model('OrderItem', OrderItemSchema);

const OrderSchema = new Schema<IOrder, TOrderModel, IOrderMethods>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    store: { type: Schema.Types.ObjectId, ref: 'Store' },
    status: {
      type: String,
      enum: ['COMPLETED', 'PROCESSING', 'PENDING', 'CANCELED', 'REJECTED']
    },
    order_items: [{ type: Schema.Types.ObjectId, ref: 'OrderItem' }],
    total: { type: Number },
    shipping_address: { type: String },
    currency: { type: String, default: 'UGX' },
    payment: {
      mode: { type: String }
    }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// get store details and return store id
OrderSchema.methods.getStoreDetails = async function (store_id: string) {
  try {
    const store = await this.model('Store').findById(store_id);
    if (!store) {
      throw new HTTPException(404, 'store not found');
    }
    return store._id as Types.ObjectId;
  } catch (error: any) {
    throw new HTTPException(500, error.message);
  }
};

// cascade deleting order_items, that belong to this order
OrderSchema.pre('remove', async function (next: any) {
  try {
    this.order_items.map(async (id) => {
      await OrderItem.findByIdAndRemove(id);
    });

    next();
  } catch (error: any) {
    throw new HTTPException(500, error.message);
  }
});

export const Order = mongoose.model<IOrder, TOrderModel>('Order', OrderSchema);
