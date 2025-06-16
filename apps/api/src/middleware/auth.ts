import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, JWTPayload } from '@kitchzero/utils';
import { env } from '@kitchzero/config';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token, env.JWT_SECRET);
    
    request.user = payload;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
  };
}

export function requireTenantAccess() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    
    const tenantId = (request.params as any).tenantId;
    
    if (request.user.role !== 'KITCHZERO_ADMIN' && request.user.tenantId !== tenantId) {
      return reply.status(403).send({ error: 'Access denied to this tenant' });
    }
  };
}

export function requireBranchAccess() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    
    const branchId = (request.params as any).branchId;
    
    if (request.user.role === 'KITCHZERO_ADMIN') return;
    if (request.user.role === 'RESTAURANT_ADMIN' && request.user.tenantId) return;
    if (request.user.role === 'BRANCH_ADMIN' && request.user.branchId === branchId) return;
    
    return reply.status(403).send({ error: 'Access denied to this branch' });
  };
}