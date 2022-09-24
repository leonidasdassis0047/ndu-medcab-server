import 'dotenv/config';
import validateEnv from './utils/validateEnv';
import App from './app';
import { AuthController } from './controllers/authController';
import { StoresController } from './controllers/storeController';
import { ProductsController } from './controllers/productsController';
import { OrdersController } from './controllers/ordersController';

validateEnv();

const app = new App(
  [
    new AuthController(),
    new OrdersController(),
    new ProductsController(),
    new StoresController()
  ],
  Number(process.env.PORT)
);
app.listen();
