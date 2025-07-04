import { PrismaClient, WasteType, WasteSeverity, UsageType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateWasteLogData {
  itemName: string;
  category?: string;
  quantity: number;
  unit: string;
  wasteType: WasteType;
  reason: string;
  tags?: string[];
  recipeId?: string;
  productionId?: string;
  location?: string;
  preventable?: boolean;
  severity?: WasteSeverity;
  tenantId: string;
  branchId: string;
  loggedBy: string;
}

export interface WasteFilters {
  wasteType?: WasteType;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
  recipeId?: string;
  productionId?: string;
  preventable?: boolean;
  severity?: WasteSeverity;
  search?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export class WasteService {
  /**
   * Create a waste log and automatically deduct from inventory
   */
  async createWasteLog(data: CreateWasteLogData) {
    return prisma.$transaction(async (tx) => {
      let cost = 0;
      let autoTags: string[] = [];

      // Calculate cost based on waste type
      if (data.wasteType === WasteType.PRODUCT && data.recipeId) {
        // For finished product waste, calculate cost from recipe
        cost = await this.calculateProductWasteCost(data.recipeId, data.quantity, data.tenantId, data.branchId, tx);
      } else if (data.wasteType === WasteType.RAW) {
        // For raw material waste, deduct from inventory and calculate cost
        cost = await this.calculateRawWasteCost(data.itemName, data.category, data.quantity, data.tenantId, data.branchId, tx);
      }

      // Generate automatic tags based on reason and type
      autoTags = this.generateWasteTags(data.reason, data.wasteType);

      // Create waste log
      const wasteLog = await tx.wasteLog.create({
        data: {
          itemName: data.itemName,
          category: data.category,
          quantity: data.quantity,
          unit: data.unit,
          cost,
          wasteType: data.wasteType,
          reason: data.reason,
          tags: [...autoTags, ...(data.tags || [])],
          recipeId: data.recipeId,
          productionId: data.productionId,
          location: data.location,
          preventable: data.preventable ?? true,
          severity: data.severity || WasteSeverity.MEDIUM,
          tenantId: data.tenantId,
          branchId: data.branchId,
          loggedBy: data.loggedBy
        },
        include: {
          loggedByUser: {
            select: { username: true, role: true }
          },
          recipe: {
            select: { name: true, yield: true, yieldUnit: true }
          },
          production: {
            select: { batchNumber: true, quantityProduced: true }
          }
        }
      });

      // Record stock usage history if it's raw material waste
      if (data.wasteType === WasteType.RAW) {
        await this.recordWasteStockUsage(
          data.itemName,
          data.category || 'Unknown',
          data.unit,
          data.quantity,
          cost,
          data.tenantId,
          data.branchId,
          tx
        );
      }

      return wasteLog;
    });
  }

  /**
   * Get waste log by ID
   */
  async getWasteLogById(wasteLogId: string, tenantId: string) {
    const wasteLog = await prisma.wasteLog.findFirst({
      where: { id: wasteLogId, tenantId },
      include: {
        loggedByUser: {
          select: { username: true, role: true }
        },
        recipe: {
          select: { name: true, yield: true, yieldUnit: true }
        },
        production: {
          select: { batchNumber: true, quantityProduced: true, productionDate: true }
        },
        branch: {
          select: { name: true }
        }
      }
    });

    if (!wasteLog) {
      throw new Error('Waste log not found');
    }

    return wasteLog;
  }

  /**
   * Update waste log
   */
  async updateWasteLog(wasteLogId: string, updateData: { reason?: string; tags?: string[] }, tenantId: string) {
    const wasteLog = await prisma.wasteLog.findFirst({
      where: { id: wasteLogId, tenantId }
    });

    if (!wasteLog) {
      throw new Error('Waste log not found');
    }

    return prisma.wasteLog.update({
      where: { id: wasteLogId },
      data: updateData,
      include: {
        loggedByUser: {
          select: { username: true, role: true }
        },
        recipe: {
          select: { name: true, yield: true, yieldUnit: true }
        },
        production: {
          select: { batchNumber: true, quantityProduced: true, productionDate: true }
        },
        branch: {
          select: { name: true }
        }
      }
    });
  }

  /**
   * Delete waste log
   */
  async deleteWasteLog(wasteLogId: string, tenantId: string) {
    const wasteLog = await prisma.wasteLog.findFirst({
      where: { id: wasteLogId, tenantId }
    });

    if (!wasteLog) {
      throw new Error('Waste log not found');
    }

    await prisma.wasteLog.delete({
      where: { id: wasteLogId }
    });

    return { message: 'Waste log deleted successfully' };
  }

  /**
   * Get waste logs with filters
   */
  async getWasteLogs(tenantId: string, branchId?: string, filters?: WasteFilters) {
    const where: any = { tenantId };

    if (branchId) {
      where.branchId = branchId;
    }

    if (filters?.wasteType) {
      where.wasteType = filters.wasteType;
    }

    if (filters?.tags?.length) {
      where.tags = {
        hasSome: filters.tags
      };
    }

    if (filters?.recipeId) {
      where.recipeId = filters.recipeId;
    }

    if (filters?.productionId) {
      where.productionId = filters.productionId;
    }

    if (filters?.preventable !== undefined) {
      where.preventable = filters.preventable;
    }

    if (filters?.severity) {
      where.severity = filters.severity;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters?.search) {
      where.OR = [
        { itemName: { contains: filters.search, mode: 'insensitive' } },
        { category: { contains: filters.search, mode: 'insensitive' } },
        { reason: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [wasteLogs, total] = await Promise.all([
      prisma.wasteLog.findMany({
        where,
        include: {
          loggedByUser: {
            select: { username: true, role: true }
          },
          recipe: {
            select: { name: true, yield: true, yieldUnit: true }
          },
          production: {
            select: { batchNumber: true, quantityProduced: true, productionDate: true }
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
      wasteLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get waste analytics
   */
  async getWasteAnalytics(tenantId: string, branchId?: string, dateFrom?: Date, dateTo?: Date) {
    const where: any = { tenantId };

    if (branchId) {
      where.branchId = branchId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [
      totalWasteLogs,
      wasteByType,
      wasteByCategory,
      wasteBySeverity,
      wasteByPreventability,
      wasteByReason,
      wasteTrends,
      topWastedItems
    ] = await Promise.all([
      // Total waste summary
      prisma.wasteLog.aggregate({
        where,
        _count: { _all: true },
        _sum: { quantity: true, cost: true }
      }),

      // Waste by type
      prisma.wasteLog.groupBy({
        by: ['wasteType'],
        where,
        _count: { _all: true },
        _sum: { cost: true, quantity: true }
      }),

      // Waste by category
      prisma.wasteLog.groupBy({
        by: ['category'],
        where: { ...where, category: { not: null } },
        _count: { _all: true },
        _sum: { cost: true, quantity: true },
        orderBy: { _sum: { cost: 'desc' } },
        take: 10
      }),

      // Waste by severity
      prisma.wasteLog.groupBy({
        by: ['severity'],
        where,
        _count: { _all: true },
        _sum: { cost: true }
      }),

      // Preventable vs non-preventable
      prisma.wasteLog.groupBy({
        by: ['preventable'],
        where,
        _count: { _all: true },
        _sum: { cost: true }
      }),

      // Top waste reasons
      prisma.wasteLog.groupBy({
        by: ['reason'],
        where,
        _count: { _all: true },
        _sum: { cost: true },
        orderBy: { _sum: { cost: 'desc' } },
        take: 10
      }),

      // Daily waste trends (last 30 days)
      this.getWasteTrends(tenantId, branchId, 30),

      // Top wasted items
      prisma.wasteLog.groupBy({
        by: ['itemName'],
        where,
        _count: { _all: true },
        _sum: { cost: true, quantity: true },
        orderBy: { _sum: { cost: 'desc' } },
        take: 10
      })
    ]);

    // Calculate waste percentages and insights
    const totalCost = totalWasteLogs._sum.cost || 0;
    const preventableCost = wasteByPreventability.find(w => w.preventable)?._sum.cost || 0;
    const preventablePercentage = totalCost > 0 ? (preventableCost / totalCost) * 100 : 0;

    const sustainabilityScore = Math.max(0, 100 - preventablePercentage);

    return {
      summary: {
        totalWasteLogs: totalWasteLogs._count._all,
        totalQuantity: totalWasteLogs._sum.quantity || 0,
        totalCost,
        preventableCost,
        preventablePercentage: Math.round(preventablePercentage * 100) / 100,
        sustainabilityScore: Math.round(sustainabilityScore * 100) / 100
      },
      breakdown: {
        byType: wasteByType,
        byCategory: wasteByCategory,
        bySeverity: wasteBySeverity,
        byPreventability: wasteByPreventability
      },
      insights: {
        topReasons: wasteByReason,
        topItems: topWastedItems,
        dailyTrends: wasteTrends
      }
    };
  }

  /**
   * Get waste trends over time
   */
  async getWasteTrends(tenantId: string, branchId?: string, days: number = 30) {
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
        wasteType: true,
        preventable: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const dailyData: Record<string, {
      date: string;
      totalCost: number;
      totalQuantity: number;
      rawCost: number;
      productCost: number;
      preventableCost: number;
      count: number;
    }> = {};

    wasteLogs.forEach(log => {
      const date = log.createdAt.toISOString().split('T')[0];
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          totalCost: 0,
          totalQuantity: 0,
          rawCost: 0,
          productCost: 0,
          preventableCost: 0,
          count: 0
        };
      }

      dailyData[date].totalCost += log.cost;
      dailyData[date].totalQuantity += log.quantity;
      dailyData[date].count += 1;

      if (log.wasteType === WasteType.RAW) {
        dailyData[date].rawCost += log.cost;
      } else {
        dailyData[date].productCost += log.cost;
      }

      if (log.preventable) {
        dailyData[date].preventableCost += log.cost;
      }
    });

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Private helper: Calculate cost for product waste
   */
  private async calculateProductWasteCost(
    recipeId: string,
    wasteQuantity: number,
    tenantId: string,
    branchId: string,
    tx: any
  ): Promise<number> {
    const recipe = await tx.recipe.findFirst({
      where: { id: recipeId, tenantId },
      include: { ingredients: true }
    });

    if (!recipe || !recipe.costPerUnit) {
      return 0;
    }

    return recipe.costPerUnit * wasteQuantity;
  }

  /**
   * Private helper: Calculate cost for raw material waste and deduct from inventory
   */
  private async calculateRawWasteCost(
    itemName: string,
    category: string | undefined,
    quantity: number,
    tenantId: string,
    branchId: string,
    tx: any
  ): Promise<number> {
    // Find available inventory items (FIFO)
    const where: any = {
      tenantId,
      branchId,
      name: itemName,
      quantity: { gt: 0 }
    };

    if (category) {
      where.category = category;
    }

    const availableItems = await tx.inventoryItem.findMany({
      where,
      orderBy: { expiryDate: 'asc' }
    });

    let remainingQuantity = quantity;
    let totalCost = 0;

    for (const item of availableItems) {
      if (remainingQuantity <= 0) break;

      const useQuantity = Math.min(item.quantity, remainingQuantity);
      const costForUsed = item.cost * useQuantity;

      // Update inventory
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: item.quantity - useQuantity }
      });

      totalCost += costForUsed;
      remainingQuantity -= useQuantity;
    }

    // If we couldn't find enough inventory, estimate cost from recent purchases
    if (remainingQuantity > 0) {
      const recentItem = await tx.inventoryItem.findFirst({
        where: { tenantId, branchId, name: itemName },
        orderBy: { createdAt: 'desc' }
      });

      if (recentItem) {
        totalCost += recentItem.cost * remainingQuantity;
      }
    }

    return totalCost;
  }

  /**
   * Private helper: Record waste in stock usage history
   */
  private async recordWasteStockUsage(
    itemName: string,
    category: string,
    unit: string,
    quantity: number,
    cost: number,
    tenantId: string,
    branchId: string,
    tx: any
  ) {
    // Find or create stock level record
    const stockLevel = await tx.productStockLevel.upsert({
      where: {
        productName_category_unit_tenantId_branchId: {
          productName: itemName,
          category,
          unit,
          tenantId,
          branchId
        }
      },
      update: {},
      create: {
        productName: itemName,
        category,
        unit,
        tenantId,
        branchId,
        isActive: true,
        trackStock: true
      }
    });

    // Get current total quantity
    const currentInventory = await tx.inventoryItem.aggregate({
      where: {
        tenantId,
        branchId,
        name: itemName,
        category
      },
      _sum: { quantity: true }
    });

    const currentTotal = currentInventory._sum.quantity || 0;

    // Record waste usage
    await tx.stockUsageHistory.create({
      data: {
        stockLevelId: stockLevel.id,
        usageType: UsageType.WASTE_DISPOSAL,
        quantityUsed: quantity,
        totalQuantityBefore: currentTotal + quantity,
        totalQuantityAfter: currentTotal,
        cost,
        tenantId,
        branchId,
        reason: 'Waste disposal'
      }
    });
  }

  /**
   * Private helper: Generate automatic tags for waste categorization
   */
  private generateWasteTags(reason: string, wasteType: WasteType): string[] {
    const tags: string[] = [];
    const reasonLower = reason.toLowerCase();

    // Common waste categories
    if (reasonLower.includes('expired') || reasonLower.includes('spoiled') || reasonLower.includes('rotten')) {
      tags.push('expiry', 'storage_issue');
    }

    if (reasonLower.includes('overcooked') || reasonLower.includes('burnt') || reasonLower.includes('cooking')) {
      tags.push('cooking_error', 'preparation_issue');
    }

    if (reasonLower.includes('contaminated') || reasonLower.includes('dirty') || reasonLower.includes('cross-contamination')) {
      tags.push('contamination', 'hygiene_issue');
    }

    if (reasonLower.includes('over-ordered') || reasonLower.includes('excess') || reasonLower.includes('surplus')) {
      tags.push('over_ordering', 'planning_issue');
    }

    if (reasonLower.includes('damaged') || reasonLower.includes('broken') || reasonLower.includes('crushed')) {
      tags.push('damage', 'handling_issue');
    }

    if (reasonLower.includes('leftover') || reasonLower.includes('unsold') || reasonLower.includes('customer')) {
      tags.push('customer_related', 'demand_forecasting');
    }

    // Add waste type tag
    tags.push(wasteType.toLowerCase());

    return tags;
  }
}