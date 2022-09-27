import 'dotenv/config';
import validateEnv from './utils/validateEnv';
import App from './app';

import { AuthController } from './controllers/authController';
import { StoresController } from './controllers/storeController';
import { ProductsController } from './controllers/productsController';
import { OrdersController } from './controllers/ordersController';
import { CategoriesController } from './controllers/categoriesController';
import { UserController } from './controllers/usersController';

validateEnv();

const app = new App(
  [
    new AuthController(),
    new CategoriesController(),
    new OrdersController(),
    new ProductsController(),
    new StoresController(),
    new UserController()
  ],
  Number(process.env.PORT)
);
app.listen();
