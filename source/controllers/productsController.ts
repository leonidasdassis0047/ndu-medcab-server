import { Router, Request, Response, NextFunction } from 'express';
import { IController } from '../interfaces/Controller';
import HTTPException from '../utils/HTTPException';
import { ValidationMiddleware } from '../middlewares';
import { Product } from '../models/Product';
import mongoose, { Types } from 'mongoose';
import { uploadImage } from '../services/products';
import multer from 'multer';
import {
  AuthenticationMiddleware,
  AuthorizationMiddleware
} from '../middlewares';
// import { ICategory } from '../categories/Interfaces';

const upload = multer({
  dest: 'uploads/',
  limits: { fieldSize: 16 * 1024 * 1024 }
});

export class ProductsController implements IController {
  public path = '/products';
  public router = Router();

  constructor() {
    this.initialiseRoutes();
  }

  private initialiseRoutes(): void {
    this.router.get(`${this.path}`, this.getProducts);
    this.router.get(`${this.path}/:product_id`, this.readProductDetails);
    this.router.delete(`${this.path}/:product_id`, this.deleteProduct);

    this.router.put(
      `${this.path}/:product_id/categories`,
      this.updateProductCategories
    );

    this.router.post(
      `${this.path}/register`,
      AuthenticationMiddleware,
      AuthorizationMiddleware(['STORE_ADMIN', 'STORE_WORKER']),
      upload.array('images', 5),
      this.registerProduct
    );

    this.router.patch(
      `${this.path}/:product_id`,
      AuthenticationMiddleware,
      AuthorizationMiddleware(['STORE_ADMIN', 'STORE_WORKER']),
      this.updateProduct
    );

    this.router.put(
      `${this.path}/:product_id/change-discount`,
      AuthenticationMiddleware,
      AuthorizationMiddleware(['STORE_ADMIN', 'STORE_WORKER']),
      this.updateProductDiscount
    );
  }

  /**************************************************
   * @desc      Get products with filtering, pagination, sorting ...
   * @route     GET /api/products/
   * @access    Protected
   */
  private getProducts = async (
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

      let query = Product.find(JSON.parse(queryStr));

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
      const docTotal = await Product.countDocuments();

      query = query.skip(startIndex).limit(limit);

      // Execute the query.
      const products = await query;

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

      return res.status(200).json({
        error: false,
        count: products.length,
        pagination,
        data: products
      });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Get product details
   * @route     GET /api/products/:product_id
   * @access    Protected
   */
  private readProductDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const product = await Product.findById(req.params.product_id).populate({
        path: 'store',
        select: 'name email'
      });
      if (!product) return next(new HTTPException(404, 'product not found'));

      const message = `details for product: ${product._id}`;
      return res.status(200).json({ error: false, message, data: product });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Delete product
   * @route     DELETE /api/products/:product_id
   * @access    Protected
   */
  private deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      let product = await Product.findById(req.params.product_id);
      if (!product) return next(new HTTPException(404, 'product not found'));

      product = await product.remove();

      const message = `delete product: ${product._id} success`;
      return res.status(200).json({ error: false, message, data: product });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Update product details
   * @route     PATCH /api/products/:product_id/
   * @access    Protected, Only store admin, workers can update own product
   */
  private updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.product_id,
        req.body,
        { new: true }
      );
      if (!product) return next(new HTTPException(404, 'product not found'));

      const message = `product: ${product.name}, update success`;
      return res.status(200).json({ error: false, message, data: product });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Create product, for a given store
   * @route     POST /api/products/register/?store=xxxx
   * @access    Protected
   */
  private registerProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (!req.query.store)
        return next(new HTTPException(404, 'please provide store id'));

      let product = new Product();

      // details
      product.name = req.body.name;
      product.tradename = req.body.tradename;
      product.catch_phrase = req.body.catch_phrase;
      product.description = req.body.description;
      product.directions = req.body.directions;

      product.categories = req.body.categories;
      product.tags = req.body.tags;

      // pricing
      product.pricing.price = req.body.price;
      product.pricing.discount = req.body.discount;
      if (req.body.currency) product.pricing.currency = req.body.currency;

      // packaging details
      product.packaging.weight = req.body.weight;
      product.packaging.size = req.body.size;
      product.packaging.quantity = req.body.quantity;

      //   manufacturer details
      product.manufacturer = req.body.manufacturer;

      // store details
      product.store = (await product.assignStore(
        req.query.store as string
      )) as Types.ObjectId;

      //  upload images
      if (req.files) {
        product.images = (await uploadImage(req.files as Array<any>)) as Array<{
          id: string;
          url: string;
        }>;
      }

      // save product here
      product = await product.save();

      const message = `add product: ${product.name} success`;
      return res.status(200).json({ error: false, message, data: product });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Change product discount
   * @route     PUT /api/products/:product_id/change-discount
   * @access    Protected, Only store admin, workers can update own product
   */
  private updateProductDiscount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      let product = await Product.findById(req.params.product_id);
      if (!product) return next(new HTTPException(404, 'product not found'));

      product.pricing.discount = req.body.discount;
      product = await product.save();
      const message = `product discount update success`;
      return res.status(200).json({ error: false, message, data: product });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Update product categories
   * @route     PUT /api/products/:product_id/categories
   * @access    Protected, Only store admin, workers can update own product
   */
  private updateProductCategories = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const product = await Product.findById(req.params.product_id);
      if (!product) return next(new HTTPException(404, 'product not found'));

      const categories = [...product.categories];
      const newCategories: Array<Types.ObjectId> = [];

      if (!req.body.categories)
        return next(new HTTPException(404, 'provide categories'));

      (req.body.categories as Array<string>).forEach((item) => {
        if (mongoose.isValidObjectId(item)) {
          newCategories.push(item as unknown as Types.ObjectId);
          console.log(newCategories);
        }
      });

      const message = `product discount update success`;
      return res.status(200).json({ error: false, message, data: product });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };
}
