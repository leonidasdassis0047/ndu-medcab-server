import { Types } from 'mongoose';
export interface IStore {
  owner: Types.ObjectId;
  name: string;
  description: string;
  slug: string;
  phones: Types.Array<string>;
  email: string;
  website: string;
  average_rating: number;
  cover_image: string;
  images: Types.Array<string>;
  account_number: string;
  license_number: string;
  landmark: string;
  physical_address: string;
  address: {
    state: string;
    street: string;
    city: string;
    apartment_number: number;
    pincode: number;
    landmark: string;
  };
  location: {
    type: string;
    coordinates: Types.Array<number>;
  };
  credentials: {
    passcode: string;
  };
  status: string;
  is_available: boolean;
  // inventory: Types.ObjectId;
  workers: Types.Array<Types.ObjectId>;
  agents: Types.Array<Types.ObjectId>;
  ratings: number;
  live_tracking: boolean;
  rating: number;
  reviews: Types.Array<string>;
}
