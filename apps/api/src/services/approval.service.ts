import { prisma } from '../lib/prisma';
import { ApprovalRequest, ActionType, ApprovalStatus, PaginatedResponse } from '@kitchzero/types';
import { InventoryService } from './inventory.service';
import { WasteService } from './waste.service';

export class ApprovalService {
  private inventoryService = new InventoryService();
  private wasteService = new WasteService();
  
  async createApprovalRequest(data: {
    actionType: ActionType;
    reasonForRequest: string;
    originalData: Record<string, any>;
    proposedData: Record<string, any>;
    submittedBy: string;
    tenantId: string;
    branchId: string;
  }) {
    return prisma.approvalRequest.create({
      data: {
        actionType: data.actionType,
        reasonForRequest: data.reasonForRequest,
        originalData: data.originalData,
        proposedData: data.proposedData,
        submittedBy: data.submittedBy,
        reviewStatus: 'PENDING',
        tenantId: data.tenantId,
        branchId: data.branchId
      },
      include: {
        submittedByUser: {
          select: { username: true, role: true }
        },
        branch: {
          select: { name: true }
        }
      }
    });
  }
  
  async getApprovalRequests(
    tenantId: string,
    filters?: {
      branchId?: string;
      reviewStatus?: ApprovalStatus;
      actionType?: ActionType;
      submittedBy?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<ApprovalRequest>> {
    const where: any = { tenantId };
    
    if (filters?.branchId) {
      where.branchId = filters.branchId;
    }
    
    if (filters?.reviewStatus) {
      where.reviewStatus = filters.reviewStatus;
    }
    
    if (filters?.actionType) {
      where.actionType = filters.actionType;
    }
    
    if (filters?.submittedBy) {
      where.submittedBy = filters.submittedBy;
    }
    
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
        include: {
          submittedByUser: {
            select: { username: true, role: true }
          },
          reviewedByUser: {
            select: { username: true, role: true }
          },
          branch: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.approvalRequest.count({ where })
    ]);
    
    return {
      items: items as any[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
  
  async getApprovalRequestById(id: string, tenantId: string) {
    const request = await prisma.approvalRequest.findFirst({
      where: { id, tenantId },
      include: {
        submittedByUser: {
          select: { username: true, role: true }
        },
        reviewedByUser: {
          select: { username: true, role: true }
        },
        branch: {
          select: { name: true, address: true }
        }
      }
    });
    
    if (!request) {
      throw new Error('Approval request not found');
    }
    
    return request;
  }
  
  async reviewApprovalRequest(
    id: string,
    data: {
      reviewStatus: 'APPROVED' | 'REJECTED';
      reviewComment?: string;
      reviewedBy: string;
    },
    tenantId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findFirst({
        where: { id, tenantId, reviewStatus: 'PENDING' }
      });
      
      if (!request) {
        throw new Error('Approval request not found or already reviewed');
      }
      
      const updatedRequest = await tx.approvalRequest.update({
        where: { id },
        data: {
          reviewStatus: data.reviewStatus,
          reviewComment: data.reviewComment,
          reviewedBy: data.reviewedBy,
          updatedAt: new Date()
        },
        include: {
          submittedByUser: {
            select: { username: true, role: true }
          },
          reviewedByUser: {
            select: { username: true, role: true }
          }
        }
      });
      
      if (data.reviewStatus === 'APPROVED') {
        await this.executeApprovedAction(request, tx);
      }
      
      return updatedRequest;
    });
  }
  
  private async executeApprovedAction(
    request: ApprovalRequest,
    tx: any
  ) {
    try {
      switch (request.actionType) {
        case 'UPDATE_INVENTORY':
          await this.executeInventoryUpdate(request, tx);
          break;
        case 'DELETE_INVENTORY':
          await this.executeInventoryDeletion(request, tx);
          break;
        case 'UPDATE_WASTE_LOG':
          await this.executeWasteLogUpdate(request, tx);
          break;
        case 'DELETE_WASTE_LOG':
          await this.executeWasteLogDeletion(request, tx);
          break;
      }
    } catch (error) {
      console.error('Failed to execute approved action:', error);
      throw new Error('Failed to execute approved action');
    }
  }
  
  private async executeInventoryUpdate(request: ApprovalRequest, tx: any) {
    const { itemId } = request.originalData;
    const updateData = request.proposedData;
    
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }
    
    await tx.inventoryItem.update({
      where: { id: itemId, tenantId: request.tenantId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
  }
  
  private async executeInventoryDeletion(request: ApprovalRequest, tx: any) {
    const { itemId } = request.originalData;
    
    await tx.inventoryItem.delete({
      where: { id: itemId, tenantId: request.tenantId }
    });
  }
  
  private async executeWasteLogUpdate(request: ApprovalRequest, tx: any) {
    const { wasteLogId } = request.originalData;
    const updateData = request.proposedData;
    
    await tx.wasteLog.update({
      where: { id: wasteLogId, tenantId: request.tenantId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
  }
  
  private async executeWasteLogDeletion(request: ApprovalRequest, tx: any) {
    const { wasteLogId } = request.originalData;
    
    await tx.wasteLog.delete({
      where: { id: wasteLogId, tenantId: request.tenantId }
    });
  }
  
  async submitInventoryUpdateRequest(
    itemId: string,
    updateData: Record<string, any>,
    reason: string,
    submittedBy: string,
    tenantId: string,
    branchId: string
  ) {
    const originalItem = await prisma.inventoryItem.findFirst({
      where: { id: itemId, tenantId }
    });
    
    if (!originalItem) {
      throw new Error('Inventory item not found');
    }
    
    return this.createApprovalRequest({
      actionType: 'UPDATE_INVENTORY',
      reasonForRequest: reason,
      originalData: { itemId, ...originalItem },
      proposedData: updateData,
      submittedBy,
      tenantId,
      branchId
    });
  }
  
  async submitInventoryDeleteRequest(
    itemId: string,
    reason: string,
    submittedBy: string,
    tenantId: string,
    branchId: string
  ) {
    const originalItem = await prisma.inventoryItem.findFirst({
      where: { id: itemId, tenantId }
    });
    
    if (!originalItem) {
      throw new Error('Inventory item not found');
    }
    
    return this.createApprovalRequest({
      actionType: 'DELETE_INVENTORY',
      reasonForRequest: reason,
      originalData: { itemId, ...originalItem },
      proposedData: {},
      submittedBy,
      tenantId,
      branchId
    });
  }
  
  async submitWasteLogUpdateRequest(
    wasteLogId: string,
    updateData: Record<string, any>,
    reason: string,
    submittedBy: string,
    tenantId: string,
    branchId: string
  ) {
    const originalLog = await prisma.wasteLog.findFirst({
      where: { id: wasteLogId, tenantId }
    });
    
    if (!originalLog) {
      throw new Error('Waste log not found');
    }
    
    return this.createApprovalRequest({
      actionType: 'UPDATE_WASTE_LOG',
      reasonForRequest: reason,
      originalData: { wasteLogId, ...originalLog },
      proposedData: updateData,
      submittedBy,
      tenantId,
      branchId
    });
  }
  
  async submitWasteLogDeleteRequest(
    wasteLogId: string,
    reason: string,
    submittedBy: string,
    tenantId: string,
    branchId: string
  ) {
    const originalLog = await prisma.wasteLog.findFirst({
      where: { id: wasteLogId, tenantId }
    });
    
    if (!originalLog) {
      throw new Error('Waste log not found');
    }
    
    return this.createApprovalRequest({
      actionType: 'DELETE_WASTE_LOG',
      reasonForRequest: reason,
      originalData: { wasteLogId, ...originalLog },
      proposedData: {},
      submittedBy,
      tenantId,
      branchId
    });
  }
  
  async getPendingRequestsCount(tenantId: string, branchId?: string) {
    const where: any = { tenantId, reviewStatus: 'PENDING' };
    if (branchId) where.branchId = branchId;
    
    return prisma.approvalRequest.count({ where });
  }
  
  async getApprovalStats(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.approvalRequest.count({ where }),
      prisma.approvalRequest.count({ where: { ...where, reviewStatus: 'PENDING' } }),
      prisma.approvalRequest.count({ where: { ...where, reviewStatus: 'APPROVED' } }),
      prisma.approvalRequest.count({ where: { ...where, reviewStatus: 'REJECTED' } })
    ]);
    
    const byActionType = await prisma.approvalRequest.groupBy({
      by: ['actionType'],
      where,
      _count: { actionType: true }
    });
    
    return {
      total,
      pending,
      approved,
      rejected,
      byActionType: byActionType.reduce((acc, item) => {
        acc[item.actionType] = item._count.actionType;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}