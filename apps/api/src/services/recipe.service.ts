import { prisma } from '../lib/prisma';
import { Recipe, RecipeItem, InventoryUnit } from '@kitchzero/types';
import { calculateCostPerUnit } from '@kitchzero/utils';

export class RecipeService {
  async createRecipe(data: {
    productName: string;
    portionSize: number;
    tenantId: string;
    ingredients: Array<{
      itemName: string;
      quantity: number;
      unit: InventoryUnit;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          productName: data.productName,
          portionSize: data.portionSize,
          tenantId: data.tenantId
        }
      });
      
      const ingredients = await Promise.all(
        data.ingredients.map(ingredient =>
          tx.recipeItem.create({
            data: {
              recipeId: recipe.id,
              itemName: ingredient.itemName,
              quantity: ingredient.quantity,
              unit: ingredient.unit
            }
          })
        )
      );
      
      return { ...recipe, ingredients };
    });
  }
  
  async getRecipes(tenantId: string) {
    return prisma.recipe.findMany({
      where: { tenantId },
      include: {
        ingredients: true,
        _count: {
          select: { wasteLogs: true }
        }
      },
      orderBy: { productName: 'asc' }
    });
  }
  
  async getRecipeById(id: string, tenantId: string) {
    const recipe = await prisma.recipe.findFirst({
      where: { id, tenantId },
      include: {
        ingredients: true,
        wasteLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    
    return recipe;
  }
  
  async updateRecipe(
    id: string,
    data: {
      productName?: string;
      portionSize?: number;
      ingredients?: Array<{
        itemName: string;
        quantity: number;
        unit: InventoryUnit;
      }>;
    },
    tenantId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.update({
        where: { id, tenantId },
        data: {
          productName: data.productName,
          portionSize: data.portionSize
        }
      });
      
      if (data.ingredients) {
        await tx.recipeItem.deleteMany({
          where: { recipeId: id }
        });
        
        const ingredients = await Promise.all(
          data.ingredients.map(ingredient =>
            tx.recipeItem.create({
              data: {
                recipeId: id,
                itemName: ingredient.itemName,
                quantity: ingredient.quantity,
                unit: ingredient.unit
              }
            })
          )
        );
        
        return { ...recipe, ingredients };
      }
      
      const ingredients = await tx.recipeItem.findMany({
        where: { recipeId: id }
      });
      
      return { ...recipe, ingredients };
    });
  }
  
  async deleteRecipe(id: string, tenantId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.recipeItem.deleteMany({
        where: { recipeId: id }
      });
      
      await tx.recipe.delete({
        where: { id, tenantId }
      });
    });
  }
  
  async calculateRecipeCost(
    recipeId: string,
    tenantId: string,
    branchId?: string
  ): Promise<{
    totalCost: number;
    costPerPortion: number;
    ingredientCosts: Array<{
      itemName: string;
      quantity: number;
      unit: InventoryUnit;
      costPerUnit: number;
      totalCost: number;
    }>;
  }> {
    const recipe = await this.getRecipeById(recipeId, tenantId);
    
    const ingredientCosts = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        const inventory = await prisma.inventoryItem.findMany({
          where: {
            itemName: ingredient.itemName,
            unit: ingredient.unit,
            tenantId,
            ...(branchId && { branchId }),
            quantity: { gt: 0 }
          }
        });
        
        const costPerUnit = calculateCostPerUnit(
          inventory as any[],
          ingredient.itemName,
          ingredient.unit
        );
        
        const totalCost = costPerUnit * ingredient.quantity;
        
        return {
          itemName: ingredient.itemName,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          costPerUnit,
          totalCost
        };
      })
    );
    
    const totalCost = ingredientCosts.reduce((sum, item) => sum + item.totalCost, 0);
    const costPerPortion = recipe.portionSize > 0 ? totalCost / recipe.portionSize : 0;
    
    return {
      totalCost,
      costPerPortion,
      ingredientCosts
    };
  }
  
  async getRecipesByIngredient(
    itemName: string,
    tenantId: string
  ): Promise<Recipe[]> {
    const recipes = await prisma.recipe.findMany({
      where: {
        tenantId,
        ingredients: {
          some: {
            itemName: {
              contains: itemName,
              mode: 'insensitive'
            }
          }
        }
      },
      include: {
        ingredients: true
      }
    });
    
    return recipes as Recipe[];
  }
  
  async getPopularRecipes(tenantId: string, limit: number = 10) {
    return prisma.recipe.findMany({
      where: { tenantId },
      include: {
        ingredients: true,
        _count: {
          select: { wasteLogs: true }
        }
      },
      orderBy: {
        wasteLogs: {
          _count: 'desc'
        }
      },
      take: limit
    });
  }
}