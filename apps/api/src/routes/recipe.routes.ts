import { FastifyInstance } from 'fastify';
import { RecipeService } from '../services/recipe.service';
import { authenticate, requireTenantAccess } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { CreateRecipeSchema } from '@kitchzero/schemas';
import { z } from 'zod';

const RecipeParamsSchema = z.object({
  tenantId: z.string().uuid(),
  recipeId: z.string().uuid().optional(),
  itemName: z.string().optional()
});

const UpdateRecipeSchema = z.object({
  productName: z.string().min(1).max(100).optional(),
  portionSize: z.number().positive().optional(),
  ingredients: z.array(z.object({
    itemName: z.string().min(1).max(100),
    quantity: z.number().positive(),
    unit: z.enum(['KG', 'L', 'PORTION', 'PIECE'])
  })).optional()
});

export async function recipeRoutes(fastify: FastifyInstance) {
  const recipeService = new RecipeService();
  
  fastify.post('/tenants/:tenantId/recipes', {
    preHandler: [
      authenticate,
      validateParams(RecipeParamsSchema),
      requireTenantAccess(),
      validateBody(CreateRecipeSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const recipeData = {
        ...(request.body as any),
        tenantId
      };
      
      const recipe = await recipeService.createRecipe(recipeData);
      
      return reply.status(201).send({
        success: true,
        data: recipe
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create recipe'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/recipes', {
    preHandler: [
      authenticate,
      validateParams(RecipeParamsSchema),
      requireTenantAccess()
    ]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      
      const recipes = await recipeService.getRecipes(tenantId);
      
      return reply.status(200).send({
        success: true,
        data: recipes
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipes'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/recipes/:recipeId', {
    preHandler: [
      authenticate,
      validateParams(RecipeParamsSchema.extend({ recipeId: z.string().uuid() })),
      requireTenantAccess()
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, recipeId } = request.params as any;
      
      const recipe = await recipeService.getRecipeById(recipeId, tenantId);
      
      return reply.status(200).send({
        success: true,
        data: recipe
      });
    } catch (error) {
      return reply.status(404).send({
        success: false,
        error: error instanceof Error ? error.message : 'Recipe not found'
      });
    }
  });
  
  fastify.put('/tenants/:tenantId/recipes/:recipeId', {
    preHandler: [
      authenticate,
      validateParams(RecipeParamsSchema.extend({ recipeId: z.string().uuid() })),
      requireTenantAccess(),
      validateBody(UpdateRecipeSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, recipeId } = request.params as any;
      const updateData = request.body as any;
      
      const recipe = await recipeService.updateRecipe(recipeId, updateData, tenantId);
      
      return reply.status(200).send({
        success: true,
        data: recipe
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update recipe'
      });
    }
  });
  
  fastify.delete('/tenants/:tenantId/recipes/:recipeId', {
    preHandler: [
      authenticate,
      validateParams(RecipeParamsSchema.extend({ recipeId: z.string().uuid() })),
      requireTenantAccess()
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, recipeId } = request.params as any;
      
      await recipeService.deleteRecipe(recipeId, tenantId);
      
      return reply.status(200).send({
        success: true,
        message: 'Recipe deleted successfully'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete recipe'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/recipes/:recipeId/cost', {
    preHandler: [
      authenticate,
      validateParams(RecipeParamsSchema.extend({ recipeId: z.string().uuid() })),
      requireTenantAccess()
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, recipeId } = request.params as any;
      const { branchId } = request.query as any;
      
      const userBranchId = request.user!.role === 'BRANCH_ADMIN' ? request.user!.branchId : branchId;
      
      const cost = await recipeService.calculateRecipeCost(recipeId, tenantId, userBranchId);
      
      return reply.status(200).send({
        success: true,
        data: cost
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate recipe cost'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/recipes/by-ingredient/:itemName', {
    preHandler: [
      authenticate,
      validateParams(RecipeParamsSchema.extend({ itemName: z.string().min(1) })),
      requireTenantAccess()
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, itemName } = request.params as any;
      
      const recipes = await recipeService.getRecipesByIngredient(
        decodeURIComponent(itemName),
        tenantId
      );
      
      return reply.status(200).send({
        success: true,
        data: recipes
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipes by ingredient'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/recipes/popular', {
    preHandler: [
      authenticate,
      validateParams(RecipeParamsSchema),
      requireTenantAccess()
    ]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const { limit } = request.query as any;
      
      const recipes = await recipeService.getPopularRecipes(tenantId, limit ? parseInt(limit) : 10);
      
      return reply.status(200).send({
        success: true,
        data: recipes
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch popular recipes'
      });
    }
  });
}