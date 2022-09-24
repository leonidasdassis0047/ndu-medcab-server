import { Router, Request, Response, NextFunction } from 'express';
import JWT from 'jsonwebtoken';

import { IController } from '../interfaces/Controller';
import Validations from '../validations/users';
import HTTPException from '../utils/HTTPException';
import { verifyToken } from '../services/tokens';
import { Token } from '../interfaces/Token';
import { User } from '../models/User';
import {
  AuthenticationMiddleware,
  AuthorizationMiddleware,
  ValidationMiddleware
} from '../middlewares/';

export class UserController implements IController {
  public path = '/users';
  public router = Router();

  constructor() {
    this.initialiseRoutes();
  }

  private initialiseRoutes(): void {
    this.router.post(
      `${this.path}/signup`,
      ValidationMiddleware(Validations.signup),
      this.signup
    );

    this.router.post(
      `${this.path}/signin`,
      ValidationMiddleware(Validations.signin),
      this.signin
    );

    this.router.get(
      `${this.path}`,
      AuthenticationMiddleware,
      AuthorizationMiddleware(['admin']),
      this.getUsers
    );

    this.router.get(`${this.path}/me`, this.getCurrentUser);
    this.router.delete(`${this.path}/:user_id`, this.deleteUser);
    this.router.delete(`${this.path}/`, this.deleteUsers);
  }

  /**************************************************
   * @desc      Create a new user.
   * @route     POST /api/users/signup
   * @access    Public
   */
  private signup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const { account_type } = req.query;
      if (!account_type)
        return next(
          new HTTPException(
            400,
            'QueryString "account_type" is required! Please specify account_type.'
          )
        );

      const { email, first_name, last_name, username, password } = req.body;

      const newUser = new User();

      newUser.email = email;
      newUser.username = username;
      newUser.first_name = first_name;
      newUser.last_name = last_name;
      newUser.password = password; // hashed in the model

      newUser.account_type = account_type as string;

      const user = await newUser.save();

      // generate token.
      const secret = process.env.JWT_SECRET_KEY;
      const token = JWT.sign({ id: user._id }, secret as string, {
        expiresIn: '1d'
      });

      const message = 'user account was created successfully';
      res.status(200).json({ error: false, message, token, data: user });
    } catch (error: any) {
      next(new HTTPException(500, error.message));
    }
  };

  /**************************************************
   * @desc      Signin user.
   * @route     POST /api/users/signin
   * @access    Public
   */
  private signin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user)
        return next(new HTTPException(400, 'Invalid user credentials.'));

      // compare passwords.
      const passwordCorrect = await user.isValidPassword(password, next);
      if (!passwordCorrect)
        return next(new HTTPException(400, 'Invalid user credentials.'));

      // generate token.
      const secret = process.env.JWT_SECRET_KEY;
      const token = JWT.sign({ id: user._id }, secret as string, {
        expiresIn: '1d'
      });

      const message = 'user sign in success';
      res.status(200).json({ error: false, message, token, data: user });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Get currently logged-in user.
   * @route     GET /api/users/me
   * @access    Protected
   */
  private getCurrentUser = (
    req: Request,
    res: Response,
    next: NextFunction
  ): Response | void => {
    try {
      if (!req.user) return next(new HTTPException(404, 'No logged in user'));

      res.status(200).json({ data: req.user });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

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
        .json({ error: false, count: users.length, pagination, data: users });
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
      res.status(200).json({ error: false, message, data: user });
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
      res.status(200).json({ error: false, message });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Forgot password
   * @route     POST /api/users/forgotpassword
   * @access    Protected
   */
  private forgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user)
        return next(
          new HTTPException(400, 'Email not valid, provide correct email')
        );
      // generate token to send back to user
      // const token = createToken(user, '60m');
      user.set('verificationToken');
      // send user email containing the verification token

      const message = 'forgot password';
      res.status(200).json({ error: false, message });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**
   * @desc      Send forgot password email
   */

  /**
   * @desc      verify forgot password email
   */
  private verifyForgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const { token, password }: { token: string; password: string } = req.body;
      const decoded = (await verifyToken(token)) as Token;

      const user = await User.findById(decoded.id);
      if (!user) return next(new HTTPException(400, 'user not found'));

      user.password = password;
      user.set('verifyToken', '');

      await user.save();
      const message = 'password has been changed';
      return res.status(200).json({ error: false, message });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };
}
