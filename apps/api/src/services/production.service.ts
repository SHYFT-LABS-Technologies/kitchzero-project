import { PrismaClient, ProductionStatus, UsageType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateProductionData {
  recipeId: string;
  plannedQuantity: number;
  quantityProduced?: number;
  batchNumber?: string;
  notes?: string;
  qualityRating?: number;
  tenantId: string;
  branchId: string;
  producedBy?: string;
  productionDate?: Date;
}

export interface ProductionFilters {
  recipeId?: string;
  status?: ProductionStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export class ProductionService {
  /**
   * Create a new production batch and automatically deduct ingredients from inventory
   */
  async createProduction(data: CreateProductionData) {
    return prisma.$transaction(async (tx) => {
      // Get recipe with ingredients
      const recipe = await tx.recipe.findFirst({
        where: { id: data.recipeId, tenantId: data.tenantId },
        include: { ingredients: true }
      });

      if (!recipe) {
        throw new Error('Recipe not found');
      }

      const actualQuantity = data.quantityProduced || data.plannedQuantity;
      const multiplier = actualQuantity / recipe.yield;

      // Check ingredient availability first
      const availability = await this.checkIngredientAvailability(
        recipe,
        data.tenantId,
        data.branchId,
        multiplier,
        tx
      );

      if (!availability.canProduce) {
        throw new Error(`Cannot produce: Missing ingredients - ${availability.missingIngredients.map(i => i.ingredientName).join(', ')}`);
      }

      // Create production record
      const production = await tx.production.create({
        data: {
          recipeId: data.recipeId,
          plannedQuantity: data.plannedQuantity,
          quantityProduced: actualQuantity,
          batchNumber: data.batchNumber || this.generateBatchNumber(recipe.name),
          notes: data.notes,
          qualityRating: data.qualityRating,
          status: ProductionStatus.COMPLETED,
          tenantId: data.tenantId,
          branchId: data.branchId,
          producedBy: data.producedBy,
          productionDate: data.productionDate || new Date()
        }
      });

      // Deduct ingredients from inventory (FIFO) and create production ingredient records
      const ingredientUsage = [];
      let totalCost = 0;

      for (const ingredient of recipe.ingredients) {
        const requiredQuantity = ingredient.quantity * multiplier;
        
        if (requiredQuantity <= 0 || ingredient.isOptional) continue;

        const { usedItems, totalUsedCost } = await this.deductIngredientFromInventory(
          ingredient.ingredientName,
          ingredient.category,
          requiredQuantity,
          data.tenantId,
          data.branchId,
          tx
        );

        // Create production ingredient record
        const productionIngredient = await tx.productionIngredient.create({
          data: {
            productionId: production.id,
            ingredientName: ingredient.ingredientName,
            category: ingredient.category,
            quantityUsed: requiredQuantity,
            unit: ingredient.unit,
            costUsed: totalUsedCost,
            inventoryItemIds: usedItems.map(item => item.id)
          }
        });

        ingredientUsage.push(productionIngredient);
        totalCost += totalUsedCost;

        // Record stock usage history
        await this.recordStockUsageHistory(
          ingredient.ingredientName,
          ingredient.category,
          ingredient.unit,
          requiredQuantity,
          totalUsedCost,
          data.tenantId,
          data.branchId,
          production.id,
          tx
        );
      }

      // Update production with calculated costs
      const unitCost = actualQuantity > 0 ? totalCost / actualQuantity : 0;
      
      const updatedProduction = await tx.production.update({
        where: { id: production.id },
        data: {
          totalCost,
          unitCost
        },
        include: {
          recipe: {
            select: {
              name: true,
              yield: true,
              yieldUnit: true
            }
          },
          ingredientUsage: true
        }
      });

      return updatedProduction;
    });
  }

  /**
   * Get production records with filters
   */
  async getProductions(tenantId: string, branchId?: string, filters?: ProductionFilters) {
    const where: any = { tenantId };

    if (branchId) {
      where.branchId = branchId;
    }

    if (filters?.recipeId) {
      where.recipeId = filters.recipeId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.productionDate = {};
      if (filters.dateFrom) {
        where.productionDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.productionDate.lte = filters.dateTo;
      }
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [productions, total] = await Promise.all([
      prisma.production.findMany({
        where,
        include: {
          recipe: {
            select: {
              name: true,
              yield: true,
              yieldUnit: true,
              category: true
            }
          },
          ingredientUsage: {
            select: {
              ingredientName: true,
              quantityUsed: true,
              unit: true,
              costUsed: true
            }
          },
          _count: {
            select: {
              wasteFromProduction: true
            }
          }
        },
        orderBy: { productionDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.production.count({ where })
    ]);

    return {
      productions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get production by ID
   */
  async getProductionById(id: string, tenantId: string) {
    const production = await prisma.production.findFirst({
      where: { id, tenantId },
      include: {
        recipe: {
          include: {
            ingredients: true
          }
        },
        ingredientUsage: true,
        wasteFromProduction: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!production) {
      throw new Error('Production not found');
    }

    return production;
  }

  /**
   * Get production analytics
   */
  async getProductionAnalytics(tenantId: string, branchId?: string, dateFrom?: Date, dateTo?: Date) {
    const where: any = { tenantId };

    if (branchId) {
      where.branchId = branchId;
    }

    if (dateFrom || dateTo) {
      where.productionDate = {};
      if (dateFrom) where.productionDate.gte = dateFrom;
      if (dateTo) where.productionDate.lte = dateTo;
    }

    const [
      totalProductions,
      totalQuantityProduced,
      totalCost,
      averageQualityRating,
      productionsByRecipe,
      recentProductions
    ] = await Promise.all([
      prisma.production.count({ where }),
      
      prisma.production.aggregate({
        where,
        _sum: { quantityProduced: true }
      }),
      
      prisma.production.aggregate({
        where,
        _sum: { totalCost: true }
      }),
      
      prisma.production.aggregate({
        where: { ...where, qualityRating: { not: null } },
        _avg: { qualityRating: true }
      }),
      
      prisma.production.groupBy({
        by: ['recipeId'],
        where,
        _count: { _all: true },
        _sum: { quantityProduced: true, totalCost: true },
        orderBy: { _count: { _all: 'desc' } },
        take: 10
      }),
      
      prisma.production.findMany({
        where,
        include: {
          recipe: { select: { name: true } }
        },
        orderBy: { productionDate: 'desc' },
        take: 5
      })
    ]);

    // Get recipe names for top productions
    const recipeIds = productionsByRecipe.map(p => p.recipeId);
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      select: { id: true, name: true }
    });

    const recipeMap = new Map(recipes.map(r => [r.id, r.name]));

    return {
      summary: {
        totalProductions,
        totalQuantityProduced: totalQuantityProduced._sum.quantityProduced || 0,
        totalCost: totalCost._sum.totalCost || 0,
        averageQualityRating: averageQualityRating._avg.qualityRating || 0,
        averageCostPerUnit: totalQuantityProduced._sum.quantityProduced 
          ? (totalCost._sum.totalCost || 0) / totalQuantityProduced._sum.quantityProduced
          : 0
      },
      topRecipes: productionsByRecipe.map(p => ({
        recipeId: p.recipeId,
        recipeName: recipeMap.get(p.recipeId) || 'Unknown',
        productionCount: p._count._all,
        totalQuantity: p._sum.quantityProduced || 0,
        totalCost: p._sum.totalCost || 0
      })),
      recentProductions
    };
  }

  /**
   * Private helper: Check ingredient availability
   */
  private async checkIngredientAvailability(
    recipe: any,
    tenantId: string,
    branchId: string,
    multiplier: number,
    tx: any
  ) {
    const availability = [];

    for (const ingredient of recipe.ingredients) {
      const requiredQuantity = ingredient.quantity * multiplier;

      const availableItems = await tx.inventoryItem.findMany({
        where: {
          tenantId,
          branchId,
          name: ingredient.ingredientName,
          category: ingredient.category,
          quantity: { gt: 0 }
        },
        orderBy: { expiryDate: 'asc' },
        select: { id: true, quantity: true, expiryDate: true }
      });

      const totalAvailable = availableItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

      availability.push({
        ingredientName: ingredient.ingredientName,
        category: ingredient.category,
        required: requiredQuantity,
        available: totalAvailable,
        sufficient: totalAvailable >= requiredQuantity,
        shortage: Math.max(0, requiredQuantity - totalAvailable),
        unit: ingredient.unit,
        isOptional: ingredient.isOptional
      });
    }

    return {
      availability,
      canProduce: availability.every(item => item.sufficient || item.isOptional),
      missingIngredients: availability.filter(item => !item.sufficient && !item.isOptional)
    };
  }

  /**
   * Private helper: Deduct ingredient from inventory using FIFO
   */
  private async deductIngredientFromInventory(
    ingredientName: string,
    category: string,
    quantityNeeded: number,
    tenantId: string,
    branchId: string,
    tx: any
  ) {
    const availableItems = await tx.inventoryItem.findMany({
      where: {
        tenantId,
        branchId,
        name: ingredientName,
        category,
        quantity: { gt: 0 }
      },
      orderBy: { expiryDate: 'asc' } // FIFO
    });

    const usedItems = [];
    let remainingQuantity = quantityNeeded;
    let totalUsedCost = 0;

    for (const item of availableItems) {
      if (remainingQuantity <= 0) break;

      const useQuantity = Math.min(item.quantity, remainingQuantity);
      const costForUsed = (item.cost * useQuantity);

      // Update inventory item
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: item.quantity - useQuantity }
      });

      usedItems.push({
        id: item.id,
        quantityUsed: useQuantity,
        cost: costForUsed
      });

      totalUsedCost += costForUsed;
      remainingQuantity -= useQuantity;
    }

    if (remainingQuantity > 0) {
      throw new Error(`Insufficient inventory for ${ingredientName}. Need ${remainingQuantity} more ${category}`);
    }

    return { usedItems, totalUsedCost };
  }

  /**
   * Private helper: Record stock usage history
   */
  private async recordStockUsageHistory(
    ingredientName: string,
    category: string,
    unit: string,
    quantityUsed: number,
    cost: number,
    tenantId: string,
    branchId: string,
    productionId: string,
    tx: any
  ) {
    // Find or create stock level record
    const stockLevel = await tx.productStockLevel.upsert({
      where: {
        productName_category_unit_tenantId_branchId: {
          productName: ingredientName,
          category,
          unit,
          tenantId,
          branchId
        }
      },
      update: {},
      create: {
        productName: ingredientName,
        category,
        unit,
        tenantId,
        branchId,
        minStockLevel: 0,
        maxStockLevel: null,
        safetyStock: 0,
        isActive: true,
        trackStock: true
      }
    });

    // Get current total quantity
    const currentInventory = await tx.inventoryItem.aggregate({
      where: {
        tenantId,
        branchId,
        name: ingredientName,
        category
      },
      _sum: { quantity: true }
    });

    const currentTotal = currentInventory._sum.quantity || 0;

    // Record usage
    await tx.stockUsageHistory.create({
      data: {
        stockLevelId: stockLevel.id,
        usageType: UsageType.RECIPE_CONSUMPTION,
        quantityUsed,
        totalQuantityBefore: currentTotal + quantityUsed,
        totalQuantityAfter: currentTotal,
        cost,
        tenantId,
        branchId,
        reason: `Production batch for recipe: ${productionId}`
      }
    });
  }

  /**
   * Private helper: Generate batch number
   */
  private generateBatchNumber(recipeName: string): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.toTimeString().slice(0, 5).replace(':', '');
    const recipePrefix = recipeName.substring(0, 3).toUpperCase();
    
    return `${recipePrefix}-${dateStr}-${timeStr}`;
  }
}