import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

prisma.$use(async (params, next) => {
  if (params.model && params.model !== 'RefreshToken') {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};
      
      if (params.model !== 'Tenant' && params.args.where.tenantId === undefined) {
        throw new Error(`tenantId is required for ${params.model} ${params.action}`);
      }
    }
    
    if (['create', 'update', 'upsert'].includes(params.action)) {
      if (!params.args) params.args = {};
      if (!params.args.data) params.args.data = {};
      
      if (params.model !== 'Tenant' && !params.args.data.tenantId) {
        throw new Error(`tenantId is required for ${params.model} ${params.action}`);
      }
    }
  }
  
  return next(params);
});