import { Router, Request, Response, NextFunction } from 'express';
import { IController } from '../interfaces/Controller';
import HTTPException from '../utils/HTTPException';
import { Category } from '../models/Category';
import multer from 'multer';

const upload = multer({
  dest: 'uploads/',
  limits: { fieldSize: 16 * 1024 * 1024 }
});

export class CategoriesController implements IController {
  public path = '/categories';
  public router = Router();

  constructor() {
    this.initialiseRoutes();
  }

  private initialiseRoutes(): void {
    this.router.post(`${this.path}`, this.addNewCategory);

    this.router.get(`${this.path}`, this.getCategories);
    this.router.get(`${this.path}/:category_id`, this.categoryDetails);
    this.router.delete(`${this.path}/:category_id`, this.deleteCategory);
    this.router.patch(`${this.path}/:category_id`, this.updateCategory);
  }

  /**************************************************
   * @desc      Get categories with filtering, pagination, sorting ...
   * @route     GET /api/categories/
   * @access    Protected
   */
  private getCategories = async (
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

      let query = Category.find(JSON.parse(queryStr));

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
      const docTotal = await Category.countDocuments(JSON.parse(queryStr));

      query = query.skip(startIndex).limit(limit);

      // Execute the query.
      const categories = await query;

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
        count: categories.length,
        pagination,
        data: categories
      });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Get categories details
   * @route     GET /api/categories/:category_id
   * @access    Protected
   */
  private categoryDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const category = await Category.findById(req.params.category_id).populate(
        'subcategories'
      );
      if (!category) return next(new HTTPException(404, 'category not found'));

      const message = `details for category: ${category._id}`;
      return res.status(200).json({ error: false, message, data: category });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Delete category
   * @route     DELETE /api/categories/:category_id
   * @access    Protected
   */
  private deleteCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      let category = await Category.findById(req.params.category_id);
      if (!category) return next(new HTTPException(404, 'category not found'));

      category = await category.remove();

      const message = `delete category: ${category._id} success`;
      return res.status(200).json({ error: false, message, data: category });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Update category
   * @route     PATCH /api/categories/:category_id
   * @access    Protected
   */
  private updateCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const category = await Category.findByIdAndUpdate(
        req.params.category_id,
        req.body,
        { new: true }
      );
      if (!category) return next(new HTTPException(404, 'category not found'));

      const message = `category: ${category._id} update success`;
      return res.status(200).json({ error: false, message, data: category });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Create category
   * @route     POST /api/categories
   * @access    Protected
   */
  private addNewCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      let category = new Category();

      category.name = req.body.name;

      if (req.body.featured) category.featured = Boolean(req.body.featured);
      if (req.body.description) category.description = req.body.description;
      if (req.body.icon) category.icon = req.body.icon;
      if (req.body.parent) category.parent = req.body.parent;

      // image upload here

      category = await category.save();

      const message = 'added category';
      return res.status(200).json({ error: false, message, data: category });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };
}
