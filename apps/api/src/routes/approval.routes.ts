import { FastifyInstance } from 'fastify';
import { ApprovalService } from '../services/approval.service';
import { authenticate, requireTenantAccess, requireRole } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { ReviewApprovalRequestSchema, CreateApprovalRequestSchema } from '@kitchzero/schemas';
import { z } from 'zod';

const ApprovalParamsSchema = z.object({
  tenantId: z.string().uuid(),
  requestId: z.string().uuid().optional()
});

const ApprovalFiltersSchema = z.object({
  branchId: z.string().uuid().optional(),
  reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  actionType: z.enum(['UPDATE_INVENTORY', 'DELETE_INVENTORY', 'UPDATE_WASTE_LOG', 'DELETE_WASTE_LOG']).optional(),
  submittedBy: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
});

const SubmitRequestSchema = z.object({
  reason: z.string().min(1).max(500),
  updateData: z.record(z.any()).optional()
});

export async function approvalRoutes(fastify: FastifyInstance) {
  const approvalService = new ApprovalService();
  
  fastify.get('/tenants/:tenantId/approval-requests', {
    preHandler: [
      authenticate,
      validateParams(ApprovalParamsSchema),
      requireTenantAccess(),
      validateQuery(ApprovalFiltersSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const filters = request.query as any;
      
      if (request.user!.role === 'BRANCH_ADMIN') {
        filters.branchId = request.user!.branchId;
      }
      
      const result = await approvalService.getApprovalRequests(tenantId, filters);
      
      return reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch approval requests'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/approval-requests/:requestId', {
    preHandler: [
      authenticate,
      validateParams(ApprovalParamsSchema.extend({ requestId: z.string().uuid() })),
      requireTenantAccess()
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, requestId } = request.params as any;
      
      const approvalRequest = await approvalService.getApprovalRequestById(requestId, tenantId);
      
      if (request.user!.role === 'BRANCH_ADMIN' && 
          approvalRequest.branchId !== request.user!.branchId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this approval request'
        });
      }
      
      return reply.status(200).send({
        success: true,
        data: approvalRequest
      });
    } catch (error) {
      return reply.status(404).send({
        success: false,
        error: error instanceof Error ? error.message : 'Approval request not found'
      });
    }
  });
  
  fastify.post('/tenants/:tenantId/approval-requests/:requestId/review', {
    preHandler: [
      authenticate,
      validateParams(ApprovalParamsSchema.extend({ requestId: z.string().uuid() })),
      requireTenantAccess(),
      requireRole(['RESTAURANT_ADMIN', 'KITCHZERO_ADMIN']),
      validateBody(ReviewApprovalRequestSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, requestId } = request.params as any;
      const reviewData = {
        ...(request.body as any),
        reviewedBy: request.user!.userId
      };
      
      const result = await approvalService.reviewApprovalRequest(
        requestId,
        reviewData,
        tenantId
      );
      
      return reply.status(200).send({
        success: true,
        data: result,
        message: `Request ${reviewData.reviewStatus.toLowerCase()} successfully`
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to review approval request'
      });
    }
  });
  
  fastify.post('/tenants/:tenantId/inventory/:itemId/request-update', {
    preHandler: [
      authenticate,
      validateParams(z.object({
        tenantId: z.string().uuid(),
        itemId: z.string().uuid()
      })),
      requireTenantAccess(),
      requireRole(['BRANCH_ADMIN']),
      validateBody(SubmitRequestSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, itemId } = request.params as any;
      const { reason, updateData } = request.body as any;
      
      if (!updateData) {
        return reply.status(400).send({
          success: false,
          error: 'Update data is required'
        });
      }
      
      const result = await approvalService.submitInventoryUpdateRequest(
        itemId,
        updateData,
        reason,
        request.user!.userId,
        tenantId,
        request.user!.branchId!
      );
      
      return reply.status(201).send({
        success: true,
        data: result,
        message: 'Update request submitted for approval'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit update request'
      });
    }
  });
  
  fastify.post('/tenants/:tenantId/inventory/:itemId/request-delete', {
    preHandler: [
      authenticate,
      validateParams(z.object({
        tenantId: z.string().uuid(),
        itemId: z.string().uuid()
      })),
      requireTenantAccess(),
      requireRole(['BRANCH_ADMIN']),
      validateBody(z.object({ reason: z.string().min(1).max(500) }))
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, itemId } = request.params as any;
      const { reason } = request.body as any;
      
      const result = await approvalService.submitInventoryDeleteRequest(
        itemId,
        reason,
        request.user!.userId,
        tenantId,
        request.user!.branchId!
      );
      
      return reply.status(201).send({
        success: true,
        data: result,
        message: 'Delete request submitted for approval'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit delete request'
      });
    }
  });
  
  fastify.post('/tenants/:tenantId/waste-logs/:wasteLogId/request-update', {
    preHandler: [
      authenticate,
      validateParams(z.object({
        tenantId: z.string().uuid(),
        wasteLogId: z.string().uuid()
      })),
      requireTenantAccess(),
      requireRole(['BRANCH_ADMIN']),
      validateBody(SubmitRequestSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, wasteLogId } = request.params as any;
      const { reason, updateData } = request.body as any;
      
      if (!updateData) {
        return reply.status(400).send({
          success: false,
          error: 'Update data is required'
        });
      }
      
      const result = await approvalService.submitWasteLogUpdateRequest(
        wasteLogId,
        updateData,
        reason,
        request.user!.userId,
        tenantId,
        request.user!.branchId!
      );
      
      return reply.status(201).send({
        success: true,
        data: result,
        message: 'Update request submitted for approval'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit update request'
      });
    }
  });
  
  fastify.post('/tenants/:tenantId/waste-logs/:wasteLogId/request-delete', {
    preHandler: [
      authenticate,
      validateParams(z.object({
        tenantId: z.string().uuid(),
        wasteLogId: z.string().uuid()
      })),
      requireTenantAccess(),
      requireRole(['BRANCH_ADMIN']),
      validateBody(z.object({ reason: z.string().min(1).max(500) }))
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, wasteLogId } = request.params as any;
      const { reason } = request.body as any;
      
      const result = await approvalService.submitWasteLogDeleteRequest(
        wasteLogId,
        reason,
        request.user!.userId,
        tenantId,
        request.user!.branchId!
      );
      
      return reply.status(201).send({
        success: true,
        data: result,
        message: 'Delete request submitted for approval'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit delete request'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/approval-requests/pending/count', {
    preHandler: [
      authenticate,
      validateParams(ApprovalParamsSchema),
      requireTenantAccess()
    ]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const branchId = request.user!.role === 'BRANCH_ADMIN' ? request.user!.branchId : undefined;
      
      const count = await approvalService.getPendingRequestsCount(tenantId, branchId);
      
      return reply.status(200).send({
        success: true,
        data: { pendingCount: count }
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pending count'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/approval-requests/stats', {
    preHandler: [
      authenticate,
      validateParams(ApprovalParamsSchema),
      requireTenantAccess()
    ]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const branchId = request.user!.role === 'BRANCH_ADMIN' ? request.user!.branchId : undefined;
      
      const stats = await approvalService.getApprovalStats(tenantId, branchId);
      
      return reply.status(200).send({
        success: true,
        data: stats
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch approval stats'
      });
    }
  });
}