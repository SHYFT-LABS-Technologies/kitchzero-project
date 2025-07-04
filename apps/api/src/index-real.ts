import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { JWTPayload } from '@kitchzero/utils';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

// Simple in-memory store for failed login attempts by username
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

// Track unique users per IP to detect shared IPs
const ipUserTracking = new Map<string, Set<string>>();

// Clean up IP tracking every hour
setInterval(() => {
  ipUserTracking.clear();
}, 60 * 60 * 1000);

// Clean up old entries every 15 minutes
setInterval(() => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  for (const [key, value] of failedLoginAttempts.entries()) {
    if (value.lastAttempt < fifteenMinutesAgo) {
      failedLoginAttempts.delete(key);
    }
  }
}, 15 * 60 * 1000);

function checkUsernameRateLimit(username: string): { allowed: boolean; waitTime?: number } {
  const MAX_FAILED_ATTEMPTS = 10; // Increased from 5 to 10 for better user experience
  const LOCKOUT_TIME_MS = 10 * 60 * 1000; // Reduced from 15 to 10 minutes
  
  const attempts = failedLoginAttempts.get(username);
  if (!attempts) {
    return { allowed: true };
  }
  
  if (attempts.count >= MAX_FAILED_ATTEMPTS) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
    if (timeSinceLastAttempt < LOCKOUT_TIME_MS) {
      const waitTime = Math.ceil((LOCKOUT_TIME_MS - timeSinceLastAttempt) / 1000 / 60);
      return { allowed: false, waitTime };
    } else {
      // Reset after lockout period
      failedLoginAttempts.delete(username);
      return { allowed: true };
    }
  }
  
  return { allowed: true };
}

function recordFailedLogin(username: string) {
  const existing = failedLoginAttempts.get(username);
  failedLoginAttempts.set(username, {
    count: existing ? existing.count + 1 : 1,
    lastAttempt: new Date()
  });
}

function clearFailedLogins(username: string) {
  failedLoginAttempts.delete(username);
}

function trackUserIP(ip: string, username: string) {
  if (!ipUserTracking.has(ip)) {
    ipUserTracking.set(ip, new Set());
  }
  ipUserTracking.get(ip)!.add(username);
}

function isSharedIP(ip: string): boolean {
  const users = ipUserTracking.get(ip);
  return users ? users.size > 3 : false; // Consider IP shared if >3 unique users
}

function getIPUserCount(ip: string): number {
  const users = ipUserTracking.get(ip);
  return users ? users.size : 0;
}

// Unit conversion utilities
const unitConversions: Record<string, number> = {
  // Weight conversions (to grams as base)
  'mg': 0.001,
  'g': 1,
  'kg': 1000,
  
  // Volume conversions (to ml as base)
  'ml': 1,
  'cl': 10,
  'l': 1000,
  
  // Cooking measurements (approximate conversions to ml)
  'tsp': 5,
  'tbsp': 15,
  'cup': 240,
  
  // Count items (no conversion)
  'pieces': 1,
  'pcs': 1,
  'can': 1,
  'bottle': 1,
  'pack': 1,
  
  // Descriptive units (approximate conversions)
  'pinch': 0.5, // to grams
  'dash': 1,    // to grams
  'handful': 30, // to grams
  'slice': 1     // count
};

function convertUnits(quantity: number, fromUnit: string, toUnit: string): number {
  // If units are the same, no conversion needed
  if (fromUnit === toUnit) return quantity;
  
  // Get conversion categories
  const getUnitCategory = (unit: string) => {
    if (['mg', 'g', 'kg', 'pinch', 'dash', 'handful'].includes(unit)) return 'weight';
    if (['ml', 'cl', 'l', 'tsp', 'tbsp', 'cup'].includes(unit)) return 'volume';
    return 'count';
  };
  
  const fromCategory = getUnitCategory(fromUnit);
  const toCategory = getUnitCategory(toUnit);
  
  // Only convert within the same category
  if (fromCategory !== toCategory) {
    console.log(`⚠️ Cannot convert ${fromUnit} to ${toUnit} - different categories`);
    return quantity; // Return original if can't convert
  }
  
  // Convert to base unit, then to target unit
  const fromMultiplier = unitConversions[fromUnit] || 1;
  const toMultiplier = unitConversions[toUnit] || 1;
  
  const baseQuantity = quantity * fromMultiplier;
  const convertedQuantity = baseQuantity / toMultiplier;
  
  console.log(`🔄 Converted ${quantity} ${fromUnit} to ${convertedQuantity.toFixed(3)} ${toUnit}`);
  return convertedQuantity;
}

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

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
  
  // Global rate limiter with reasonable limits for normal usage
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300', 10), // 300 requests per minute is reasonable
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute window
    keyGenerator: (request) => {
      // For authenticated requests, ALWAYS use user-specific rate limiting
      // This ensures users sharing IPs don't affect each other
      if (request.user?.userId) {
        return `user:${request.user.userId}`;
      }
      
      // For unauthenticated requests, use IP-based but with higher limits
      // to accommodate shared IPs (offices, public WiFi, etc.)
      return `ip:${request.ip}`;
    },
    // Dynamic limits based on authentication status
    max: (request) => {
      if (request.user?.userId) {
        // Authenticated users: reasonable per-user limits (5 requests per second max)
        return parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300', 10);
      } else {
        // Unauthenticated requests: higher limits for shared IPs
        return parseInt(process.env.RATE_LIMIT_IP_MAX_REQUESTS || '1000', 10);
      }
    },
    errorResponseBuilder: function (request, context) {
      const isAuthenticated = !!request.user?.userId;
      return {
        success: false,
        error: isAuthenticated 
          ? `Rate limit exceeded for your account. Please try again in ${Math.round(context.ttl / 1000)} seconds.`
          : `Rate limit exceeded from this IP address. Please try again in ${Math.round(context.ttl / 1000)} seconds.`,
        retryAfter: context.ttl
      };
    },
    skipOnError: false,
    allowList: ['127.0.0.1'] // Allow localhost for development
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

  // Login-specific rate limiter with generous limits for shared IPs
  await fastify.register(rateLimit, {
    max: parseInt(process.env.LOGIN_RATE_LIMIT_IP_MAX || '100', 10), // Much higher limit for shared IPs
    timeWindow: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    keyGenerator: (request) => {
      // For login attempts, use IP-based limiting with generous limits for shared IPs
      const ip = request.ip || 'unknown';
      return `login:${ip}`;
    },
    errorResponseBuilder: function (request, context) {
      return {
        success: false,
        error: `Too many login attempts from this IP address. This may be due to multiple users sharing the same connection (office/public WiFi). Please try again in ${Math.round(context.ttl / 1000 / 60)} minutes.`,
        retryAfter: context.ttl
      };
    }
  });

  // Real authentication endpoints
  fastify.post('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body as any;

    console.log(`🔐 Login attempt for username: ${username}`);

    // Check username-specific rate limiting
    if (username) {
      const usernameCheck = checkUsernameRateLimit(username);
      if (!usernameCheck.allowed) {
        console.log(`🚫 Username rate limit exceeded for: ${username}`);
        return reply.status(429).send({
          success: false,
          error: `Too many failed login attempts for this username. Please try again in ${usernameCheck.waitTime} minutes.`,
          retryAfter: usernameCheck.waitTime ? usernameCheck.waitTime * 60 : 900
        });
      }
    }

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
        // Record failed attempt for this username
        if (username) {
          recordFailedLogin(username);
        }
        return reply.status(401).send({
          success: false,
          error: 'Invalid credentials'
        });
      }

      console.log(`👤 Found user: ${user.username}, checking password...`);
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      
      if (!passwordMatch) {
        console.log(`❌ Password mismatch for user: ${username}`);
        // Record failed attempt for this username
        if (username) {
          recordFailedLogin(username);
        }
        return reply.status(401).send({
          success: false,
          error: 'Invalid credentials'
        });
      }

      console.log(`✅ Login successful for user: ${username}`);
      
      // Track this user's IP for shared IP detection
      const clientIP = request.ip || 'unknown';
      trackUserIP(clientIP, username);
      
      // Clear any failed login attempts for successful login
      if (username) {
        clearFailedLogins(username);
      }
      
      // Log shared IP information for monitoring
      if (isSharedIP(clientIP)) {
        console.log(`🏢 Shared IP detected: ${clientIP} has ${getIPUserCount(clientIP)} unique users`);
      }

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

  // Waste Logging Endpoints

  // Get waste logs
  fastify.get('/api/waste-logs', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId;
      const branchId = request.user!.branchId;
      const query = request.query as any;

      console.log(`📊 Fetching waste logs for tenant: ${tenantId}, user role: ${request.user!.role}`);

      const where: any = { tenantId };
      if (request.user!.role === 'BRANCH_ADMIN' && branchId) {
        where.branchId = branchId;
      }

      // Add filters
      if (query.wasteType) where.wasteType = query.wasteType;
      if (query.startDate) where.createdAt = { gte: new Date(query.startDate) };
      if (query.endDate) {
        where.createdAt = where.createdAt ? 
          { ...where.createdAt, lte: new Date(query.endDate) } : 
          { lte: new Date(query.endDate) };
      }

      // Pagination
      const page = parseInt(query.page || '1', 10);
      const limit = parseInt(query.limit || '20', 10);
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.wasteLog.findMany({
          where,
          include: {
            branch: { select: { name: true } },
            recipe: { select: { name: true } },
            production: { select: { batchNumber: true } },
            loggedByUser: { select: { username: true, role: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.wasteLog.count({ where })
      ]);

      return reply.send({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get waste logs error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch waste logs'
      });
    }
  });

  // Create waste log
  fastify.post('/api/waste-logs', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const data = request.body as any;
      const tenantId = request.user!.tenantId;
      const userBranchId = request.user!.branchId;

      console.log(`📝 Creating waste log for tenant: ${tenantId}`);

      // For branch admin users, force their branch
      let branchId = data.branchId;
      if (request.user!.role === 'BRANCH_ADMIN') {
        if (!userBranchId) {
          return reply.status(400).send({
            success: false,
            error: 'Branch admin must be assigned to a branch'
          });
        }
        branchId = userBranchId;
      } else if (!branchId) {
        // Find first available branch for non-branch admins
        const firstBranch = await prisma.branch.findFirst({
          where: { tenantId }
        });
        if (!firstBranch) {
          return reply.status(400).send({
            success: false,
            error: 'No branches found for this tenant'
          });
        }
        branchId = firstBranch.id;
      }

      // Calculate cost and deduct inventory based on waste type
      let cost = data.cost || 0;
      let inventoryDeducted = false;
      
      if (data.wasteType === 'RAW') {
        // For RAW materials, deduct directly from inventory
        const inventoryItems = await prisma.inventoryItem.findMany({
          where: {
            tenantId,
            branchId,
            name: data.itemName,
            category: data.category
          },
          orderBy: { expiryDate: 'asc' } // FIFO
        });

        if (inventoryItems.length > 0) {
          let remainingQuantity = data.quantity;
          let totalCost = 0;

          // Calculate cost using FIFO and deduct inventory
          for (const item of inventoryItems) {
            if (remainingQuantity <= 0) break;

            const deductAmount = Math.min(item.quantity, remainingQuantity);
            const proportionalCost = (item.cost / item.quantity) * deductAmount;
            
            totalCost += proportionalCost;
            remainingQuantity -= deductAmount;

            // Update inventory quantity
            const newQuantity = item.quantity - deductAmount;
            await prisma.inventoryItem.update({
              where: { id: item.id },
              data: { quantity: newQuantity }
            });

            console.log(`📦 Deducted ${deductAmount} ${data.unit} of ${data.itemName} from inventory item ${item.id} (remaining: ${newQuantity})`);
          }

          if (!cost) cost = totalCost;
          inventoryDeducted = true;
          
          if (remainingQuantity > 0) {
            console.log(`⚠️ Warning: Could not deduct full quantity. Missing ${remainingQuantity} ${data.unit} from inventory`);
          }
        } else {
          console.log(`⚠️ Warning: No inventory found for ${data.itemName} (${data.category}) - waste logged without inventory deduction`);
        }
      } else if (data.wasteType === 'PRODUCT') {
        // For PRODUCT waste, find the recipe and deduct ingredients
        console.log(`🍞 Processing PRODUCT waste: ${data.quantity} ${data.unit} of ${data.itemName}`);
        
        // First try to find recipe by recipeId if provided
        let recipe = null;
        if (data.recipeId) {
          recipe = await prisma.recipe.findFirst({
            where: { id: data.recipeId, tenantId },
            include: { ingredients: true }
          });
        }
        
        // If no recipe found by ID, try to find by product name
        if (!recipe) {
          recipe = await prisma.recipe.findFirst({
            where: { 
              name: { contains: data.itemName, mode: 'insensitive' },
              tenantId 
            },
            include: { ingredients: true }
          });
        }

        if (recipe && recipe.ingredients.length > 0) {
          console.log(`📋 Found recipe: ${recipe.name} (${recipe.ingredients.length} ingredients)`);
          
          let totalIngredientCost = 0;
          const wasteMultiplier = data.quantity; // How many units of the product were wasted
          
          // Deduct each ingredient based on recipe × waste quantity
          for (const ingredient of recipe.ingredients) {
            const requiredQuantity = ingredient.quantity * wasteMultiplier;
            
            console.log(`🥕 Processing ingredient: ${requiredQuantity} ${ingredient.unit} of ${ingredient.ingredientName}`);
            
            // Find inventory items for this ingredient
            const inventoryItems = await prisma.inventoryItem.findMany({
              where: {
                tenantId,
                branchId,
                name: ingredient.ingredientName,
                category: ingredient.category
              },
              orderBy: { expiryDate: 'asc' } // FIFO
            });

            if (inventoryItems.length > 0) {
              // Convert required quantity from recipe unit to inventory unit
              const firstInventoryItem = inventoryItems[0];
              const convertedRequiredQuantity = convertUnits(requiredQuantity, ingredient.unit, firstInventoryItem.unit);
              
              console.log(`  🔄 Recipe needs ${requiredQuantity} ${ingredient.unit}, converted to ${convertedRequiredQuantity.toFixed(3)} ${firstInventoryItem.unit} for inventory deduction`);
              
              let remainingQuantity = convertedRequiredQuantity;
              let ingredientCost = 0;

              // Deduct ingredient using FIFO
              for (const item of inventoryItems) {
                if (remainingQuantity <= 0) break;

                const deductAmount = Math.min(item.quantity, remainingQuantity);
                const proportionalCost = (item.cost / item.quantity) * deductAmount;
                
                ingredientCost += proportionalCost;
                remainingQuantity -= deductAmount;

                // Update inventory quantity
                const newQuantity = item.quantity - deductAmount;
                await prisma.inventoryItem.update({
                  where: { id: item.id },
                  data: { quantity: newQuantity }
                });

                console.log(`  📦 Deducted ${deductAmount} ${item.unit} of ${ingredient.ingredientName} from inventory item ${item.id} (remaining: ${newQuantity})`);
              }

              totalIngredientCost += ingredientCost;
              inventoryDeducted = true;
              
              if (remainingQuantity > 0) {
                // Convert remaining quantity back to recipe unit for clearer messaging
                const remainingInRecipeUnit = convertUnits(remainingQuantity, firstInventoryItem.unit, ingredient.unit);
                console.log(`  ⚠️ Warning: Could not deduct full quantity of ${ingredient.ingredientName}. Missing ${remainingInRecipeUnit.toFixed(3)} ${ingredient.unit} (${remainingQuantity.toFixed(3)} ${firstInventoryItem.unit}) from inventory`);
              }
            } else {
              console.log(`  ⚠️ Warning: No inventory found for ingredient ${ingredient.ingredientName} (${ingredient.category})`);
            }
          }

          if (!cost) cost = totalIngredientCost;
          console.log(`💰 Total ingredient cost for wasted product: $${totalIngredientCost.toFixed(2)}`);
        } else {
          console.log(`⚠️ Warning: No recipe found for product ${data.itemName} - waste logged without ingredient deduction`);
          
          // Fallback: try to deduct the finished product directly from inventory
          const inventoryItems = await prisma.inventoryItem.findMany({
            where: {
              tenantId,
              branchId,
              name: data.itemName,
              category: data.category
            },
            orderBy: { expiryDate: 'asc' }
          });

          if (inventoryItems.length > 0) {
            let remainingQuantity = data.quantity;
            let totalCost = 0;

            for (const item of inventoryItems) {
              if (remainingQuantity <= 0) break;

              const deductAmount = Math.min(item.quantity, remainingQuantity);
              const proportionalCost = (item.cost / item.quantity) * deductAmount;
              
              totalCost += proportionalCost;
              remainingQuantity -= deductAmount;

              const newQuantity = item.quantity - deductAmount;
              await prisma.inventoryItem.update({
                where: { id: item.id },
                data: { quantity: newQuantity }
              });

              console.log(`📦 Deducted ${deductAmount} ${data.unit} of finished product ${data.itemName} from inventory item ${item.id} (remaining: ${newQuantity})`);
            }

            if (!cost) cost = totalCost;
            inventoryDeducted = true;
          }
        }
      }

      // Create waste log
      const wasteLog = await prisma.wasteLog.create({
        data: {
          itemName: data.itemName,
          category: data.category || '',
          quantity: parseFloat(data.quantity),
          unit: data.unit,
          wasteType: data.wasteType,
          reason: data.reason,
          tags: data.tags || [],
          recipeId: data.recipeId || null,
          productionId: data.productionId || null,
          location: data.location || null,
          preventable: data.preventable !== false,
          severity: data.severity || 'MEDIUM',
          cost: cost,
          tenantId,
          branchId,
          loggedBy: request.user!.userId
        },
        include: {
          branch: { select: { name: true } },
          recipe: { select: { name: true } },
          production: { select: { batchNumber: true } }
        }
      });

      console.log(`✅ Waste log created successfully: ${wasteLog.id} ${inventoryDeducted ? '(inventory updated)' : '(no inventory deduction)'}`);

      return reply.status(201).send({
        success: true,
        data: wasteLog,
        inventoryDeducted
      });

    } catch (error) {
      console.error('❌ Create waste log error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create waste log'
      });
    }
  });

  // Update waste log
  fastify.put('/api/waste-logs/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const tenantId = request.user!.tenantId;
      const branchId = request.user!.branchId;

      const where: any = { id, tenantId };
      if (request.user!.role === 'BRANCH_ADMIN' && branchId) {
        where.branchId = branchId;
      }

      const existingLog = await prisma.wasteLog.findFirst({ where });
      if (!existingLog) {
        return reply.status(404).send({
          success: false,
          error: 'Waste log not found'
        });
      }

      const updateData: any = {};
      if (data.reason !== undefined) updateData.reason = data.reason;
      if (data.tags !== undefined) updateData.tags = data.tags;

      const updatedLog = await prisma.wasteLog.update({
        where: { id },
        data: updateData,
        include: {
          branch: { select: { name: true } },
          recipe: { select: { name: true } },
          production: { select: { batchNumber: true } }
        }
      });

      return reply.send({
        success: true,
        data: updatedLog
      });

    } catch (error) {
      console.error('Update waste log error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update waste log'
      });
    }
  });

  // Delete waste log
  fastify.delete('/api/waste-logs/:id', {
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

      const existingLog = await prisma.wasteLog.findFirst({ where });
      if (!existingLog) {
        return reply.status(404).send({
          success: false,
          error: 'Waste log not found'
        });
      }

      await prisma.wasteLog.delete({ where: { id } });

      return reply.send({
        success: true,
        message: 'Waste log deleted successfully'
      });

    } catch (error) {
      console.error('Delete waste log error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete waste log'
      });
    }
  });

  // Get waste stats
  fastify.get('/api/waste-stats', {
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

      // Date filters
      if (query.startDate) where.createdAt = { gte: new Date(query.startDate) };
      if (query.endDate) {
        where.createdAt = where.createdAt ? 
          { ...where.createdAt, lte: new Date(query.endDate) } : 
          { lte: new Date(query.endDate) };
      }

      const stats = await prisma.wasteLog.aggregate({
        where,
        _sum: { cost: true, quantity: true },
        _count: { id: true }
      });

      const categoryBreakdown = await prisma.wasteLog.groupBy({
        by: ['category'],
        where,
        _sum: { cost: true, quantity: true },
        _count: { id: true }
      });

      const reasonBreakdown = await prisma.wasteLog.groupBy({
        by: ['reason'],
        where,
        _sum: { cost: true },
        _count: { id: true },
        orderBy: { _sum: { cost: 'desc' } },
        take: 10
      });

      return reply.send({
        success: true,
        data: {
          totalCost: stats._sum.cost || 0,
          totalQuantity: stats._sum.quantity || 0,
          totalLogs: stats._count.id,
          categoryBreakdown,
          reasonBreakdown
        }
      });

    } catch (error) {
      console.error('Get waste stats error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch waste stats'
      });
    }
  });

  // Recipe Management Endpoints

  // Get recipes
  fastify.get('/api/recipes', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const tenantId = request.user!.tenantId;
      const query = request.query as any;

      console.log(`📖 Fetching recipes for tenant: ${tenantId}`);

      const where: any = { tenantId };

      // Add search filter
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { category: { contains: query.search, mode: 'insensitive' } }
        ];
      }

      // Add category filter
      if (query.category) {
        where.category = query.category;
      }

      // Add active filter
      if (query.isActive !== undefined) {
        where.isActive = query.isActive === 'true';
      }

      // Pagination
      const page = parseInt(query.page || '1', 10);
      const limit = parseInt(query.limit || '20', 10);
      const skip = (page - 1) * limit;

      const [recipes, total] = await Promise.all([
        prisma.recipe.findMany({
          where,
          include: {
            ingredients: {
              select: {
                id: true,
                ingredientName: true,
                quantity: true,
                unit: true,
                category: true,
                order: true
              }
            },
            branch: {
              select: {
                name: true
              }
            },
            _count: {
              select: {
                productions: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.recipe.count({ where })
      ]);

      console.log(`📊 Found ${recipes.length} recipes out of ${total} total`);

      return reply.send({
        success: true,
        data: {
          recipes,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get recipes error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch recipes'
      });
    }
  });

  // Get single recipe
  fastify.get('/api/recipes/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const tenantId = request.user!.tenantId;

      const recipe = await prisma.recipe.findFirst({
        where: { id, tenantId },
        include: {
          ingredients: {
            select: {
              id: true,
              ingredientName: true,
              quantity: true,
              unit: true,
              category: true,
              order: true
            }
          },
          branch: {
            select: {
              name: true
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
        return reply.status(404).send({
          success: false,
          error: 'Recipe not found'
        });
      }

      return reply.send({
        success: true,
        data: recipe
      });

    } catch (error) {
      console.error('Get recipe error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch recipe'
      });
    }
  });

  // Create recipe
  fastify.post('/api/recipes', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const data = request.body as any;
      const tenantId = request.user!.tenantId;

      console.log(`📝 Creating recipe for tenant: ${tenantId}`);

      const recipeData = {
        name: data.name,
        category: data.category || 'Main Course',
        description: data.description || null,
        instructions: data.instructions || [],
        yield: parseFloat(data.yield) || 1,
        yieldUnit: data.yieldUnit || 'portion',
        preparationTime: parseInt(data.preparationTime) || null,
        cookingTime: parseInt(data.cookingTime) || null,
        isActive: data.isActive !== false,
        tenantId
      };

      const recipe = await prisma.recipe.create({
        data: {
          ...recipeData,
          ingredients: {
            create: (data.ingredients || []).map((ingredient: any) => ({
              ingredientName: ingredient.ingredientName || ingredient.itemName,
              category: ingredient.category || 'General',
              quantity: parseFloat(ingredient.quantity),
              unit: ingredient.unit,
              notes: ingredient.notes || null,
              order: ingredient.order || 0
            }))
          }
        },
        include: {
          ingredients: {
            select: {
              id: true,
              ingredientName: true,
              quantity: true,
              unit: true,
              category: true,
              order: true
            }
          },
          branch: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              productions: true
            }
          }
        }
      });

      console.log(`✅ Recipe created successfully: ${recipe.id}`);

      return reply.status(201).send({
        success: true,
        data: recipe
      });

    } catch (error) {
      console.error('❌ Create recipe error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create recipe'
      });
    }
  });

  // Update recipe
  fastify.put('/api/recipes/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const tenantId = request.user!.tenantId;

      const existingRecipe = await prisma.recipe.findFirst({
        where: { id, tenantId }
      });

      if (!existingRecipe) {
        return reply.status(404).send({
          success: false,
          error: 'Recipe not found'
        });
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.instructions !== undefined) updateData.instructions = data.instructions;
      if (data.yield !== undefined) updateData.yield = parseFloat(data.yield);
      if (data.yieldUnit !== undefined) updateData.yieldUnit = data.yieldUnit;
      if (data.preparationTime !== undefined) updateData.preparationTime = parseInt(data.preparationTime);
      if (data.cookingTime !== undefined) updateData.cookingTime = parseInt(data.cookingTime);
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const recipe = await prisma.recipe.update({
        where: { id },
        data: updateData,
        include: {
          ingredients: {
            select: {
              id: true,
              ingredientName: true,
              quantity: true,
              unit: true,
              category: true,
              order: true
            }
          },
          branch: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              productions: true
            }
          }
        }
      });

      return reply.send({
        success: true,
        data: recipe
      });

    } catch (error) {
      console.error('Update recipe error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update recipe'
      });
    }
  });

  // Delete recipe
  fastify.delete('/api/recipes/:id', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const tenantId = request.user!.tenantId;

      const existingRecipe = await prisma.recipe.findFirst({
        where: { id, tenantId }
      });

      if (!existingRecipe) {
        return reply.status(404).send({
          success: false,
          error: 'Recipe not found'
        });
      }

      await prisma.recipe.delete({
        where: { id }
      });

      return reply.send({
        success: true,
        message: 'Recipe deleted successfully'
      });

    } catch (error) {
      console.error('Delete recipe error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete recipe'
      });
    }
  });

  // Branch Management Endpoints

  // Get branches for a tenant
  fastify.get('/api/tenants/:tenantId/branches', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;
      const userBranchId = request.user!.branchId;

      // Ensure user can only access their tenant's branches
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      console.log(`🏢 Fetching branches for tenant: ${tenantId}, user role: ${userRole}`);

      let branches;
      if (userRole === 'BRANCH_ADMIN' && userBranchId) {
        // Branch admins can only see their own branch
        branches = await prisma.branch.findMany({
          where: { 
            tenantId,
            id: userBranchId 
          },
          select: {
            id: true,
            name: true,
            address: true,
            createdAt: true
          },
          orderBy: { name: 'asc' }
        });
      } else {
        // Restaurant admins and Kitchzero admins can see all branches
        branches = await prisma.branch.findMany({
          where: { tenantId },
          select: {
            id: true,
            name: true,
            address: true,
            createdAt: true,
            _count: {
              select: {
                users: true,
                inventoryItems: true
              }
            }
          },
          orderBy: { name: 'asc' }
        });
      }

      console.log(`📊 Found ${branches.length} branches for user role: ${userRole}`);

      return reply.send({
        success: true,
        data: branches
      });

    } catch (error) {
      console.error('❌ Get branches error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch branches'
      });
    }
  });

  // Create new branch (only for restaurant admins and above)
  fastify.post('/api/tenants/:tenantId/branches', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const data = request.body as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      // Ensure user can only create branches for their tenant
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Only restaurant admins and above can create branches
      if (userRole === 'BRANCH_ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to create branches'
        });
      }

      console.log(`🏢 Creating new branch for tenant: ${tenantId}`);

      const branch = await prisma.branch.create({
        data: {
          name: data.name,
          address: data.address,
          tenantId
        },
        select: {
          id: true,
          name: true,
          address: true,
          createdAt: true
        }
      });

      console.log(`✅ Branch created successfully: ${branch.id}`);

      return reply.status(201).send({
        success: true,
        data: branch
      });

    } catch (error) {
      console.error('❌ Create branch error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create branch'
      });
    }
  });

  // Update branch (only for restaurant admins and above)
  fastify.put('/api/tenants/:tenantId/branches/:branchId', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId, branchId } = request.params as any;
      const data = request.body as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      // Ensure user can only update branches for their tenant
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Only restaurant admins and above can update branches
      if (userRole === 'BRANCH_ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to update branches'
        });
      }

      console.log(`🏢 Updating branch ${branchId} for tenant: ${tenantId}`);

      const existingBranch = await prisma.branch.findFirst({
        where: { id: branchId, tenantId }
      });

      if (!existingBranch) {
        return reply.status(404).send({
          success: false,
          error: 'Branch not found'
        });
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.address !== undefined) updateData.address = data.address;

      const branch = await prisma.branch.update({
        where: { id: branchId },
        data: updateData,
        select: {
          id: true,
          name: true,
          address: true,
          createdAt: true
        }
      });

      console.log(`✅ Branch updated successfully: ${branch.id}`);

      return reply.send({
        success: true,
        data: branch
      });

    } catch (error) {
      console.error('❌ Update branch error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update branch'
      });
    }
  });

  // Production Management Endpoints

  // Get productions for a tenant
  fastify.get('/api/tenants/:tenantId/productions', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const query = request.query as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;
      const userBranchId = request.user!.branchId;

      // Ensure user can only access their tenant's productions
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      console.log(`🏭 Fetching productions for tenant: ${tenantId}, user role: ${userRole}`);

      const where: any = { tenantId };

      // Branch admins can only see productions from their branch
      if (userRole === 'BRANCH_ADMIN' && userBranchId) {
        where.branchId = userBranchId;
      }

      // Add filters
      if (query.status) {
        where.status = query.status;
      }

      if (query.dateFrom) {
        where.productionDate = { gte: new Date(query.dateFrom) };
      }

      // Pagination
      const page = parseInt(query.page || '1', 10);
      const limit = parseInt(query.limit || '20', 10);
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

      console.log(`📊 Found ${productions.length} productions out of ${total} total`);

      return reply.send({
        success: true,
        data: {
          productions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Get productions error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch productions'
      });
    }
  });

  // Get production analytics
  fastify.get('/api/tenants/:tenantId/productions/analytics', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const query = request.query as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;
      const userBranchId = request.user!.branchId;

      // Ensure user can only access their tenant's analytics
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      const where: any = { tenantId };

      // Branch admins can only see analytics from their branch
      if (userRole === 'BRANCH_ADMIN' && userBranchId) {
        where.branchId = userBranchId;
      }

      if (query.dateFrom) {
        where.productionDate = { gte: new Date(query.dateFrom) };
      }

      const [summary, topRecipes] = await Promise.all([
        prisma.production.aggregate({
          where,
          _sum: {
            quantityProduced: true,
            totalCost: true
          },
          _avg: {
            qualityRating: true,
            unitCost: true
          },
          _count: {
            id: true
          }
        }),
        prisma.production.groupBy({
          by: ['recipeId'],
          where,
          _sum: {
            quantityProduced: true,
            totalCost: true
          },
          _count: {
            id: true
          },
          orderBy: {
            _sum: {
              quantityProduced: 'desc'
            }
          },
          take: 10
        })
      ]);

      // Get recipe names for top recipes
      const recipeIds = topRecipes.map(r => r.recipeId);
      const recipes = await prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
        select: { id: true, name: true }
      });

      const topRecipesWithNames = topRecipes.map(recipe => {
        const recipeInfo = recipes.find(r => r.id === recipe.recipeId);
        return {
          recipeId: recipe.recipeId,
          recipeName: recipeInfo?.name || 'Unknown Recipe',
          productionCount: recipe._count.id,
          totalQuantity: recipe._sum.quantityProduced || 0,
          totalCost: recipe._sum.totalCost || 0
        };
      });

      return reply.send({
        success: true,
        data: {
          summary: {
            totalProductions: summary._count.id,
            totalQuantityProduced: summary._sum.quantityProduced || 0,
            totalCost: summary._sum.totalCost || 0,
            averageQualityRating: summary._avg.qualityRating || 0,
            averageCostPerUnit: summary._avg.unitCost || 0
          },
          topRecipes: topRecipesWithNames
        }
      });

    } catch (error) {
      console.error('❌ Get production analytics error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch production analytics'
      });
    }
  });

  // User Management Endpoints

  // Get users for a tenant (with optional branch filtering)
  fastify.get('/api/tenants/:tenantId/users', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const query = request.query as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;
      const userBranchId = request.user!.branchId;

      // Ensure user can only access their tenant's users
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      console.log(`👥 Fetching users for tenant: ${tenantId}, user role: ${userRole}`);

      const where: any = { tenantId };

      // Branch admins can only see users in their branch
      if (userRole === 'BRANCH_ADMIN' && userBranchId) {
        where.branchId = userBranchId;
      }

      // Add branch filter if specified
      if (query.branchId) {
        where.branchId = query.branchId;
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          role: true,
          branchId: true,
          createdAt: true,
          branch: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`📊 Found ${users.length} users for user role: ${userRole}`);

      return reply.send({
        success: true,
        data: users
      });

    } catch (error) {
      console.error('❌ Get users error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  });

  // Create new user and assign to branch
  fastify.post('/api/tenants/:tenantId/users', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const data = request.body as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      // Ensure user can only create users for their tenant
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Only restaurant admins and above can create users
      if (userRole === 'BRANCH_ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to create users'
        });
      }

      console.log(`👤 Creating new user for tenant: ${tenantId}`);

      // Check if username already exists
      const existingUser = await prisma.user.findUnique({
        where: { username: data.username }
      });

      if (existingUser) {
        return reply.status(400).send({
          success: false,
          error: 'Username already exists'
        });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
      const passwordHash = await bcrypt.hash(data.password, saltRounds);

      const user = await prisma.user.create({
        data: {
          username: data.username,
          passwordHash,
          role: data.role || 'BRANCH_ADMIN',
          tenantId,
          branchId: data.branchId || null,
          mustChangePassword: data.mustChangePassword !== false
        },
        select: {
          id: true,
          username: true,
          role: true,
          branchId: true,
          createdAt: true,
          branch: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        }
      });

      console.log(`✅ User created successfully: ${user.id}`);

      return reply.status(201).send({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('❌ Create user error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create user'
      });
    }
  });

  // Update user (assign to different branch, change role)
  fastify.put('/api/tenants/:tenantId/users/:userId', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId, userId } = request.params as any;
      const data = request.body as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;
      const currentUserId = request.user!.userId;

      // Ensure user can only update users for their tenant
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Only restaurant admins and above can update users
      if (userRole === 'BRANCH_ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to update users'
        });
      }

      // Users cannot update themselves (to prevent lockout)
      if (userId === currentUserId) {
        return reply.status(400).send({
          success: false,
          error: 'Cannot modify your own account'
        });
      }

      console.log(`👤 Updating user ${userId} for tenant: ${tenantId}`);

      const existingUser = await prisma.user.findFirst({
        where: { id: userId, tenantId }
      });

      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: 'User not found'
        });
      }

      const updateData: any = {};
      if (data.branchId !== undefined) updateData.branchId = data.branchId;
      if (data.role !== undefined) updateData.role = data.role;

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          role: true,
          branchId: true,
          createdAt: true,
          branch: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        }
      });

      console.log(`✅ User updated successfully: ${user.id}`);

      return reply.send({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('❌ Update user error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update user'
      });
    }
  });

  // Dashboard Analytics Endpoints

  // Get dashboard statistics for a tenant
  fastify.get('/api/tenants/:tenantId/dashboard/stats', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const query = request.query as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;
      const userBranchId = request.user!.branchId;

      // Ensure user can only access their tenant's dashboard
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      console.log(`📊 Fetching dashboard stats for tenant: ${tenantId}, user role: ${userRole}`);

      const baseWhere: any = { tenantId };
      
      // Branch admins can only see data from their branch
      if (userRole === 'BRANCH_ADMIN' && userBranchId) {
        baseWhere.branchId = userBranchId;
      }

      // Calculate date range for "this week"
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of current week
      weekStart.setHours(0, 0, 0, 0);

      const [
        totalInventory,
        wasteThisWeek,
        expiringItems,
        activeRecipes,
        productionBatches,
        totalUsers,
        totalBranches
      ] = await Promise.all([
        // Total inventory count
        prisma.inventoryItem.count({
          where: baseWhere
        }),
        
        // Waste this week (sum of cost)
        prisma.wasteLog.aggregate({
          where: {
            ...baseWhere,
            createdAt: { gte: weekStart }
          },
          _sum: { cost: true }
        }),
        
        // Expiring items (next 7 days)
        prisma.inventoryItem.count({
          where: {
            ...baseWhere,
            expiryDate: {
              gte: now,
              lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Active recipes count
        prisma.recipe.count({
          where: {
            tenantId,
            isActive: true
          }
        }),
        
        // Production batches this week
        prisma.production.count({
          where: {
            ...baseWhere,
            createdAt: { gte: weekStart }
          }
        }),
        
        // Total users (only for restaurant admins)
        userRole === 'RESTAURANT_ADMIN' || userRole === 'KITCHZERO_ADMIN' 
          ? prisma.user.count({ where: { tenantId } })
          : null,
        
        // Total branches (only for restaurant admins)
        userRole === 'RESTAURANT_ADMIN' || userRole === 'KITCHZERO_ADMIN'
          ? prisma.branch.count({ where: { tenantId } })
          : null
      ]);

      // Calculate sustainability score (simple algorithm)
      const totalWasteValue = wasteThisWeek._sum.cost || 0;
      const sustainabilityScore = Math.max(0, Math.min(100, 100 - (totalWasteValue / 10)));

      const stats = {
        totalInventory,
        wasteThisWeek: totalWasteValue,
        expiringItems,
        sustainabilityScore: Math.round(sustainabilityScore),
        activeRecipes,
        productionBatches,
        ...(totalUsers !== null && { users: totalUsers }),
        ...(totalBranches !== null && { branches: totalBranches })
      };

      console.log(`✅ Dashboard stats calculated for ${userRole}`);

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
  fastify.get('/api/tenants/:tenantId/dashboard/activity', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const query = request.query as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;
      const userBranchId = request.user!.branchId;

      // Ensure user can only access their tenant's activity
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      const baseWhere: any = { tenantId };
      
      // Branch admins can only see activity from their branch
      if (userRole === 'BRANCH_ADMIN' && userBranchId) {
        baseWhere.branchId = userBranchId;
      }

      const limit = parseInt(query.limit || '10', 10);

      // Get recent activities from different sources
      const [recentWaste, recentProductions, recentInventory] = await Promise.all([
        // Recent waste logs
        prisma.wasteLog.findMany({
          where: baseWhere,
          include: {
            loggedByUser: { select: { username: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: Math.ceil(limit / 3)
        }),
        
        // Recent productions
        prisma.production.findMany({
          where: baseWhere,
          include: {
            recipe: { select: { name: true } }
          },
          orderBy: { productionDate: 'desc' },
          take: Math.ceil(limit / 3)
        }),
        
        // Recent inventory additions
        prisma.inventoryItem.findMany({
          where: baseWhere,
          orderBy: { createdAt: 'desc' },
          take: Math.ceil(limit / 3)
        })
      ]);

      // Combine and format activities
      const activities: any[] = [];

      // Add waste activities
      recentWaste.forEach(waste => {
        activities.push({
          id: `waste-${waste.id}`,
          type: 'waste',
          title: 'Waste logged',
          description: `${waste.itemName} - ${waste.quantity} ${waste.unit} wasted`,
          timestamp: waste.createdAt.toISOString(),
          user: waste.loggedByUser?.username,
          status: waste.cost > 50 ? 'error' : 'warning'
        });
      });

      // Add production activities
      recentProductions.forEach(production => {
        activities.push({
          id: `production-${production.id}`,
          type: 'production',
          title: 'Production completed',
          description: `${production.recipe?.name} - ${production.quantityProduced} units produced`,
          timestamp: production.productionDate.toISOString(),
          user: production.producedBy,
          status: 'success'
        });
      });

      // Add inventory activities
      recentInventory.forEach(item => {
        activities.push({
          id: `inventory-${item.id}`,
          type: 'inventory',
          title: 'Inventory added',
          description: `${item.name} - ${item.quantity} ${item.unit} added`,
          timestamp: item.createdAt.toISOString(),
          user: null, // No user relation in InventoryItem
          status: 'success'
        });
      });

      // Sort by timestamp and limit results
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
        .map(activity => ({
          ...activity,
          timestamp: new Date(activity.timestamp).toLocaleString()
        }));

      return reply.send({
        success: true,
        data: sortedActivities
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
  fastify.get('/api/tenants/:tenantId/dashboard/waste-items', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const query = request.query as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;
      const userBranchId = request.user!.branchId;

      // Ensure user can only access their tenant's waste data
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      const baseWhere: any = { tenantId };
      
      // Branch admins can only see waste from their branch
      if (userRole === 'BRANCH_ADMIN' && userBranchId) {
        baseWhere.branchId = userBranchId;
      }

      const limit = parseInt(query.limit || '5', 10);

      // Get last 30 days for comparison
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [currentPeriod, previousPeriod] = await Promise.all([
        // Current period waste
        prisma.wasteLog.groupBy({
          by: ['itemName'],
          where: {
            ...baseWhere,
            createdAt: { gte: thirtyDaysAgo }
          },
          _sum: {
            quantity: true,
            cost: true
          },
          orderBy: {
            _sum: {
              cost: 'desc'
            }
          },
          take: limit
        }),
        
        // Previous period for trend calculation
        prisma.wasteLog.groupBy({
          by: ['itemName'],
          where: {
            ...baseWhere,
            createdAt: {
              gte: new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
              lt: thirtyDaysAgo
            }
          },
          _sum: {
            quantity: true,
            cost: true
          }
        })
      ]);

      // Calculate trends
      const topWasteItems = currentPeriod.map(current => {
        const previous = previousPeriod.find(p => p.itemName === current.itemName);
        const currentCost = current._sum.cost || 0;
        const previousCost = previous?._sum.cost || 0;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (currentCost > previousCost * 1.1) trend = 'up';
        else if (currentCost < previousCost * 0.9) trend = 'down';

        return {
          name: current.itemName,
          quantity: current._sum.quantity || 0,
          cost: currentCost,
          trend
        };
      });

      return reply.send({
        success: true,
        data: topWasteItems
      });

    } catch (error) {
      console.error('❌ Get dashboard waste items error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch top waste items'
      });
    }
  });

  // Tenant Settings Endpoints

  // Get tenant settings
  fastify.get('/api/tenants/:tenantId/settings', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const userTenantId = request.user!.tenantId;

      // Ensure user can only access their tenant's settings
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      console.log(`⚙️ Fetching settings for tenant: ${tenantId}`);

      // Try to get existing settings from database
      let settings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
        include: {
          tenant: {
            select: {
              name: true
            }
          }
        }
      });

      // If no settings exist, create default settings
      if (!settings) {
        console.log(`📝 Creating default settings for tenant: ${tenantId}`);
        
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true }
        });

        if (!tenant) {
          return reply.status(404).send({
            success: false,
            error: 'Tenant not found'
          });
        }

        settings = await prisma.tenantSettings.create({
          data: {
            tenantId,
            currency: 'LKR',
            currencySymbol: 'Rs.',
            timezone: 'Asia/Colombo',
            dateFormat: 'DD/MM/YYYY',
            language: 'en',
            businessName: tenant.name,
            businessAddress: 'Colombo, Sri Lanka',
            businessPhone: '+94 11 234 5678',
            businessEmail: 'info@restaurant.lk',
            taxRate: 8.0, // VAT rate in Sri Lanka
            notificationEmail: true,
            notificationSms: false,
            lowStockThreshold: 10,
            wasteAlertThreshold: 50
          },
          include: {
            tenant: {
              select: {
                name: true
              }
            }
          }
        });
      }

      console.log(`✅ Settings retrieved for tenant: ${tenantId}`);

      return reply.send({
        success: true,
        data: {
          currency: settings.currency,
          currencySymbol: settings.currencySymbol,
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
          language: settings.language,
          businessName: settings.businessName,
          businessAddress: settings.businessAddress,
          businessPhone: settings.businessPhone,
          businessEmail: settings.businessEmail,
          taxRate: settings.taxRate,
          notificationEmail: settings.notificationEmail,
          notificationSms: settings.notificationSms,
          lowStockThreshold: settings.lowStockThreshold,
          wasteAlertThreshold: settings.wasteAlertThreshold
        }
      });

    } catch (error) {
      console.error('❌ Get settings error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch settings'
      });
    }
  });

  // Update tenant settings
  fastify.put('/api/tenants/:tenantId/settings', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params as any;
      const settings = request.body as any;
      const userTenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      // Ensure user can only update their tenant's settings
      if (tenantId !== userTenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Only restaurant admins and above can update settings
      if (userRole === 'BRANCH_ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to update settings'
        });
      }

      console.log(`⚙️ Updating settings for tenant: ${tenantId}`);

      // Validate required fields
      const allowedCurrencies = ['LKR', 'USD', 'EUR', 'GBP', 'INR'];
      if (settings.currency && !allowedCurrencies.includes(settings.currency)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid currency code'
        });
      }

      // Validate numeric fields
      if (settings.taxRate !== undefined && (typeof settings.taxRate !== 'number' || settings.taxRate < 0 || settings.taxRate > 100)) {
        return reply.status(400).send({
          success: false,
          error: 'Tax rate must be a number between 0 and 100'
        });
      }

      if (settings.lowStockThreshold !== undefined && (typeof settings.lowStockThreshold !== 'number' || settings.lowStockThreshold < 0)) {
        return reply.status(400).send({
          success: false,
          error: 'Low stock threshold must be a non-negative number'
        });
      }

      if (settings.wasteAlertThreshold !== undefined && (typeof settings.wasteAlertThreshold !== 'number' || settings.wasteAlertThreshold < 0)) {
        return reply.status(400).send({
          success: false,
          error: 'Waste alert threshold must be a non-negative number'
        });
      }

      // Get currency symbol based on currency code
      const currencySymbols: Record<string, string> = {
        'LKR': 'Rs.',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'INR': '₹'
      };

      const updateData: any = {};
      
      // Update only provided fields
      if (settings.currency !== undefined) {
        updateData.currency = settings.currency;
        updateData.currencySymbol = currencySymbols[settings.currency] || 'Rs.';
      }
      if (settings.timezone !== undefined) updateData.timezone = settings.timezone;
      if (settings.dateFormat !== undefined) updateData.dateFormat = settings.dateFormat;
      if (settings.language !== undefined) updateData.language = settings.language;
      if (settings.businessName !== undefined) updateData.businessName = settings.businessName;
      if (settings.businessAddress !== undefined) updateData.businessAddress = settings.businessAddress;
      if (settings.businessPhone !== undefined) updateData.businessPhone = settings.businessPhone;
      if (settings.businessEmail !== undefined) updateData.businessEmail = settings.businessEmail;
      if (settings.taxRate !== undefined) updateData.taxRate = settings.taxRate;
      if (settings.notificationEmail !== undefined) updateData.notificationEmail = settings.notificationEmail;
      if (settings.notificationSms !== undefined) updateData.notificationSms = settings.notificationSms;
      if (settings.lowStockThreshold !== undefined) updateData.lowStockThreshold = settings.lowStockThreshold;
      if (settings.wasteAlertThreshold !== undefined) updateData.wasteAlertThreshold = settings.wasteAlertThreshold;

      // Update or create tenant settings
      const updatedSettings = await prisma.tenantSettings.upsert({
        where: { tenantId },
        update: updateData,
        create: {
          tenantId,
          currency: settings.currency || 'LKR',
          currencySymbol: currencySymbols[settings.currency] || 'Rs.',
          timezone: settings.timezone || 'Asia/Colombo',
          dateFormat: settings.dateFormat || 'DD/MM/YYYY',
          language: settings.language || 'en',
          businessName: settings.businessName || '',
          businessAddress: settings.businessAddress || 'Colombo, Sri Lanka',
          businessPhone: settings.businessPhone || '+94 11 234 5678',
          businessEmail: settings.businessEmail || 'info@restaurant.lk',
          taxRate: settings.taxRate !== undefined ? settings.taxRate : 8.0,
          notificationEmail: settings.notificationEmail !== undefined ? settings.notificationEmail : true,
          notificationSms: settings.notificationSms !== undefined ? settings.notificationSms : false,
          lowStockThreshold: settings.lowStockThreshold !== undefined ? settings.lowStockThreshold : 10,
          wasteAlertThreshold: settings.wasteAlertThreshold !== undefined ? settings.wasteAlertThreshold : 50
        }
      });

      // Update tenant name if business name was changed
      if (settings.businessName) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { name: settings.businessName }
        });
      }

      console.log(`✅ Settings updated for tenant: ${tenantId}`);

      return reply.send({
        success: true,
        message: 'Settings updated successfully',
        data: {
          currency: updatedSettings.currency,
          currencySymbol: updatedSettings.currencySymbol,
          timezone: updatedSettings.timezone,
          dateFormat: updatedSettings.dateFormat,
          language: updatedSettings.language,
          businessName: updatedSettings.businessName,
          businessAddress: updatedSettings.businessAddress,
          businessPhone: updatedSettings.businessPhone,
          businessEmail: updatedSettings.businessEmail,
          taxRate: updatedSettings.taxRate,
          notificationEmail: updatedSettings.notificationEmail,
          notificationSms: updatedSettings.notificationSms,
          lowStockThreshold: updatedSettings.lowStockThreshold,
          wasteAlertThreshold: updatedSettings.wasteAlertThreshold
        }
      });

    } catch (error) {
      console.error('❌ Update settings error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update settings'
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