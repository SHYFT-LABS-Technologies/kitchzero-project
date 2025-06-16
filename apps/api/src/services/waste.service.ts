import { prisma } from '../lib/prisma';
import { InventoryService } from './inventory.service';
import { RecipeService } from './recipe.service';
import { WasteLog, WasteType, InventoryUnit, PaginatedResponse } from '@kitchzero/types';
import { generateWasteTags, getSustainabilityInsights } from '@kitchzero/utils';

export class WasteService {
  private inventoryService = new InventoryService();
  private recipeService = new RecipeService();
  
  async createWasteLog(data: {
    itemName: string;
    quantity: number;
    unit: InventoryUnit;
    wasteType: WasteType;
    reason: string;
    recipeId?: string;
    tenantId: string;
    branchId: string;
    loggedBy: string;
  }) {
    return prisma.$transaction(async (tx) => {
      let cost = 0;
      let tags: string[] = [];
      
      if (data.wasteType === 'PRODUCT' && data.recipeId) {
        const recipe = await this.recipeService.getRecipeById(data.recipeId, data.tenantId);
        
        const totalQuantityNeeded = data.quantity;
        
        for (const ingredient of recipe.ingredients) {
          const quantityNeeded = (ingredient.quantity / recipe.portionSize) * totalQuantityNeeded;
          
          try {
            const deductions = await this.inventoryService.deductInventory(
              ingredient.itemName,
              ingredient.unit,
              quantityNeeded,
              data.tenantId,
              data.branchId
            );
            
            const ingredientCost = deductions.reduce((sum, d) => {
              const item = await tx.inventoryItem.findFirst({
                where: { batchId: d.batchId }
              });
              return sum + (item ? d.quantityUsed * item.cost : 0);
            }, 0);
            
            cost += ingredientCost;
            
          } catch (error) {
            console.warn(`Could not deduct ${ingredient.itemName} from inventory:`, error);
          }
        }
      } else if (data.wasteType === 'RAW') {
        try {
          const deductions = await this.inventoryService.deductInventory(
            data.itemName,
            data.unit,
            data.quantity,
            data.tenantId,
            data.branchId
          );
          
          cost = deductions.reduce((sum, d) => {
            const item = await tx.inventoryItem.findFirst({
              where: { batchId: d.batchId }
            });
            return sum + (item ? d.quantityUsed * item.cost : 0);
          }, 0);
          
        } catch (error) {
          const inventory = await tx.inventoryItem.findMany({
            where: {
              itemName: data.itemName,
              unit: data.unit,
              tenantId: data.tenantId,
              branchId: data.branchId
            },
            orderBy: { receivedAt: 'desc' },
            take: 1
          });
          
          if (inventory.length > 0) {
            cost = data.quantity * inventory[0].cost;
          }
        }
      }
      
      tags = generateWasteTags(data.reason, data.wasteType);
      
      const wasteLog = await tx.wasteLog.create({
        data: {
          itemName: data.itemName,
          quantity: data.quantity,
          unit: data.unit,
          cost,
          wasteType: data.wasteType,
          reason: data.reason,
          tags,
          recipeId: data.recipeId,
          tenantId: data.tenantId,
          branchId: data.branchId,
          loggedBy: data.loggedBy
        },
        include: {
          loggedByUser: {
            select: { username: true, role: true }
          },
          recipe: {
            select: { productName: true, portionSize: true }
          }
        }
      });
      
      return wasteLog;
    });
  }
  
  async getWasteLogs(
    tenantId: string,
    filters?: {
      branchId?: string;
      wasteType?: WasteType;
      tags?: string[];
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<WasteLog>> {
    const where: any = { tenantId };
    
    if (filters?.branchId) {
      where.branchId = filters.branchId;
    }
    
    if (filters?.wasteType) {
      where.wasteType = filters.wasteType;
    }
    
    if (filters?.tags?.length) {
      where.tags = {
        hasSome: filters.tags
      };
    }
    
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }
    
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.wasteLog.findMany({
        where,
        include: {
          loggedByUser: {
            select: { username: true, role: true }
          },
          recipe: {
            select: { productName: true, portionSize: true }
          },
          branch: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.wasteLog.count({ where })
    ]);
    
    return {
      items: items as any[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
  
  async getWasteLogById(id: string, tenantId: string) {
    const wasteLog = await prisma.wasteLog.findFirst({
      where: { id, tenantId },
      include: {
        loggedByUser: {
          select: { username: true, role: true }
        },
        recipe: {
          include: { ingredients: true }
        },
        branch: {
          select: { name: true, address: true }
        }
      }
    });
    
    if (!wasteLog) {
      throw new Error('Waste log not found');
    }
    
    return wasteLog;
  }
  
  async updateWasteLog(
    id: string,
    data: {
      reason?: string;
      tags?: string[];
    },
    tenantId: string
  ) {
    let tags = data.tags;
    
    if (data.reason && !data.tags) {
      const wasteLog = await prisma.wasteLog.findFirst({
        where: { id, tenantId }
      });
      
      if (wasteLog) {
        tags = generateWasteTags(data.reason, wasteLog.wasteType);
      }
    }
    
    return prisma.wasteLog.update({
      where: { id, tenantId },
      data: {
        reason: data.reason,
        tags,
        updatedAt: new Date()
      },
      include: {
        loggedByUser: {
          select: { username: true, role: true }
        },
        recipe: {
          select: { productName: true, portionSize: true }
        }
      }
    });
  }
  
  async deleteWasteLog(id: string, tenantId: string) {
    return prisma.wasteLog.delete({
      where: { id, tenantId }
    });
  }
  
  async getWasteStats(
    tenantId: string,
    branchId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ) {
    const where: any = { tenantId };
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      };
    }
    
    const wasteLogs = await prisma.wasteLog.findMany({
      where,
      select: {
        cost: true,
        quantity: true,
        unit: true,
        wasteType: true,
        tags: true,
        reason: true,
        itemName: true,
        createdAt: true
      }
    });
    
    const totalWaste = wasteLogs.reduce((sum, log) => sum + log.quantity, 0);
    const totalCost = wasteLogs.reduce((sum, log) => sum + log.cost, 0);
    
    const wasteByType = wasteLogs.reduce((acc, log) => {
      acc[log.wasteType] = (acc[log.wasteType] || 0) + log.cost;
      return acc;
    }, {} as Record<string, number>);
    
    const wasteByCategory = wasteLogs.reduce((acc, log) => {
      log.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + log.cost;
      });
      return acc;
    }, {} as Record<string, number>);
    
    const wasteByItem = wasteLogs.reduce((acc, log) => {
      acc[log.itemName] = (acc[log.itemName] || 0) + log.cost;
      return acc;
    }, {} as Record<string, number>);
    
    const topWastedItems = Object.entries(wasteByItem)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([item, cost]) => ({ item, cost }));
    
    const insights = getSustainabilityInsights(
      wasteLogs.map(log => ({ tags: log.tags, cost: log.cost }))
    );
    
    return {
      totalWaste,
      totalCost,
      wasteByType,
      wasteByCategory,
      topWastedItems,
      sustainabilityScore: insights.sustainabilityScore,
      avoidableWaste: insights.avoidableWaste,
      topIssues: insights.topIssues
    };
  }
  
  async getWasteTrends(
    tenantId: string,
    branchId?: string,
    days: number = 30
  ) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const where: any = {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    const wasteLogs = await prisma.wasteLog.findMany({
      where,
      select: {
        cost: true,
        quantity: true,
        createdAt: true,
        wasteType: true
      },
      orderBy: { createdAt: 'asc' }
    });
    
    const dailyWaste: Record<string, { cost: number; quantity: number; count: number }> = {};
    
    wasteLogs.forEach(log => {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!dailyWaste[date]) {
        dailyWaste[date] = { cost: 0, quantity: 0, count: 0 };
      }
      dailyWaste[date].cost += log.cost;
      dailyWaste[date].quantity += log.quantity;
      dailyWaste[date].count += 1;
    });
    
    return Object.entries(dailyWaste)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}