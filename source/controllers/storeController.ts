import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';

import { Store } from '../models/Store';
import Validations from '../validations/stores';
import { IController } from '../interfaces/Controller';
import { ValidationMiddleware } from '../middlewares/';
import { checkObjectIdValidity, uploadImage } from '../services/stores';
import HTTPException from '../utils/HTTPException';
import { User } from '../models/User';
import { IProduct } from '../interfaces/Product';

const upload = multer({
  dest: 'uploads/',
  limits: { fieldSize: 16 * 1024 * 1024 }
});

export class StoresController implements IController {
  public path = '/stores';
  public router = Router();

  constructor() {
    this.initialiseRoutes();
  }

  private initialiseRoutes(): void {
    this.router.get(`${this.path}`, this.getStores);
    this.router.get(`${this.path}/recommended`, this.getRecommendedStores);
    this.router.get(`${this.path}/nearby`, this.getNearbyStores);

    this.router.post(`${this.path}/search`, this.searchStores);

    this.router.post(
      `${this.path}/create`,
      upload.single('cover_image'),
      ValidationMiddleware(Validations.createStore),
      this.createStore
    );

    this.router.get(`${this.path}/:store_id`, this.getStore);
    this.router.delete(`${this.path}/:store_id`, this.deleteStore);
    this.router.patch(`${this.path}/:store_id`, this.updateStore);

    // this.router.get(`${this.path}/:store_id/inventory`, this.searchStoreInventory);

    this.router.get(
      `${this.path}/:store_id/inventory/search`,
      this.searchStoreInventory
    );

    this.router.put(
      `${this.path}/:store_id/location`,
      this.updateStoreLocation
    );

    this.router.post(
      `${this.path}/:store_id/addWorker`,
      upload.single('avatar'),
      this.addStoreWorker
    );
  }

  /**
   * @desc      Fetching all medical stores, with filters, sorting and pagination.
   * @route     GET /api/stores/
   * @access    Protected
   */
  private getStores = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const reqQuery = { ...req.query };

      const fieldsToRemove = ['select', 'sort', 'page', 'limit'];

      fieldsToRemove.forEach((field: string) => {
        delete reqQuery[field];
      });

      let queryStr: string = JSON.stringify(reqQuery);
      queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|in)\b/g,
        (match) => `$${match}`
      );

      let query = Store.find(JSON.parse(queryStr));

      // selecting fields.
      if (req.query.select) {
        const fieldsToSelect = (req.query.select as string)
          .split(',')
          .join(' ');
        query = query.select(fieldsToSelect);
      }

      // sorting
      if (req.query.sort) {
        const sortBy = (req.query.sort as string).split(',').join(' ');
        query = query.sort(sortBy);
      } else {
        query = query.sort('-createdAt');
      }

      // pagination
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 16;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const docTotal = await Store.countDocuments();

      query = query.skip(startIndex).limit(limit);

      // Execute the query.
      const stores = await query;

      // creating pagination results.
      const pagination: { next?: any; prev?: any } = {};
      if (endIndex < docTotal) {
        pagination.next = {
          page: page + 1,
          limit
        };
      }

      if (startIndex > 0) {
        pagination.prev = {
          page: page - 1,
          limit
        };
      }

      return res
        .status(200)
        .json({ error: false, count: stores.length, pagination, data: stores });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**
   * @desc      Fetching recommended medical stores, with filters, sorting and pagination.
   * @route     GET /api/stores/recommended
   * @access    Protected
   */
  private getRecommendedStores = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const stores = await Store.find({});

      const message = 'recommended stores';
      return res
        .status(200)
        .json({ error: false, count: stores.length, message, data: stores });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**
   * @desc      Fetching nearby medical stores, with filters, sorting and pagination.
   * @route     GET /api/stores/nearby
   * @access    Protected
   */
  private getNearbyStores = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const reqQuery = req.query;
      if (!reqQuery.distance || !reqQuery.lat || !reqQuery.lng)
        return next(
          new HTTPException(400, 'Provide query params: distance, lat, lng')
        );

      const EARTH_RADIUS = 3963; // IN MILES
      const lat = parseFloat(reqQuery.lat as string);
      const lng = parseFloat(reqQuery.lng as string);
      const distance = parseFloat(reqQuery.distance as string);
      const radius = distance / EARTH_RADIUS;

      const query = {
        location: {
          // $near: {
          //   $maxDistance: radius,
          //   $minDistance: 0,
          //   $geometry: {
          //     type: 'Point',
          //     coordinates: [lng, lat]
          //   }
          // }
          $geoWithin: {
            $centerSphere: [[lng, lat], radius]
          }
        }
      };

      const stores = await Store.find(query);

      const message = 'nearby stores';
      return res
        .status(200)
        .json({ error: false, count: stores.length, message, data: stores });
    } catch (error: any) {
      console.log(error);
      next(new HTTPException(500, error?.message));
    }
  };

  /**
   * @desc      Search medical stores and drugs.
   * @route     GET /api/stores/search
   * @access    Protected
   */
  private searchStores = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const stores = await Store.find({});

      const message = 'search stores';
      return res
        .status(200)
        .json({ error: false, count: stores.length, message, data: stores });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**
   * @desc      Fetching single store.
   * @route     GET /api/stores/:store_id
   * @access    Protected
   */
  private getStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      let query = Store.findById(req.params.store_id);

      if (req.query.with_inventory) {
        query = query.populate<{
          inventory: Array<IProduct>;
        }>('inventory');
      }
      const store = await query;

      res.status(200).json({ error: false, data: store });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**
   * @desc      Deleting single store.
   * @route     DELETE /api/stores/:store_id
   * @access    Protected
   */
  private deleteStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const store = await Store.findById(req.params.store_id);
      if (!store) return next(new HTTPException(404, 'store not found'));

      await store.remove();
      const message = 'store was deleted';
      res.status(200).json({ error: false, message, data: store });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**
   * @desc      Create a new store.
   * @route     POST /api/stores/create/?user=123456
   * @access    Protected
   */
  private createStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (!req.query.createdBy)
        return next(new HTTPException(404, 'Please provide store owner id'));

      if (
        req.query.createdBy &&
        !checkObjectIdValidity(req.query.createdBy as string)
      )
        return next(new HTTPException(404, 'Not a valid id'));

      const storeOwner = await User.findById(req.query.createdBy);
      if (!storeOwner) return next(new HTTPException(404, 'user not found'));

      if (storeOwner.role !== 'STORE_ADMIN')
        return next(
          new HTTPException(
            404,
            'This user cannot create store. Must be store admin'
          )
        );

      const { name, email } = req.body;

      let store = new Store();
      store.owner = storeOwner.id;

      // create profile
      store.name = name;
      store.email = email;

      store.website = req.body.website;
      store.description = req.body.description;
      store.account_number = req.body.account_number;
      store.license_number = req.body.license_number;
      store.physical_address = req.body.physical_address;
      store.landmark = req.body.landmark;
      store.phones = req.body.phones;

      // upload image for the store.
      if (req.file) {
        store.cover_image = (await uploadImage(
          req.file,
          store._id,
          next
        )) as string;
      }

      // location using geocodes

      store = await store.save();

      const message = 'store was created';
      res.status(200).json({ error: false, message, data: store });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  // *******************************************************
  /**
   * @desc      Update store.
   * @route     POST /api/stores/:store_id
   * @access    Protected
   */
  private updateStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const store = await Store.findById(req.params.store_id);

      const message = 'store was updated';
      res.status(200).json({ error: false, message, data: store });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  // **********************************************************
  /**
   * @desc      Update store location.
   * @route     PUT /api/stores/:store_id/location
   * @access    Protected
   */
  updateStoreLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const store = await Store.findById(req.params.store_id);
      if (!store) return next(new HTTPException(404, 'store was not found'));

      // location details

      const message = 'Updating store location.';
      return res.status(200).json({ error: false, message, data: store });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**
   * @desc    Search store inventory.
   * @route   GET /api/stores/:store_id/search?q=metro
   * @access  Public
   */
  private searchStoreInventory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const store = await Store.findById(req.params.store_id);
      if (!store) return next(new HTTPException(404, 'store was not found'));

      return res.status(200).json({ error: false, data: store });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**
   * @desc      Add Store worker
   * @route     GET /api/stores/:store_id/add_worker
   * @access    Protected - only store admin can add this worker
   */
  private addStoreWorker = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (!req.query.account_type)
        return next(new HTTPException(400, `please specify account type`));

      let store = await Store.findById(req.params.store_id);
      if (!store)
        return next(
          new HTTPException(400, `store ${req.params.store_id} doesnot exist`)
        );

      // create new worker
      const newWorker = new User({});
      newWorker.role = 'STORE_WORKER';

      newWorker.email = req.body.email;
      newWorker.first_name = req.body.first_name;
      newWorker.last_name = req.body.last_name;
      newWorker.username = req.body.username;
      newWorker.password = req.body.password;

      // upload worker avatar.
      if (req.file) {
        newWorker.avatar = (await newWorker.avatarUpload(
          req.file,
          next
        )) as string;
      }

      // save worker
      const worker = await newWorker.save();

      // attach worker to store.
      if (store.workers.includes(worker._id)) {
        return next(
          new HTTPException(400, `worker ${worker._id} already exist`)
        );
      } else {
        store.workers.push(worker._id);
      }

      store = await store.save();

      const message = 'added new worker to store.';
      return res
        .status(200)
        .json({ error: false, message, data: { store, worker } });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };
}
