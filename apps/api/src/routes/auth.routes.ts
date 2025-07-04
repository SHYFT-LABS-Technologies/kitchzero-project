import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service';
import { validateBody } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { LoginSchema, ChangePasswordSchema, ResetPasswordSchema } from '@kitchzero/schemas';
import { z } from 'zod';

const RefreshTokenSchema = z.object({
  refreshToken: z.string()
});

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();
  
  // Rate limiting for login endpoint only
  await fastify.register(async function(fastify) {
    await fastify.register(require('@fastify/rate-limit'), {
      max: 100, // 100 login attempts per window
      timeWindow: 15 * 60 * 1000, // 15 minutes
      errorResponseBuilder: function (request, context) {
        return {
          success: false,
          error: `Too many login attempts. Please try again in ${Math.ceil(context.ttl / 1000 / 60)} minutes.`,
          retryAfter: context.ttl
        };
      }
    });
    
    fastify.post('/login', {
      preHandler: [validateBody(LoginSchema)]
    }, async (request, reply) => {
      try {
        const result = await authService.login(request.body as any);
        
        if (result.mustChangePassword) {
          return reply.status(200).send({
            success: true,
            message: 'Password change required',
            mustChangePassword: true,
            user: result.user,
            tokens: result.tokens
          });
        }
        
        return reply.status(200).send({
          success: true,
          user: result.user,
          tokens: result.tokens
        });
      } catch (error) {
        return reply.status(401).send({
          success: false,
          error: error instanceof Error ? error.message : 'Login failed'
        });
      }
    });

    // Rate limit refresh tokens as well (prevent token farming)
    fastify.post('/refresh', {
      preHandler: [validateBody(RefreshTokenSchema)]
    }, async (request, reply) => {
      try {
        const { refreshToken } = request.body as any;
        const tokens = await authService.refreshTokens(refreshToken);
        
        return reply.status(200).send({
          success: true,
          tokens
        });
      } catch (error) {
        return reply.status(401).send({
          success: false,
          error: error instanceof Error ? error.message : 'Token refresh failed'
        });
      }
    });
  });
  
  fastify.post('/change-password', {
    preHandler: [authenticate, validateBody(ChangePasswordSchema)]
  }, async (request, reply) => {
    try {
      await authService.changePassword(request.user!.userId, request.body as any);
      
      return reply.status(200).send({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed'
      });
    }
  });
  
  // Light rate limiting for password reset to prevent abuse
  await fastify.register(async function(fastify) {
    await fastify.register(require('@fastify/rate-limit'), {
      max: 20, // 20 reset attempts per window
      timeWindow: 60 * 60 * 1000, // 1 hour
      errorResponseBuilder: function (request, context) {
        return {
          success: false,
          error: `Too many password reset attempts. Please try again in ${Math.ceil(context.ttl / 1000 / 60)} minutes.`,
          retryAfter: context.ttl
        };
      }
    });

    fastify.post('/reset-password', {
      preHandler: [validateBody(ResetPasswordSchema)]
    }, async (request, reply) => {
    try {
      await authService.resetPassword(request.body as any);
      
      return reply.status(200).send({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed'
      });
    }
    });
  });
  
  // refresh endpoint is now in the rate-limited section above
  
  fastify.post('/logout', {
    preHandler: [validateBody(RefreshTokenSchema)]
  }, async (request, reply) => {
    try {
      const { refreshToken } = request.body as any;
      await authService.logout(refreshToken);
      
      return reply.status(200).send({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      });
    }
  });
  
  fastify.get('/me', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    return reply.status(200).send({
      success: true,
      user: request.user
    });
  });
}