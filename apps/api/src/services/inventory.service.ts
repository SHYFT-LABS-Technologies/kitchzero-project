import { prisma } from '../lib/prisma';
import { calculateFifoDeduction, getLowStockItems, getExpiringItems, calculateInventoryValue } from '@kitchzero/utils';
import { InventoryItem, InventoryUnit, PaginatedResponse } from '@kitchzero/types';

export class InventoryService {
  async createInventoryItem(data: any) {
    return prisma.inventoryItem.create({
      data: {
        name: data.name || data.itemName,
        category: data.category,
        unit: data.unit,
        quantity: parseFloat(data.quantity),
        cost: parseFloat(data.cost),
        supplier: data.supplier,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        expiryDate: new Date(data.expiryDate),
        location: data.location,
        notes: data.notes,
        tenantId: data.tenantId,
        branchId: data.branchId
      }
    });
  }
  
  async getInventoryItems(
    tenantId: string,
    branchId?: string,
    filters?: {
      unit?: InventoryUnit;
      lowStock?: boolean;
      expiringSoon?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<InventoryItem>> {
    const where: any = { tenantId };
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (filters?.unit) {
      where.unit = filters.unit;
    }
    
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    
    let items = await prisma.inventoryItem.findMany({
      where,
      orderBy: [
        { name: 'asc' },
        { createdAt: 'asc' }
      ],
      skip,
      take: limit
    });
    
    const total = await prisma.inventoryItem.count({ where });
    
    if (filters?.lowStock) {
      const lowStockItems = getLowStockItems(items as any[]);
      items = items.filter(item => 
        lowStockItems.some(lowItem => 
          lowItem.name === item.name && lowItem.unit === item.unit
        )
      );
    }
    
    if (filters?.expiringSoon) {
      const expiringItems = getExpiringItems(items as any[], 7);
      items = items.filter(item => 
        expiringItems.some(expItem => expItem.id === item.id)
      );
    }
    
    return {
      items: items as InventoryItem[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
  
  async updateInventoryItem(
    id: string,
    data: {
      quantity?: number;
      cost?: number;
      expiryDate?: Date;
    },
    tenantId: string
  ) {
    return prisma.inventoryItem.update({
      where: { id, tenantId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }
  
  async deleteInventoryItem(id: string, tenantId: string) {
    return prisma.inventoryItem.delete({
      where: { id, tenantId }
    });
  }
  
  async deductInventory(
    itemName: string,
    unit: string,
    quantity: number,
    tenantId: string,
    branchId: string
  ) {
    const availableInventory = await prisma.inventoryItem.findMany({
      where: {
        name: itemName,
        unit,
        tenantId,
        branchId,
        quantity: { gt: 0 }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    const deductions = calculateFifoDeduction(
      availableInventory as any[],
      itemName,
      quantity,
      unit
    );
    
    if (deductions.length === 0) {
      throw new Error(`Insufficient ${itemName} inventory`);
    }
    
    const totalAvailable = deductions.reduce((sum, d) => sum + d.quantityUsed, 0);
    if (totalAvailable < quantity) {
      throw new Error(`Insufficient ${itemName} inventory. Need ${quantity}, have ${totalAvailable}`);
    }
    
    await prisma.$transaction(async (tx) => {
      for (const deduction of deductions) {
        const item = availableInventory.find(i => i.id === deduction.batchId);
        if (!item) continue;
        
        if (deduction.remainingQuantity <= 0) {
          await tx.inventoryItem.delete({
            where: { id: item.id }
          });
        } else {
          await tx.inventoryItem.update({
            where: { id: item.id },
            data: { quantity: deduction.remainingQuantity }
          });
        }
      }
    });
    
    return deductions;
  }
  
  async getInventoryStats(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    
    const inventory = await prisma.inventoryItem.findMany({ where });
    
    const totalValue = calculateInventoryValue(inventory as any[]);
    const lowStockItems = getLowStockItems(inventory as any[]);
    const expiringItems = getExpiringItems(inventory as any[], 7);
    const expiredItems = inventory.filter(item => item.expiryDate < new Date());
    
    return {
      totalItems: inventory.length,
      totalValue,
      lowStockCount: lowStockItems.length,
      expiringCount: expiringItems.length,
      expiredCount: expiredItems.length,
      lowStockItems: lowStockItems.slice(0, 10),
      expiringItems: expiringItems.slice(0, 10)
    };
  }
  
  async getInventoryByItem(
    itemName: string,
    tenantId: string,
    branchId?: string
  ) {
    const where: any = { name: itemName, tenantId };
    if (branchId) where.branchId = branchId;
    
    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });
    
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
    const avgCostPerUnit = totalQuantity > 0 ? totalValue / totalQuantity : 0;
    
    return {
      items,
      summary: {
        totalQuantity,
        totalValue,
        avgCostPerUnit,
        batchCount: items.length
      }
    };
  }

  // Stock management methods removed - now handled by StockLevelService
}