import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple authentication middleware
async function authenticate(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard statistics for a tenant
  fastify.get('/tenants/:tenantId/dashboard/stats', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      // Ensure user can only access their tenant's dashboard
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      console.log(`📊 Fetching dashboard stats for tenant: ${tenantId}, user role: ${userRole}`);

      // Build where clause based on user role
      const inventoryWhere: any = { tenantId };
      const wasteWhere: any = { tenantId };
      const recipeWhere: any = { tenantId };
      
      if (userRole === 'BRANCH_ADMIN' && request.user!.branchId) {
        inventoryWhere.branchId = request.user!.branchId;
        wasteWhere.branchId = request.user!.branchId;
        recipeWhere.branchId = request.user!.branchId;
      }

      // Get current date and last week
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalInventoryItems,
        totalInventoryValue,
        wasteThisWeek,
        expiringItems,
        totalRecipes,
        lowStockItems
      ] = await Promise.all([
        // Total inventory items
        prisma.inventoryItem.count({
          where: inventoryWhere
        }),

        // Total inventory value
        prisma.inventoryItem.aggregate({
          where: inventoryWhere,
          _sum: {
            cost: true
          }
        }),

        // Waste this week
        prisma.wasteLog.aggregate({
          where: {
            ...wasteWhere,
            createdAt: {
              gte: lastWeek
            }
          },
          _sum: {
            cost: true
          }
        }),

        // Expiring items (next 7 days)
        prisma.inventoryItem.count({
          where: {
            ...inventoryWhere,
            expiryDate: {
              lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
              gte: now
            }
          }
        }),

        // Total recipes
        prisma.recipe.count({
          where: recipeWhere
        }),

        // Low stock items (using simple threshold of 5)
        prisma.inventoryItem.count({
          where: {
            ...inventoryWhere,
            quantity: {
              lte: 5
            }
          }
        })
      ]);

      // Calculate sustainability score (simplified)
      const totalWasteValue = wasteThisWeek._sum.cost || 0;
      const totalValue = totalInventoryValue._sum.cost || 1;
      const wastePercentage = (totalWasteValue / totalValue) * 100;
      const sustainabilityScore = Math.max(0, Math.min(100, 100 - wastePercentage));

      const stats = {
        totalInventory: totalInventoryItems,
        totalValue: totalInventoryValue._sum.cost || 0,
        wasteThisWeek: totalWasteValue,
        expiringItems,
        sustainabilityScore: Math.round(sustainabilityScore),
        totalRecipes,
        lowStockItems,
        wasteReduction: Math.round(Math.random() * 15) + 5 // Simulated for demo
      };

      console.log(`✅ Dashboard stats retrieved for tenant: ${tenantId}`, stats);

      return reply.send({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Get dashboard stats error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch dashboard statistics'
      });
    }
  });

  // Get recent activity for dashboard
  fastify.get('/tenants/:tenantId/dashboard/activity', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const { limit = '20' } = request.query as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      // Ensure user can only access their tenant's activity
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Build where clause based on user role
      const whereClause: any = { tenantId };
      if (userRole === 'BRANCH_ADMIN' && request.user!.branchId) {
        whereClause.branchId = request.user!.branchId;
      }

      // Get recent waste logs as activity
      const recentWasteLogs = await prisma.wasteLog.findMany({
        where: whereClause,
        include: {
          loggedByUser: {
            select: {
              username: true
            }
          },
          branch: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: Math.min(parseInt(limit), 50)
      });

      // Transform to activity format
      const activity = recentWasteLogs.map(log => ({
        id: log.id,
        type: 'waste_logged',
        description: `${log.itemName} waste logged`,
        details: `${log.quantity} ${log.unit} - ${log.reason}`,
        user: log.loggedByUser.username,
        branch: log.branch.name,
        timestamp: log.createdAt,
        cost: log.cost,
        category: log.category
      }));

      return reply.send({
        success: true,
        data: activity
      });

    } catch (error) {
      console.error('❌ Get dashboard activity error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch recent activity'
      });
    }
  });

  // Get top waste items for dashboard
  fastify.get('/tenants/:tenantId/dashboard/waste-items', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const { limit = '10' } = request.query as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      // Ensure user can only access their tenant's waste items
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Build where clause based on user role
      const whereClause: any = { tenantId };
      if (userRole === 'BRANCH_ADMIN' && request.user!.branchId) {
        whereClause.branchId = request.user!.branchId;
      }

      // Get last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      whereClause.createdAt = { gte: thirtyDaysAgo };

      // Get top waste items by cost
      const topWasteItems = await prisma.wasteLog.groupBy({
        by: ['itemName'],
        where: whereClause,
        _sum: {
          cost: true,
          quantity: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            cost: 'desc'
          }
        },
        take: Math.min(parseInt(limit), 20)
      });

      // Transform to expected format
      const wasteItems = topWasteItems.map((item, index) => ({
        id: `waste-${index}`,
        name: item.itemName,
        cost: item._sum.cost || 0,
        quantity: item._sum.quantity || 0,
        occurrences: item._count.id,
        trend: Math.random() > 0.5 ? 'up' : 'down' // Simulated trend
      }));

      return reply.send({
        success: true,
        data: wasteItems
      });

    } catch (error) {
      console.error('❌ Get dashboard waste items error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch top waste items'
      });
    }
  });
}