import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateRecipeData {
  name: string;
  description?: string;
  category?: string;
  yield: number;
  yieldUnit: string;
  preparationTime?: number;
  cookingTime?: number;
  instructions?: string[];
  notes?: string;
  tenantId: string;
  branchId?: string;
  createdBy?: string;
  ingredients: {
    ingredientName: string;
    category: string;
    quantity: number;
    unit: string;
    notes?: string;
    isOptional?: boolean;
    order?: number;
  }[];
}

export interface UpdateRecipeData {
  name?: string;
  description?: string;
  category?: string;
  yield?: number;
  yieldUnit?: string;
  preparationTime?: number;
  cookingTime?: number;
  instructions?: string[];
  notes?: string;
  isActive?: boolean;
  ingredients?: {
    id?: string;
    ingredientName: string;
    category: string;
    quantity: number;
    unit: string;
    notes?: string;
    isOptional?: boolean;
    order?: number;
  }[];
}

export class RecipeService {
  /**
   * Create a new recipe with ingredients
   */
  async createRecipe(data: CreateRecipeData) {
    // Calculate cost per unit based on ingredient costs
    const costPerUnit = await this.calculateRecipeCost(data.ingredients, data.tenantId, data.branchId);

    return prisma.recipe.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        yield: data.yield,
        yieldUnit: data.yieldUnit,
        preparationTime: data.preparationTime,
        cookingTime: data.cookingTime,
        instructions: data.instructions || [],
        notes: data.notes,
        costPerUnit,
        tenantId: data.tenantId,
        branchId: data.branchId,
        createdBy: data.createdBy,
        ingredients: {
          create: data.ingredients.map((ingredient, index) => ({
            ingredientName: ingredient.ingredientName,
            category: ingredient.category,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: ingredient.notes,
            isOptional: ingredient.isOptional || false,
            order: ingredient.order || index + 1
          }))
        }
      },
      include: {
        ingredients: {
          orderBy: { order: 'asc' }
        },
        branch: {
          select: { name: true }
        }
      }
    });
  }

  /**
   * Get all recipes for a tenant/branch
   */
  async getRecipes(tenantId: string, branchId?: string, filters?: {
    category?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const where: any = { tenantId };

    // Branch filtering
    if (branchId) {
      where.OR = [
        { branchId: branchId },
        { branchId: null } // Include recipes available to all branches
      ];
    }

    // Apply filters
    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { ingredients: { some: { ingredientName: { contains: filters.search, mode: 'insensitive' } } } }
      ];
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: {
          ingredients: {
            orderBy: { order: 'asc' }
          },
          branch: {
            select: { name: true }
          },
          _count: {
            select: {
              productions: true
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.recipe.count({ where })
    ]);

    return {
      recipes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single recipe by ID
   */
  async getRecipeById(id: string, tenantId: string, branchId?: string) {
    const where: any = { id, tenantId };

    if (branchId) {
      where.OR = [
        { branchId: branchId },
        { branchId: null }
      ];
    }

    const recipe = await prisma.recipe.findFirst({
      where,
      include: {
        ingredients: {
          orderBy: { order: 'asc' }
        },
        branch: {
          select: { name: true }
        },
        productions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            quantityProduced: true,
            productionDate: true,
            status: true,
            totalCost: true
          }
        },
        _count: {
          select: {
            productions: true
          }
        }
      }
    });

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    return recipe;
  }

  /**
   * Update a recipe
   */
  async updateRecipe(id: string, data: UpdateRecipeData, tenantId: string) {
    const existingRecipe = await prisma.recipe.findFirst({
      where: { id, tenantId },
      include: { ingredients: true }
    });

    if (!existingRecipe) {
      throw new Error('Recipe not found');
    }

    // Calculate new cost if ingredients are being updated
    let costPerUnit = existingRecipe.costPerUnit;
    if (data.ingredients) {
      costPerUnit = await this.calculateRecipeCost(
        data.ingredients as any,
        tenantId,
        existingRecipe.branchId
      );
    }

    return prisma.$transaction(async (tx) => {
      // Update recipe
      const updatedRecipe = await tx.recipe.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          yield: data.yield,
          yieldUnit: data.yieldUnit,
          preparationTime: data.preparationTime,
          cookingTime: data.cookingTime,
          instructions: data.instructions,
          notes: data.notes,
          costPerUnit,
          isActive: data.isActive
        }
      });

      // Update ingredients if provided
      if (data.ingredients) {
        // Delete existing ingredients
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: id }
        });

        // Create new ingredients
        await tx.recipeIngredient.createMany({
          data: data.ingredients.map((ingredient, index) => ({
            recipeId: id,
            ingredientName: ingredient.ingredientName,
            category: ingredient.category,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: ingredient.notes,
            isOptional: ingredient.isOptional || false,
            order: ingredient.order || index + 1
          }))
        });
      }

      return tx.recipe.findUnique({
        where: { id },
        include: {
          ingredients: {
            orderBy: { order: 'asc' }
          },
          branch: {
            select: { name: true }
          }
        }
      });
    });
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(id: string, tenantId: string) {
    const recipe = await prisma.recipe.findFirst({
      where: { id, tenantId },
      include: { productions: true }
    });

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    if (recipe.productions.length > 0) {
      throw new Error('Cannot delete recipe that has production history. Consider deactivating instead.');
    }

    return prisma.recipe.delete({
      where: { id }
    });
  }

  /**
   * Get recipe categories for a tenant
   */
  async getRecipeCategories(tenantId: string, branchId?: string) {
    const where: any = { tenantId, isActive: true };

    if (branchId) {
      where.OR = [
        { branchId: branchId },
        { branchId: null }
      ];
    }

    const categories = await prisma.recipe.findMany({
      where,
      select: { category: true },
      distinct: ['category']
    });

    return categories
      .map(c => c.category)
      .filter(Boolean)
      .sort();
  }

  /**
   * Calculate recipe cost based on current ingredient prices
   */
  private async calculateRecipeCost(
    ingredients: { ingredientName: string; category: string; quantity: number; unit: string }[],
    tenantId: string,
    branchId?: string
  ): Promise<number> {
    let totalCost = 0;

    for (const ingredient of ingredients) {
      // Get the average cost of this ingredient from recent inventory items
      const where: any = {
        tenantId,
        name: ingredient.ingredientName,
        category: ingredient.category,
        quantity: { gt: 0 }
      };

      if (branchId) {
        where.branchId = branchId;
      }

      const recentItems = await prisma.inventoryItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5, // Take average of last 5 purchases
        select: { cost: true, unit: true }
      });

      if (recentItems.length > 0) {
        // Calculate average cost per unit
        const avgCost = recentItems.reduce((sum, item) => sum + item.cost, 0) / recentItems.length;
        
        // Assume units match for simplicity (in real app, you'd need unit conversion)
        const ingredientCost = avgCost * ingredient.quantity;
        totalCost += ingredientCost;
      }
    }

    return totalCost;
  }

  /**
   * Check ingredient availability for a recipe
   */
  async checkIngredientAvailability(recipeId: string, tenantId: string, branchId?: string, multiplier: number = 1) {
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, tenantId },
      include: { ingredients: true }
    });

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    const availability = [];

    for (const ingredient of recipe.ingredients) {
      const requiredQuantity = ingredient.quantity * multiplier;

      const where: any = {
        tenantId,
        name: ingredient.ingredientName,
        category: ingredient.category,
        quantity: { gt: 0 }
      };

      if (branchId) {
        where.branchId = branchId;
      }

      const availableItems = await prisma.inventoryItem.findMany({
        where,
        orderBy: { expiryDate: 'asc' }, // FIFO order
        select: { id: true, quantity: true, expiryDate: true }
      });

      const totalAvailable = availableItems.reduce((sum, item) => sum + item.quantity, 0);

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
      recipe: {
        id: recipe.id,
        name: recipe.name,
        yield: recipe.yield,
        yieldUnit: recipe.yieldUnit
      },
      multiplier,
      expectedYield: recipe.yield * multiplier,
      availability,
      canProduce: availability.every(item => item.sufficient || item.isOptional),
      missingIngredients: availability.filter(item => !item.sufficient && !item.isOptional)
    };
  }
}