import mongoose, { Schema, Types } from 'mongoose';
import HTTPException from '../utils/HTTPException';
import { Store } from '../models/Store';
import {
  IProduct,
  IProductMethods,
  TProductModel
} from '../interfaces/Product';

const ProductSchema = new Schema<IProduct, TProductModel, IProductMethods>(
  {
    name: { type: String, required: true },
    tradename: { type: String, required: true },
    catch_phrase: { type: String },
    directions: { type: String },
    description: { type: String },
    prescription: { type: String },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    tags: [{ type: String }],
    caution: { type: String },
    packaging: {
      size: { type: String },
      quantity: { type: String },
      weight: { type: String }
    },
    manufacturer: { type: String },
    images: [{ url: { type: String }, id: { type: String }, _id: false }],
    store: { type: Schema.Types.ObjectId, ref: 'Store' },
    pricing: {
      price: { type: Number },
      discount: { type: Number, default: 0 },
      currency: { type: String, default: 'UGX' }
    },
    rating: { type: Number },
    reviews: [
      {
        rating: { type: Number },
        content: { type: String },
        user: { type: Schema.Types.ObjectId, ref: 'User' }
      }
    ]
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ProductSchema.methods.assignStore = async function (
  store_id: string
): Promise<Types.ObjectId | void> {
  try {
    const store = await Store.findById(store_id);
    if (!store) {
      throw new HTTPException(
        404,
        `store ${store_id} was not found, provide your store id`
      );
    }

    return store._id;
  } catch (error: any) {
    throw new HTTPException(500, error.message);
  }
};

// virtual for the main image
ProductSchema.virtual('image').get(function (): string {
  return this.images.length ? this.images[0].url : '';
});

// discounting and calculating actual cost
ProductSchema.virtual('actual_price').get(function (): number {
  const actualPrice =
    this.pricing.discount > 0
      ? this.pricing.price * ((100 - this.pricing.discount) / 100)
      : this.pricing.price;

  return actualPrice;
});

export const Product = mongoose.model<IProduct, TProductModel>(
  'Product',
  ProductSchema
);
