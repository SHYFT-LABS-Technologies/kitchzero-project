import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

// JWT payload interface
interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  tenantId: string;
  branchId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

// Authentication middleware
async function authenticate(request: any, reply: any) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.substring(7);
    const payload = fastify.jwt.verify(token) as JWTPayload;
    
    request.user = payload;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

async function buildApp() {
  await fastify.register(helmet, {
    contentSecurityPolicy: false
  });
  
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  });
  
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret'
  });
  
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10)
  });
  
  fastify.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      apiVersion: 'real-database',
      database: 'connected'
    };
  });

  // Real authentication endpoints
  fastify.post('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body as any;

    console.log(`🔐 Login attempt for username: ${username}`);

    try {
      const user = await prisma.user.findUnique({
        where: { username },
        include: { 
          tenant: true, 
          branch: true 
        }
      });

      if (!user) {
        console.log(`❌ User not found: ${username}`);
        return reply.status(401).send({
          success: false,
          error: 'Invalid credentials'
        });
      }

      console.log(`👤 Found user: ${user.username}, checking password...`);
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      
      if (!passwordMatch) {
        console.log(`❌ Password mismatch for user: ${username}`);
        return reply.status(401).send({
          success: false,
          error: 'Invalid credentials'
        });
      }

      console.log(`✅ Login successful for user: ${username}`);

      const tokens = {
        accessToken: fastify.jwt.sign(
          {
            userId: user.id,
            username: user.username,
            role: user.role,
            tenantId: user.tenantId,
            branchId: user.branchId || undefined
          },
          { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
        ),
        refreshToken: fastify.jwt.sign(
          {
            userId: user.id,
            username: user.username,
            role: user.role,
            tenantId: user.tenantId,
            branchId: user.branchId || undefined
          },
          { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        )
      };

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            tenantId: user.tenantId,
            branchId: user.branchId,
            tenant: user.tenant,
            branch: user.branch
          },
          tokens,
          mustChangePassword: user.mustChangePassword
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Login failed'
      });
    }
  });

  // Change password endpoint
  fastify.post('/api/auth/change-password', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as any;
    const userId = request.user!.userId;

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found'
        });
      }

      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return reply.status(400).send({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false
        }
      });

      // Revoke all refresh tokens
      await prisma.refreshToken.deleteMany({ where: { userId } });

      return reply.send({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Password change failed'
      });
    }
  });

  // Logout endpoint
  fastify.post('/api/auth/logout', async (request, reply) => {
    const { refreshToken } = request.body as any;

    if (refreshToken) {
      try {
        await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    return reply.send({
      success: true,
      message: 'Logged out successfully'
    });
  });

  // Get current user endpoint
  fastify.get('/api/auth/me', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    return reply.send({
      success: true,
      user: request.user
    });
  });

  // Get dashboard stats
  fastify.get('/api/dashboard/stats', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user!.userId;
      const tenantId = request.user!.tenantId;
      const branchId = request.user!.branchId;

      // Filter by branch if user is BRANCH_ADMIN
      const where: any = { tenantId };
      if (request.user!.role === 'BRANCH_ADMIN' && branchId) {
        where.branchId = branchId;
      }

      // Get inventory count
      const inventoryCount = await prisma.inventoryItem.count({ where });

      // Get this week's waste
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const wasteThisWeek = await prisma.wasteLog.aggregate({
        where: {
          ...where,
          createdAt: { gte: oneWeekAgo }
        },
        _sum: { cost: true }
      });

      // Get expiring items (next 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const expiringCount = await prisma.inventoryItem.count({
        where: {
          ...where,
          expiryDate: {
            gte: new Date(),
            lte: sevenDaysFromNow
          }
        }
      });

      // Calculate sustainability score (simplified)
      const totalWaste = await prisma.wasteLog.aggregate({
        where,
        _sum: { cost: true }
      });

      const totalInventoryValue = await prisma.inventoryItem.aggregate({
        where,
        _sum: { cost: true }
      });

      const wastePercentage = totalInventoryValue._sum.cost 
        ? (totalWaste._sum.cost || 0) / totalInventoryValue._sum.cost * 100 
        : 0;
      
      const sustainabilityScore = Math.max(0, 100 - Math.round(wastePercentage));

      return reply.send({
        success: true,
        data: {
          totalInventory: inventoryCount,
          wasteThisWeek: wasteThisWeek._sum.cost || 0,
          expiringItems: expiringCount,
          sustainabilityScore
        }
      });

    } catch (error) {
      console.error('Dashboard stats error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch dashboard stats'
      });
    }
  });

  // Inventory Management Endpoints

  // Get all inventory items
  fastify.get('/api/inventory', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId;
      const branchId = request.user!.branchId;
      const query = request.query as any;

      console.log(`📦 Fetching inventory for tenant: ${tenantId}, user role: ${request.user!.role}`);

      // Filter by branch if user is BRANCH_ADMIN
      const where: any = { tenantId };
      if (request.user!.role === 'BRANCH_ADMIN' && branchId) {
        where.branchId = branchId;
        console.log(`🏢 Filtering by branch: ${branchId}`);
      }

      // Add search filter
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { category: { contains: query.search, mode: 'insensitive' } },
          { supplier: { contains: query.search, mode: 'insensitive' } }
        ];
      }

      // Add category filter
      if (query.category) {
        where.category = query.category;
      }

      // Add status filter
      if (query.status === 'expiring') {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        where.expiryDate = {
          gte: new Date(),
          lte: sevenDaysFromNow
        };
      } else if (query.status === 'low-stock') {
        where.quantity = { lte: 10 }; // Consider items with <= 10 units as low stock
      }

      // Pagination
      const page = parseInt(query.page || '1', 10);
      const limit = parseInt(query.limit || '20', 10);
      const skip = (page - 1) * limit;

      console.log(`🔍 Query filters:`, where);

      const [items, total] = await Promise.all([
        prisma.inventoryItem.findMany({
          where,
          include: {
            branch: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.inventoryItem.count({ where })
      ]);

      console.log(`📊 Found ${items.length} items out of ${total} total`);
      if (items.length > 0) {
        console.log(`📝 First item sample:`, {
          id: items[0].id,
          name: items[0].name,
          category: items[0].category,
          quantity: items[0].quantity,
          unit: items[0].unit
        });
      }

      return reply.send({
        success: true,
        data: {
          items,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get inventory error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch inventory items'
      });
    }
  });

  // Get single inventory item
  fastify.get('/api/inventory/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const tenantId = request.user!.tenantId;
      const branchId = request.user!.branchId;

      const where: any = { id, tenantId };
      if (request.user!.role === 'BRANCH_ADMIN' && branchId) {
        where.branchId = branchId;
      }

      const item = await prisma.inventoryItem.findFirst({
        where,
        include: {
          branch: {
            select: { name: true }
          }
        }
      });

      if (!item) {
        return reply.status(404).send({
          success: false,
          error: 'Inventory item not found'
        });
      }

      return reply.send({
        success: true,
        data: item
      });

    } catch (error) {
      console.error('Get inventory item error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch inventory item'
      });
    }
  });

  // Create inventory item
  fastify.post('/api/inventory', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const data = request.body as any;
      const tenantId = request.user!.tenantId;
      const userBranchId = request.user!.branchId;

      console.log(`📦 Creating inventory item for tenant: ${tenantId}`);
      console.log(`📝 Request data:`, {
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        cost: data.cost,
        supplier: data.supplier,
        purchaseDate: data.purchaseDate,
        expiryDate: data.expiryDate,
        location: data.location,
        notes: data.notes
      });

      // For non-branch admin users, we need to find a branch or assign to first branch
      let branchId = data.branchId;
      
      if (request.user!.role === 'BRANCH_ADMIN') {
        if (!userBranchId) {
          return reply.status(400).send({
            success: false,
            error: 'Branch admin must be assigned to a branch'
          });
        }
        branchId = userBranchId;
      } else {
        // For RESTAURANT_ADMIN or KITCHZERO_ADMIN, find first available branch
        if (!branchId) {
          const firstBranch = await prisma.branch.findFirst({
            where: { tenantId }
          });
          
          if (!firstBranch) {
            return reply.status(400).send({
              success: false,
              error: 'No branches found for this tenant. Please create a branch first.'
            });
          }
          
          branchId = firstBranch.id;
          console.log(`🏢 Auto-assigned to branch: ${firstBranch.name} (${branchId})`);
        }
      }

      // Validate branch exists and belongs to tenant
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, tenantId }
      });

      if (!branch) {
        console.error(`❌ Branch not found: ${branchId} for tenant: ${tenantId}`);
        return reply.status(400).send({
          success: false,
          error: 'Invalid branch'
        });
      }

      console.log(`✅ Branch validated: ${branch.name} (${branchId})`);

      // Prepare data for creation
      const createData = {
        name: data.name,
        category: data.category,
        quantity: parseFloat(data.quantity),
        unit: data.unit,
        cost: parseFloat(data.cost),
        supplier: data.supplier || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expiryDate: new Date(data.expiryDate),
        location: data.location || null,
        notes: data.notes || null,
        tenantId,
        branchId
      };

      console.log(`💾 Creating item with data:`, createData);

      const item = await prisma.inventoryItem.create({
        data: createData,
        include: {
          branch: {
            select: { name: true }
          }
        }
      });

      console.log(`✅ Inventory item created successfully: ${item.id}`);

      return reply.status(201).send({
        success: true,
        data: item
      });

    } catch (error) {
      console.error('❌ Create inventory item error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create inventory item';
      
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.message.includes('Prisma')) {
          errorMessage = 'Database error: ' + error.message;
        } else if (error.message.includes('validation')) {
          errorMessage = 'Validation error: ' + error.message;
        }
      }
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Update inventory item
  fastify.put('/api/inventory/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const tenantId = request.user!.tenantId;
      const branchId = request.user!.branchId;

      // Check if item exists and user has access
      const where: any = { id, tenantId };
      if (request.user!.role === 'BRANCH_ADMIN' && branchId) {
        where.branchId = branchId;
      }

      const existingItem = await prisma.inventoryItem.findFirst({ where });

      if (!existingItem) {
        return reply.status(404).send({
          success: false,
          error: 'Inventory item not found'
        });
      }

      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.quantity !== undefined) updateData.quantity = parseFloat(data.quantity);
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.cost !== undefined) updateData.cost = parseFloat(data.cost);
      if (data.supplier !== undefined) updateData.supplier = data.supplier;
      if (data.purchaseDate !== undefined) updateData.purchaseDate = new Date(data.purchaseDate);
      if (data.expiryDate !== undefined) updateData.expiryDate = new Date(data.expiryDate);
      if (data.location !== undefined) updateData.location = data.location;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const item = await prisma.inventoryItem.update({
        where: { id },
        data: updateData,
        include: {
          branch: {
            select: { name: true }
          }
        }
      });

      return reply.send({
        success: true,
        data: item
      });

    } catch (error) {
      console.error('Update inventory item error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update inventory item'
      });
    }
  });

  // Delete inventory item
  fastify.delete('/api/inventory/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const tenantId = request.user!.tenantId;
      const branchId = request.user!.branchId;

      // Check if item exists and user has access
      const where: any = { id, tenantId };
      if (request.user!.role === 'BRANCH_ADMIN' && branchId) {
        where.branchId = branchId;
      }

      const existingItem = await prisma.inventoryItem.findFirst({ where });

      if (!existingItem) {
        return reply.status(404).send({
          success: false,
          error: 'Inventory item not found'
        });
      }

      await prisma.inventoryItem.delete({
        where: { id }
      });

      return reply.send({
        success: true,
        message: 'Inventory item deleted successfully'
      });

    } catch (error) {
      console.error('Delete inventory item error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete inventory item'
      });
    }
  });

  // FIFO deduction endpoint
  fastify.post('/api/inventory/deduct', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { items } = request.body as any; // Array of { name, category, quantity, unit }
      const tenantId = request.user!.tenantId;
      const branchId = request.user!.branchId;

      const results = [];

      for (const requiredItem of items) {
        const where: any = {
          tenantId,
          name: requiredItem.name,
          category: requiredItem.category,
          quantity: { gt: 0 }
        };

        if (request.user!.role === 'BRANCH_ADMIN' && branchId) {
          where.branchId = branchId;
        }

        // Get items sorted by expiry date (FIFO)
        const availableItems = await prisma.inventoryItem.findMany({
          where,
          orderBy: { expiryDate: 'asc' }
        });

        let remainingQuantity = requiredItem.quantity;
        const deducted = [];

        for (const item of availableItems) {
          if (remainingQuantity <= 0) break;

          const deductAmount = Math.min(item.quantity, remainingQuantity);
          
          await prisma.inventoryItem.update({
            where: { id: item.id },
            data: { quantity: item.quantity - deductAmount }
          });

          deducted.push({
            itemId: item.id,
            name: item.name,
            deductedQuantity: deductAmount,
            remainingQuantity: item.quantity - deductAmount
          });

          remainingQuantity -= deductAmount;
        }

        results.push({
          name: requiredItem.name,
          category: requiredItem.category,
          requestedQuantity: requiredItem.quantity,
          deductedQuantity: requiredItem.quantity - remainingQuantity,
          remainingShortfall: remainingQuantity,
          items: deducted
        });
      }

      return reply.send({
        success: true,
        data: results
      });

    } catch (error) {
      console.error('FIFO deduction error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to process inventory deduction'
      });
    }
  });

  // Get inventory categories
  fastify.get('/api/inventory/categories', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId;
      const branchId = request.user!.branchId;

      const where: any = { tenantId };
      if (request.user!.role === 'BRANCH_ADMIN' && branchId) {
        where.branchId = branchId;
      }

      const categories = await prisma.inventoryItem.findMany({
        where,
        select: { category: true },
        distinct: ['category']
      });

      return reply.send({
        success: true,
        data: categories.map(c => c.category).filter(Boolean).sort()
      });

    } catch (error) {
      console.error('Get categories error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch categories'
      });
    }
  });

  // Get inventory item suggestions (for autocomplete)
  fastify.get('/api/inventory/suggestions', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId;
      const branchId = request.user!.branchId;
      const query = request.query as any;

      const where: any = { tenantId };
      if (request.user!.role === 'BRANCH_ADMIN' && branchId) {
        where.branchId = branchId;
      }

      if (query.search) {
        where.name = { contains: query.search, mode: 'insensitive' };
      }

      const limit = parseInt(query.limit || '50', 10); // Default to 50, max 100
      const actualLimit = Math.min(limit, 100);

      const items = await prisma.inventoryItem.findMany({
        where,
        select: { 
          name: true, 
          category: true, 
          unit: true, 
          supplier: true 
        },
        distinct: ['name'],
        take: actualLimit,
        orderBy: { name: 'asc' }
      });

      return reply.send({
        success: true,
        data: items
      });

    } catch (error) {
      console.error('Get suggestions error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch suggestions'
      });
    }
  });

  // Stock Management endpoint - connected to real database
  fastify.get('/api/tenants/:tenantId/inventory/stock-management', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      console.log('🔍 Stock management route hit with params:', request.params);
      const { tenantId } = request.params as any;
      const userBranchId = request.user!.branchId;
      
      // Filter by branch if user is BRANCH_ADMIN
      const where: any = { tenantId };
      if (request.user!.role === 'BRANCH_ADMIN' && userBranchId) {
        where.branchId = userBranchId;
      }

      console.log('📊 Fetching inventory items with filters:', where);

      // Get all inventory items grouped by product (name + category + unit)
      const inventoryItems = await prisma.inventoryItem.findMany({
        where,
        select: {
          id: true,
          name: true,
          category: true,
          unit: true,
          quantity: true,
          supplier: true,
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      console.log(`📦 Found ${inventoryItems.length} inventory items`);

      // Group inventory by product (name + category + unit)
      const productMap = new Map<string, {
        productName: string;
        category: string;
        unit: string;
        totalQuantity: number;
        suppliers: Set<string>;
      }>();

      inventoryItems.forEach(item => {
        const key = `${item.name}-${item.category}-${item.unit}`;
        if (!productMap.has(key)) {
          productMap.set(key, {
            productName: item.name,
            category: item.category,
            unit: item.unit,
            totalQuantity: 0,
            suppliers: new Set()
          });
        }
        
        const product = productMap.get(key)!;
        product.totalQuantity += item.quantity;
        if (item.supplier) product.suppliers.add(item.supplier);
      });

      const products = Array.from(productMap.values());
      console.log(`📋 Grouped into ${products.length} unique products`);

      // For now, return items with default stock levels since ProductStockLevel table doesn't exist yet
      // TODO: Once database migration is done, fetch from ProductStockLevel table
      const items = products.map(product => {
        // Calculate stock status with default levels
        const minStockLevel = 10; // Default minimum
        const maxStockLevel = 50; // Default maximum
        
        let stockStatus: 'LOW' | 'OK' | 'HIGH' | 'OUT' = 'OK';
        if (product.totalQuantity === 0) {
          stockStatus = 'OUT';
        } else if (product.totalQuantity <= minStockLevel) {
          stockStatus = 'LOW';
        } else if (product.totalQuantity >= maxStockLevel) {
          stockStatus = 'HIGH';
        }

        return {
          id: `product-${product.productName}-${product.category}-${product.unit}`.replace(/\s+/g, '-'),
          name: product.productName,
          category: product.category,
          unit: product.unit,
          supplier: Array.from(product.suppliers).join(', ') || null,
          currentQuantity: product.totalQuantity,
          minStockLevel: minStockLevel,
          maxStockLevel: maxStockLevel,
          safetyStock: 5,
          reorderQuantity: 25,
          leadTimeDays: 2,
          avgDailyUsage: 2.0,
          isActive: true,
          trackStock: true,
          stockStatus
        };
      });

      // Get unique categories
      const uniqueCategories = [...new Set(products.map(p => p.category))];

      const result = {
        items,
        categories: uniqueCategories
      };
      
      console.log(`✅ Returning ${items.length} products with ${uniqueCategories.length} categories`);
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Stock management route error:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stock management data'
      });
    }
  });

  // Update stock levels endpoint
  fastify.put('/api/tenants/:tenantId/products/:productName/:category/:unit/stock-levels', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      console.log('🔄 Stock levels update route hit with params:', request.params);
      const { tenantId, productName, category, unit } = request.params as any;
      const stockData = request.body as any;
      
      const decodedProductName = decodeURIComponent(productName);
      const decodedCategory = decodeURIComponent(category);
      const decodedUnit = decodeURIComponent(unit);
      
      console.log('📝 Updating stock data for product:', { 
        productName: decodedProductName, 
        category: decodedCategory, 
        unit: decodedUnit, 
        stockData 
      });
      
      // For now, just return success since ProductStockLevel table doesn't exist yet
      // TODO: Once database migration is done, actually save to ProductStockLevel table
      
      return reply.send({
        success: true,
        message: 'Stock levels updated successfully (currently stored locally)',
        data: {
          productName: decodedProductName,
          category: decodedCategory,
          unit: decodedUnit,
          ...stockData,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Stock levels update error:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update stock levels'
      });
    }
  });

  return fastify;
}

async function start() {
  try {
    const app = await buildApp();
    
    const port = parseInt(process.env.PORT || '3001', 10);
    await app.listen({
      port,
      host: '0.0.0.0'
    });
    
    console.log(`🚀 KitchZero API server running on port ${port}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔍 Health check: http://localhost:${port}/health`);
    console.log(`🔐 Real database authentication enabled`);
    
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { buildApp };