import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

async function buildApp() {
  await fastify.register(helmet, {
    contentSecurityPolicy: false
  });
  
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  });
  
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret'
  });
  
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10)
  });
  
  fastify.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    };
  });
  
  // Basic auth endpoint for testing
  fastify.post('/api/auth/test', async (request, reply) => {
    return reply.send({
      success: true,
      message: 'API is working',
      timestamp: new Date().toISOString()
    });
  });

  // Mock login endpoint for UI testing
  fastify.post('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body as any;
    
    // Simple mock authentication - in real app this would check database
    if (username === 'demo_admin' && password === 'password123') {
      const mockUser = {
        id: 'user_123',
        username: 'demo_admin',
        role: 'RESTAURANT_ADMIN',
        tenantId: 'tenant_123',
        branchId: 'branch_123',
        tenant: {
          id: 'tenant_123',
          name: 'Demo Restaurant'
        },
        branch: {
          id: 'branch_123',
          name: 'Main Branch'
        }
      };

      const mockTokens = {
        accessToken: 'mock-access-token-12345',
        refreshToken: 'mock-refresh-token-67890'
      };

      return reply.send({
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
          mustChangePassword: true // Force password change for demo
        }
      });
    }

    return reply.status(401).send({
      success: false,
      error: 'Invalid credentials'
    });
  });

  // Mock change password endpoint
  fastify.post('/api/auth/change-password', async (request, reply) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Missing authorization header'
      });
    }

    // Mock password change - always succeeds
    return reply.send({
      success: true,
      message: 'Password changed successfully'
    });
  });

  // Mock user info endpoint
  fastify.get('/api/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Missing authorization header'
      });
    }

    const mockUser = {
      userId: 'user_123',
      username: 'demo_admin',
      role: 'RESTAURANT_ADMIN',
      tenantId: 'tenant_123',
      branchId: 'branch_123'
    };

    return reply.send({
      success: true,
      user: mockUser
    });
  });
  
  return fastify;
}

async function start() {
  try {
    const app = await buildApp();
    
    const port = parseInt(process.env.PORT || '3001', 10);
    await app.listen({
      port,
      host: '0.0.0.0'
    });
    
    console.log(`🚀 KitchZero API server running on port ${port}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔍 Health check: http://localhost:${port}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${port}/api/auth/test`);
    
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { buildApp };