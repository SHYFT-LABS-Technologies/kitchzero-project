import { config } from 'dotenv-safe';
import path from 'path';

// Only load config if not already loaded
if (!process.env.DATABASE_URL) {
  try {
    config({
      path: path.resolve(process.cwd(), '.env'),
      example: path.resolve(process.cwd(), '.env.example'),
      allowEmptyValues: false
    });
  } catch (error) {
    console.warn('Could not load .env file:', error);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  
  DATABASE_URL: process.env.DATABASE_URL!,
  
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  ADMIN_CLI_SECRET: process.env.ADMIN_CLI_SECRET!,
} as const;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export default env;