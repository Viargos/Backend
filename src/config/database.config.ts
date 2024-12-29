import { registerAs } from '@nestjs/config';

export const DatabaseConfigName = 'database';

export interface DatabaseConfig {
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
}

export default registerAs(DatabaseConfigName, () => ({
  name: process.env.DB_NAME || '',
  host: process.env.DB_HOST || '',
  port: process.env.DB_PORT || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PWD || '',
  type: process.env.DB_TYPE || '',
}));
