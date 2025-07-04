import { FastifyInstance } from 'fastify';
import { WasteService } from '../services/waste.service';
import { authenticate, requireBranchAccess } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { CreateWasteLogSchema, WasteLogFiltersSchema } from '@kitchzero/schemas';
import { z } from 'zod';

const WasteParamsSchema = z.object({
  tenantId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  wasteLogId: z.string().uuid().optional()
});

const UpdateWasteLogSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
  tags: z.array(z.string()).optional()
});

const WasteStatsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  days: z.string().optional() // Will be converted to number in handler
});

export async function wasteRoutes(fastify: FastifyInstance) {
  const wasteService = new WasteService();
  
  fastify.post('/tenants/:tenantId/branches/:branchId/waste-logs', {
    preHandler: [
      authenticate,
      validateParams(WasteParamsSchema.extend({ branchId: z.string().uuid() })),
      requireBranchAccess(),
      validateBody(CreateWasteLogSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, branchId } = request.params as any;
      const wasteData = {
        ...(request.body as any),
        tenantId,
        branchId,
        loggedBy: request.user!.userId
      };
      
      const wasteLog = await wasteService.createWasteLog(wasteData);
      
      return reply.status(201).send({
        success: true,
        data: wasteLog
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create waste log'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/waste-logs', {
    preHandler: [
      authenticate,
      validateParams(WasteParamsSchema),
      validateQuery(WasteLogFiltersSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const filters = request.query as any;
      
      if (request.user!.role === 'BRANCH_ADMIN') {
        filters.branchId = request.user!.branchId;
      }
      
      if (filters.startDate) filters.startDate = new Date(filters.startDate);
      if (filters.endDate) filters.endDate = new Date(filters.endDate);
      
      // Handle days parameter
      if (filters.days && !filters.startDate && !filters.endDate) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(filters.days));
        filters.startDate = startDate;
        filters.endDate = endDate;
      }

      // Convert page and limit to numbers
      if (filters.page) filters.page = parseInt(filters.page);
      if (filters.limit) filters.limit = parseInt(filters.limit);

      // Convert preventable string to boolean
      if (filters.preventable === 'true') {
        filters.preventable = true;
      } else if (filters.preventable === 'false') {
        filters.preventable = false;
      } else {
        delete filters.preventable;
      }
      
      const result = await wasteService.getWasteLogs(tenantId, filters.branchId, filters);
      
      return reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch waste logs'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/branches/:branchId/waste-logs', {
    preHandler: [
      authenticate,
      validateParams(WasteParamsSchema.extend({ branchId: z.string().uuid() })),
      requireBranchAccess(),
      validateQuery(WasteLogFiltersSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, branchId } = request.params as any;
      const filters = { ...(request.query as any), branchId };
      
      if (filters.startDate) filters.startDate = new Date(filters.startDate);
      if (filters.endDate) filters.endDate = new Date(filters.endDate);
      
      // Handle days parameter
      if (filters.days && !filters.startDate && !filters.endDate) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(filters.days));
        filters.startDate = startDate;
        filters.endDate = endDate;
      }

      // Convert page and limit to numbers
      if (filters.page) filters.page = parseInt(filters.page);
      if (filters.limit) filters.limit = parseInt(filters.limit);

      // Convert preventable string to boolean
      if (filters.preventable === 'true') {
        filters.preventable = true;
      } else if (filters.preventable === 'false') {
        filters.preventable = false;
      } else {
        delete filters.preventable;
      }
      
      const result = await wasteService.getWasteLogs(tenantId, filters.branchId, filters);
      
      return reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch waste logs'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/waste-logs/:wasteLogId', {
    preHandler: [
      authenticate,
      validateParams(WasteParamsSchema.extend({ wasteLogId: z.string().uuid() }))
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, wasteLogId } = request.params as any;
      
      const wasteLog = await wasteService.getWasteLogById(wasteLogId, tenantId);
      
      if (request.user!.role === 'BRANCH_ADMIN' && 
          wasteLog.branchId !== request.user!.branchId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this waste log'
        });
      }
      
      return reply.status(200).send({
        success: true,
        data: wasteLog
      });
    } catch (error) {
      return reply.status(404).send({
        success: false,
        error: error instanceof Error ? error.message : 'Waste log not found'
      });
    }
  });
  
  fastify.put('/tenants/:tenantId/waste-logs/:wasteLogId', {
    preHandler: [
      authenticate,
      validateParams(WasteParamsSchema.extend({ wasteLogId: z.string().uuid() })),
      validateBody(UpdateWasteLogSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, wasteLogId } = request.params as any;
      const updateData = request.body as any;
      
      if (request.user!.role === 'BRANCH_ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Branch admins must submit approval requests for waste log updates'
        });
      }
      
      const wasteLog = await wasteService.updateWasteLog(wasteLogId, updateData, tenantId);
      
      return reply.status(200).send({
        success: true,
        data: wasteLog
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update waste log'
      });
    }
  });
  
  fastify.delete('/tenants/:tenantId/waste-logs/:wasteLogId', {
    preHandler: [
      authenticate,
      validateParams(WasteParamsSchema.extend({ wasteLogId: z.string().uuid() }))
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, wasteLogId } = request.params as any;
      
      if (request.user!.role === 'BRANCH_ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Branch admins must submit approval requests for waste log deletion'
        });
      }
      
      await wasteService.deleteWasteLog(wasteLogId, tenantId);
      
      return reply.status(200).send({
        success: true,
        message: 'Waste log deleted successfully'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete waste log'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/waste-stats', {
    preHandler: [
      authenticate,
      validateParams(WasteParamsSchema),
      validateQuery(WasteStatsQuerySchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const { branchId, startDate, endDate, days } = request.query as any;
      
      const userBranchId = request.user!.role === 'BRANCH_ADMIN' ? request.user!.branchId : branchId;
      
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;
      
      if (startDate && endDate) {
        dateFrom = new Date(startDate);
        dateTo = new Date(endDate);
      } else if (days) {
        dateTo = new Date();
        dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - parseInt(days));
      }
      
      const analytics = await wasteService.getWasteAnalytics(tenantId, userBranchId, dateFrom, dateTo);
      
      return reply.status(200).send({
        success: true,
        data: analytics
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch waste stats'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/waste-trends', {
    preHandler: [
      authenticate,
      validateParams(WasteParamsSchema),
      validateQuery(WasteStatsQuerySchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const { branchId, days } = request.query as any;
      
      const userBranchId = request.user!.role === 'BRANCH_ADMIN' ? request.user!.branchId : branchId;
      
      const trends = await wasteService.getWasteTrends(
        tenantId,
        userBranchId,
        days ? parseInt(days) : 30
      );
      
      return reply.status(200).send({
        success: true,
        data: trends
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch waste trends'
      });
    }
  });
}