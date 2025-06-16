import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from '@kitchzero/config';
import { authRoutes } from './routes/auth.routes';
import { inventoryRoutes } from './routes/inventory.routes';
import { recipeRoutes } from './routes/recipe.routes';
import { wasteRoutes } from './routes/waste.routes';
import { approvalRoutes } from './routes/approval.routes';

const fastify = Fastify({
  logger: {
    level: env.LOG_LEVEL
  }
});

async function buildApp() {
  await fastify.register(helmet, {
    contentSecurityPolicy: false
  });
  
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });
  
  await fastify.register(jwt, {
    secret: env.JWT_SECRET
  });
  
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: env.RATE_LIMIT_WINDOW_MS
  });
  
  fastify.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    };
  });

  // Add error handler
  fastify.setErrorHandler((error, request, reply) => {
    console.error('🚨 Fastify error:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method
    });
    
    reply.status(500).send({
      success: false,
      error: 'Internal server error'
    });
  });

  // Add 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    console.log('❓ Route not found:', request.method, request.url);
    reply.status(404).send({
      success: false,
      error: 'Route not found',
      method: request.method,
      url: request.url
    });
  });
  
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(inventoryRoutes, { prefix: '/api' });
  await fastify.register(recipeRoutes, { prefix: '/api' });
  await fastify.register(wasteRoutes, { prefix: '/api' });
  await fastify.register(approvalRoutes, { prefix: '/api' });
  
  return fastify;
}

async function start() {
  try {
    const app = await buildApp();
    
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0'
    });
    
    console.log(`🚀 KitchZero API server running on port ${env.PORT}`);
    console.log(`📊 Environment: ${env.NODE_ENV}`);
    console.log(`🔍 Health check: http://localhost:${env.PORT}/health`);
    
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { buildApp };