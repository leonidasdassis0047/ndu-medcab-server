import mongoose, { Schema } from 'mongoose';
import { ICategory } from '../interfaces/Category';

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50
    },
    description: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: 'Category' },
    icon: { type: String },
    image: {
      id: { type: String },
      url: { type: String }
    },
    featured: { type: Boolean, default: false }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

CategorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

export const Category = mongoose.model('Category', CategorySchema);
