import { Router, Request, Response, NextFunction } from 'express';
import { IController } from '../interfaces/Controller';
import HTTPException from '../utils/HTTPException';
import { Order, OrderItem } from '../models/Order';
import { Types } from 'mongoose';
import { AuthenticationMiddleware } from '../middlewares';
import { IProduct } from '../interfaces/Product';

export class OrdersController implements IController {
  public path = '/orders';
  public router = Router();

  constructor() {
    this.initialiseRoutes();
  }

  private initialiseRoutes(): void {
    this.router.get(`${this.path}`, this.getOrders);
    this.router.get(`${this.path}/:order_id`, this.readOrderDetails);
    this.router.put(`${this.path}/:order_id/status_update`, this.deleteOrder);
    this.router.delete(`${this.path}/:order_id`, this.deleteOrder);

    this.router.post(
      `${this.path}`,
      AuthenticationMiddleware,
      this.placeNewOrder
    );
  }

  /**************************************************
   * @desc      Get orders with filtering, pagination, sorting ...
   * @route     GET /api/orders/
   * @access    Protected
   */
  private getOrders = async (
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

      let query = Order.find(JSON.parse(queryStr));

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
      const docTotal = await Order.countDocuments();

      query = query.skip(startIndex).limit(limit);

      // Execute the query.
      const orders = await query;

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
        .json({ error: false, count: orders.length, pagination, data: orders });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /******************************************************************
   * @desc      Get order details
   * @route     GET /api/orders/:order_id
   * @access    Protected
   */
  private readOrderDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const order = await Order.findById(req.params.order_id)
        .populate({
          path: 'user',
          select: 'first_name last_name email'
        })
        .populate({
          path: 'order_items',
          populate: [{ path: 'item', model: 'Product' }]
        });

      if (!order) return next(new HTTPException(404, 'order not found'));

      const message = `details for order: ${order._id}`;
      return res.status(200).json({ error: false, message, data: order });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Delete order
   * @route     DELETE /api/orders/:order_id
   * @access    Protected
   */
  private deleteOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      let order = await Order.findById(req.params.order_id);
      if (!order) return next(new HTTPException(404, 'order not found'));

      order = await order.remove();

      const message = `delete order: ${order._id} success`;
      return res.status(200).json({ error: false, message, data: order });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Update order status
   * @route     PUT /api/orders/:order_id/status_update
   * @access    Protected
   */
  private updateOrderStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (!req.query.status)
        return next(new HTTPException(404, 'provide status update'));

      let order = await Order.findById(req.params.order_id);
      if (!order) return next(new HTTPException(404, 'order not found'));

      order.status = req.query.status as string;
      order = await order.save();

      const message = `delete order: ${order._id} success`;
      return res.status(200).json({ error: false, message, data: order });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };

  /**************************************************
   * @desc      Placing new order to a given store
   * @route     POST /api/orders/?store=xxxx
   * @access    Protected, CUSTOMER can place order
   */
  private placeNewOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (!req.user)
        return next(
          new HTTPException(403, 'authentication required to place order')
        );
      if (!req.query.store)
        return next(
          new HTTPException(400, 'provide store to which this order goes to')
        );

      let order = new Order();
      const placedItems: Array<{ quantity: number; id: Types.ObjectId }> =
        req.body.items;

      const orderItems = placedItems.map(async (item) => {
        let orderItem = new OrderItem({
          item: item.id as Types.ObjectId,
          quantity: item.quantity
        });
        orderItem = await orderItem.save();
        return orderItem._id;
      });

      order.order_items = await Promise.all([...orderItems]);

      // calculate order total
      const orderItemsTotals = order.order_items.map(async (id) => {
        const order_item = await OrderItem.findById(id).populate<{
          item: IProduct & { actual_price: number };
        }>({ path: 'item' });
        if (!order_item) {
          throw new HTTPException(404, 'order item not found');
        } else {
          return order_item?.quantity * order_item?.item?.actual_price;
        }
      });

      order.total = (await Promise.all([...orderItemsTotals])).reduce(
        (a, b) => a + b,
        0
      );

      // store and user details.
      order.user = req.user?._id;
      order.store = (await order.getStoreDetails(
        req.query.store as string
      )) as Types.ObjectId;

      // save order here.
      order = await order.save();

      const message = `new order placed successfully`;
      return res.status(200).json({ error: false, message, data: order });
    } catch (error: any) {
      next(new HTTPException(500, error?.message));
    }
  };
}
