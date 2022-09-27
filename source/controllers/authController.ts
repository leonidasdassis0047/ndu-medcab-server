import { Router, Request, Response, NextFunction } from 'express';
import JWT from 'jsonwebtoken';

import { IController } from '../interfaces/Controller';
import Validations from '../validations/users';
import HTTPException from '../utils/HTTPException';
import { verifyToken } from '../services/tokens';
import { Token } from '../interfaces/Token';
import { User } from '../models/User';
import { AuthenticationMiddleware, ValidationMiddleware } from '../middlewares';

export class AuthController implements IController {
  public path = '/auth';
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
      `${this.path}/me`,
      AuthenticationMiddleware,
      this.getCurrentUser
    );
  }

  /**************************************************
   * @desc      Create a new user.
   * @route     POST /api/auth/signup
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

      const { email, username, password, phone } = req.body;
      const newUser = new User();

      newUser.email = email;
      newUser.username = username;
      newUser.phones.push(phone);
      newUser.password = password; // hashed in the model
      newUser.account_type = account_type as string;

      const user = await newUser.save();

      res.status(200).send(user);
    } catch (error: any) {
      next(new HTTPException(500, error.message));
    }
  };

  /**************************************************
   * @desc      Signin user.
   * @route     POST /api/auth/signin
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
      if (!user) return next(new HTTPException(400, 'Email address not found'));

      // compare passwords.
      const passwordCorrect = await user.isValidPassword(password, next);
      if (!passwordCorrect)
        return next(
          new HTTPException(400, 'Please provide correct credentials')
        );

      // generate token.
      const secret = process.env.JWT_SECRET_KEY;
      const token = JWT.sign(
        { id: user._id, username: user.username, email: user.email },
        secret as string,
        {
          expiresIn: '1d'
        }
      );

      res.status(200).send(token);
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Get currently logged-in user.
   * @route     GET /api/auth/me
   * @access    Protected
   */
  private getCurrentUser = (
    req: Request,
    res: Response,
    next: NextFunction
  ): Response | void => {
    try {
      if (!req.user) return next(new HTTPException(404, 'No logged in user'));

      res.status(200).send(req.user);
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
