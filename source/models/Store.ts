import mongoose, { Schema } from 'mongoose';
import { User } from '../models/User';
import HTTPException from '../utils/HTTPException';
import { IStore } from '../interfaces/Store';

const StoreSchema = new Schema<IStore>(
  {
    email: { type: String, trim: true, unique: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    slug: { type: String, trim: true },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 50
    },
    description: { type: String, maxlength: 500 },
    phones: [{ type: String }],
    website: { type: String },
    average_rating: { type: Number },
    cover_image: { type: String },
    images: [{ type: String }],
    account_number: { type: String },
    license_number: { type: String },
    landmark: { type: String },
    physical_address: { type: String },
    credentials: {
      passcode: { type: String, minlength: 8, select: false }
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0], index: '2dsphere' }
    },
    address: {
      state: String,
      city: String,
      pincode: Number,
      street: String,
      apartment_number: Number,
      landmark: String
    },
    live_tracking: { type: Boolean, default: false },
    workers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    agents: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true }
).index({ location: '2dsphere' });

// find store owner first and attach to them
// elevate role
StoreSchema.pre('save', async function (next: any) {
  try {
    const owner = await User.findById(this.owner);
    if (!owner) {
      throw new HTTPException(404, `${this.name}, store owner not found`);
    }
    if (owner.role !== 'STORE_ADMIN') {
      throw new HTTPException(
        403,
        `${owner.username} is not authorised to signup store.`
      );
    }

    next();
  } catch (error: any) {
    throw new HTTPException(500, error?.message);
  }
});

// cascade remove products that belong to this store on store deletion

// fetch inventory for this store, as a virtual
StoreSchema.virtual('inventory', {
  localField: '_id',
  foreignField: 'store',
  ref: 'Product',
  justOne: false
});

export const Store = mongoose.model('Store', StoreSchema);
