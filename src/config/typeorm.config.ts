import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// Parse the host from the DB_HOST which contains the full connection endpoint
const parseHost = (dbHost: string | undefined): string => {
  if (!dbHost) return 'localhost';
  // Extract host from "ep-damp-sky-aerflkll-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
  return dbHost.split('/')[0];
};

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: parseHost(process.env.DB_HOST),
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME?.trim(),
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: true,
  ssl: {
    rejectUnauthorized: false
  }
});
