import 'dotenv/config';
import validateEnv from './utils/validateEnv';
import App from './app';
import { AuthController } from './controllers/authController';
import { StoresController } from './controllers/storeController';
import { ProductsController } from './controllers/productsController';

validateEnv();

const app = new App(
  [new AuthController(), new StoresController(), new ProductsController()],
  Number(process.env.PORT)
);
app.listen();
