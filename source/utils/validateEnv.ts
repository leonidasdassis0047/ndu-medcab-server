import { cleanEnv, str, port } from 'envalid';

function validateEnv(): void {
  cleanEnv(process.env, {
    NODE_ENV: str({
      choices: ['development', 'production']
    }),
    DB_PASS: str(),
    DB_PATH: str(),
    DB_USER: str(),
    PORT: port({ default: 3000 }),
    JWT_SECRET_KEY: str()
  });
}

export default validateEnv;
