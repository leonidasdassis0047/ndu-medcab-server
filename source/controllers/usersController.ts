import { Router, Request, Response, NextFunction } from 'express';

import { IController } from '../interfaces/Controller';
import HTTPException from '../utils/HTTPException';
import { User } from '../models/User';
import {
  AuthenticationMiddleware,
  AuthorizationMiddleware
} from '../middlewares';

export class UserController implements IController {
  public path = '/users';
  public router = Router();

  constructor() {
    this.initialiseRoutes();
  }

  private initialiseRoutes(): void {
    this.router.get(
      `${this.path}`,
      AuthenticationMiddleware,
      AuthorizationMiddleware(['admin']),
      this.getUsers
    );

    this.router.delete(`${this.path}/:user_id`, this.deleteUser);
    this.router.delete(`${this.path}/`, this.deleteUsers);
  }

  /**************************************************
   * @desc      Get users.
   * @route     GET /api/users/
   * @access    Protected
   */
  private getUsers = async (
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

      let query = User.find(JSON.parse(queryStr));

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
      const docTotal = await User.countDocuments();

      query = query.skip(startIndex).limit(limit);

      // Execute the query.
      const users = await query;

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
        .json({ count: users.length, pagination, data: users });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Delete user account.
   * @route     DELETE /api/users/user_id
   * @access    Protected
   */
  private deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const user = await User.findById(req.params.user_id);
      if (!user) return next(new HTTPException(404, 'user account not found'));

      await user.remove();

      const message = 'user account deleted successfully';
      res.status(200).json({ message, data: user });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Delete all users. this is not to exposed no matter what
   * @route     DELETE /api/users/
   * @access    Protected
   */
  private deleteUsers = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      await User.deleteMany({});
      const message = 'user successfully deleted';
      res.status(200).json({ message });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };
}
