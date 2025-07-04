import { FastifyInstance } from 'fastify';
import { InventoryService } from '../services/inventory.service';
import { StockLevelService } from '../services/stock-level.service';
import { authenticate, requireBranchAccess } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { CreateInventoryItemSchema, UpdateInventoryItemSchema, InventoryFiltersSchema } from '@kitchzero/schemas';
import { z } from 'zod';

const InventoryParamsSchema = z.object({
  tenantId: z.string().min(1),
  branchId: z.string().min(1).optional(),
  itemId: z.string().min(1).optional()
});

export async function inventoryRoutes(fastify: FastifyInstance) {
  const inventoryService = new InventoryService();
  const stockLevelService = new StockLevelService();
  
  fastify.post('/tenants/:tenantId/branches/:branchId/inventory', {
    preHandler: [
      authenticate,
      validateParams(InventoryParamsSchema),
      requireBranchAccess(),
      validateBody(CreateInventoryItemSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, branchId } = request.params as any;
      const inventoryData = {
        ...(request.body as any),
        tenantId,
        branchId,
        expiryDate: new Date((request.body as any).expiryDate)
      };
      
      const item = await inventoryService.createInventoryItem(inventoryData);
      
      return reply.status(201).send({
        success: true,
        data: item
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create inventory item'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/inventory', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      console.log('🔍 Inventory route hit:', request.method, request.url);
      console.log('📋 Params:', request.params);
      console.log('🔗 Query:', request.query);
      console.log('👤 User:', request.user);
      
      const { tenantId } = request.params as any;
      const filters = request.query as any;
      
      if (request.user!.role === 'BRANCH_ADMIN') {
        filters.branchId = request.user!.branchId;
      }
      
      console.log('📊 Calling inventoryService.getInventoryItems with:', { tenantId, branchId: filters.branchId, filters });
      
      const result = await inventoryService.getInventoryItems(
        tenantId,
        filters.branchId,
        filters
      );

      console.log('✅ Service returned:', { itemCount: result.items?.length });

      return reply.status(200).send({
        success: true,
        data: {
          items: result.items,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            pages: result.totalPages
          }
        }
      });
    } catch (error) {
      console.error('❌ Inventory route error:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/branches/:branchId/inventory', {
    preHandler: [
      authenticate,
      validateParams(InventoryParamsSchema),
      requireBranchAccess(),
      validateQuery(InventoryFiltersSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, branchId } = request.params as any;
      const filters = request.query as any;
      
      const result = await inventoryService.getInventoryItems(
        tenantId,
        branchId,
        filters
      );

      return reply.status(200).send({
        success: true,
        data: {
          items: result.items,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            pages: result.totalPages
          }
        }
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory'
      });
    }
  });
  
  fastify.put('/tenants/:tenantId/inventory/:itemId', {
    preHandler: [
      authenticate,
      validateParams(InventoryParamsSchema.extend({ itemId: z.string().min(1) })),
      validateBody(UpdateInventoryItemSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, itemId } = request.params as any;
      const updateData = request.body as any;
      
      if (updateData.expiryDate) {
        updateData.expiryDate = new Date(updateData.expiryDate);
      }
      
      if (request.user!.role === 'BRANCH_ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Branch admins must submit approval requests for inventory updates'
        });
      }
      
      const item = await inventoryService.updateInventoryItem(
        itemId,
        updateData,
        tenantId
      );
      
      return reply.status(200).send({
        success: true,
        data: item
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update inventory item'
      });
    }
  });
  
  fastify.delete('/tenants/:tenantId/inventory/:itemId', {
    preHandler: [
      authenticate,
      validateParams(InventoryParamsSchema.extend({ itemId: z.string().uuid() }))
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, itemId } = request.params as any;
      
      if (request.user!.role === 'BRANCH_ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Branch admins must submit approval requests for inventory deletion'
        });
      }
      
      await inventoryService.deleteInventoryItem(itemId, tenantId);
      
      return reply.status(200).send({
        success: true,
        message: 'Inventory item deleted successfully'
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete inventory item'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/inventory/stats', {
    preHandler: [
      authenticate,
      validateParams(InventoryParamsSchema)
    ]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const branchId = request.user!.role === 'BRANCH_ADMIN' ? request.user!.branchId : undefined;
      
      const stats = await inventoryService.getInventoryStats(tenantId, branchId);
      
      return reply.status(200).send({
        success: true,
        data: stats
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory stats'
      });
    }
  });
  
  fastify.get('/tenants/:tenantId/inventory/items/:itemName', {
    preHandler: [
      authenticate,
      validateParams(InventoryParamsSchema.extend({ itemName: z.string().min(1) }))
    ]
  }, async (request, reply) => {
    try {
      const { tenantId, itemName } = request.params as any;
      const branchId = request.user!.role === 'BRANCH_ADMIN' ? request.user!.branchId : undefined;
      
      const result = await inventoryService.getInventoryByItem(
        decodeURIComponent(itemName),
        tenantId,
        branchId
      );
      
      return reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory by item'
      });
    }
  });

  // Simple test route without any middleware
  fastify.get('/test-inventory', async (request, reply) => {
    console.log('🧪 Test route hit');
    return reply.send({
      success: true,
      message: 'Basic route working',
      timestamp: new Date().toISOString()
    });
  });

  // Test stock management route without auth
  fastify.get('/test-stock-management', async (request, reply) => {
    console.log('🧪 Test stock management route hit');
    return reply.send({
      success: true,
      message: 'Stock management route working without auth',
      timestamp: new Date().toISOString()
    });
  });

  // Test route for debugging
  fastify.get('/tenants/:tenantId/inventory/test', async (request, reply) => {
    console.log('🧪 Test route with params hit:', request.params);
    return reply.send({
      success: true,
      message: 'Inventory routes are working',
      params: request.params
    });
  });

  // Debug route to check all routes
  fastify.get('/debug/routes', async (request, reply) => {
    const routes = fastify.printRoutes();
    return reply.send({
      success: true,
      routes: routes
    });
  });

  // Stock Management Routes - Simplified with mock data
  fastify.get('/tenants/:tenantId/inventory/stock-management', async (request, reply) => {
    try {
      console.log('🔍 Stock management route hit with params:', request.params);
      const { tenantId } = request.params as any;
      
      // Return mock data for testing
      const mockData = {
        items: [
          {
            id: 'mock-1',
            name: 'Fresh Tomatoes',
            category: 'Vegetables',
            unit: 'kg',
            supplier: 'Local Farm Co.',
            currentQuantity: 40.5,
            minStockLevel: 10,
            maxStockLevel: 50,
            safetyStock: 5,
            reorderQuantity: 30,
            leadTimeDays: 2,
            avgDailyUsage: 3.5,
            isActive: true,
            trackStock: true,
            stockStatus: 'OK'
          },
          {
            id: 'mock-2',
            name: 'Yellow Onions',
            category: 'Vegetables',
            unit: 'kg',
            supplier: 'Valley Produce',
            currentQuantity: 35.0,
            minStockLevel: 8,
            maxStockLevel: 40,
            safetyStock: 3,
            reorderQuantity: 25,
            leadTimeDays: 3,
            avgDailyUsage: 2.0,
            isActive: true,
            trackStock: true,
            stockStatus: 'OK'
          },
          {
            id: 'mock-3',
            name: 'Chicken Breast',
            category: 'Proteins',
            unit: 'kg',
            supplier: 'Premium Poultry',
            currentQuantity: 5.0,
            minStockLevel: 8,
            maxStockLevel: 30,
            safetyStock: 4,
            reorderQuantity: 15,
            leadTimeDays: 1,
            avgDailyUsage: 2.5,
            isActive: true,
            trackStock: true,
            stockStatus: 'LOW'
          }
        ],
        categories: ['Vegetables', 'Proteins', 'Dairy', 'Grains & Pantry']
      };
      
      console.log('📊 Returning mock stock management data');
      
      return reply.status(200).send({
        success: true,
        data: mockData
      });
    } catch (error) {
      console.error('❌ Stock management route error:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stock management data'
      });
    }
  });

  const StockLevelsUpdateSchema = z.object({
    minStockLevel: z.number().min(0).optional(),
    maxStockLevel: z.number().min(0).optional(),
    safetyStock: z.number().min(0).optional(),
    reorderQuantity: z.number().min(0).optional(),
    leadTimeDays: z.number().int().min(1).optional(),
    trackStock: z.boolean().optional()
  });

  fastify.put('/tenants/:tenantId/products/:productName/:category/:unit/stock-levels', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      console.log('🔄 Stock levels update route hit with params:', request.params);
      const { tenantId, productName, category, unit } = request.params as any;
      const stockData = request.body as any;
      
      console.log('📝 Updating stock data for product:', { productName, category, unit, stockData });
      
      const branchId = request.user!.role === 'BRANCH_ADMIN' ? request.user!.branchId : undefined;
      
      const stockLevel = await stockLevelService.updateStockLevels(
        decodeURIComponent(productName),
        decodeURIComponent(category),
        decodeURIComponent(unit),
        stockData,
        tenantId,
        branchId
      );
      
      return reply.status(200).send({
        success: true,
        data: stockLevel
      });
    } catch (error) {
      console.error('❌ Stock levels update error:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update stock levels'
      });
    }
  });
}