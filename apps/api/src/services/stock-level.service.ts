import { prisma } from '../lib/prisma';

export class StockLevelService {
  /**
   * Get stock management data - aggregates inventory by product and includes stock levels
   */
  async getStockManagementData(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    // Get all inventory items grouped by product
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

    // Get existing stock levels for these products
    const products = Array.from(productMap.values());
    const stockLevels = await prisma.productStockLevel.findMany({
      where: {
        tenantId,
        branchId: branchId || null,
        OR: products.map(p => ({
          productName: p.productName,
          category: p.category,
          unit: p.unit
        }))
      }
    });

    // Create a map for quick lookup
    const stockLevelMap = new Map<string, any>();
    stockLevels.forEach(level => {
      const key = `${level.productName}-${level.category}-${level.unit}`;
      stockLevelMap.set(key, level);
    });

    // Combine data and calculate stock status
    const items = products.map(product => {
      const key = `${product.productName}-${product.category}-${product.unit}`;
      const stockLevel = stockLevelMap.get(key);
      
      // Calculate stock status
      let stockStatus: 'LOW' | 'OK' | 'HIGH' | 'OUT' = 'OK';
      if (product.totalQuantity === 0) {
        stockStatus = 'OUT';
      } else if (stockLevel?.minStockLevel && product.totalQuantity <= stockLevel.minStockLevel) {
        stockStatus = 'LOW';
      } else if (stockLevel?.maxStockLevel && product.totalQuantity >= stockLevel.maxStockLevel) {
        stockStatus = 'HIGH';
      }

      return {
        id: stockLevel?.id || `temp-${key}`, // Use stock level ID if exists, temp ID if not
        name: product.productName,
        category: product.category,
        unit: product.unit,
        supplier: Array.from(product.suppliers).join(', ') || null,
        currentQuantity: product.totalQuantity,
        minStockLevel: stockLevel?.minStockLevel || 0,
        maxStockLevel: stockLevel?.maxStockLevel || 0,
        safetyStock: stockLevel?.safetyStock || 0,
        reorderQuantity: stockLevel?.reorderQuantity || 0,
        leadTimeDays: stockLevel?.leadTimeDays || 1,
        avgDailyUsage: stockLevel?.avgDailyUsage || 0,
        isActive: stockLevel?.isActive !== false,
        trackStock: stockLevel?.trackStock !== false,
        stockStatus
      };
    });

    // Get unique categories
    const uniqueCategories = [...new Set(products.map(p => p.category))];

    return {
      items,
      categories: uniqueCategories
    };
  }

  /**
   * Update or create stock levels for a product
   */
  async updateStockLevels(
    productName: string,
    category: string,
    unit: string,
    stockData: {
      minStockLevel?: number;
      maxStockLevel?: number;
      safetyStock?: number;
      reorderQuantity?: number;
      leadTimeDays?: number;
      trackStock?: boolean;
      isActive?: boolean;
    },
    tenantId: string,
    branchId?: string
  ) {
    // Use upsert to update or create the stock level
    const stockLevel = await prisma.productStockLevel.upsert({
      where: {
        productName_category_unit_tenantId_branchId: {
          productName,
          category,
          unit,
          tenantId,
          branchId: branchId || null
        }
      },
      update: {
        ...stockData,
        updatedAt: new Date()
      },
      create: {
        productName,
        category,
        unit,
        tenantId,
        branchId: branchId || null,
        ...stockData
      }
    });

    return stockLevel;
  }

  /**
   * Get stock level for a specific product
   */
  async getStockLevel(
    productName: string,
    category: string,
    unit: string,
    tenantId: string,
    branchId?: string
  ) {
    return prisma.productStockLevel.findUnique({
      where: {
        productName_category_unit_tenantId_branchId: {
          productName,
          category,
          unit,
          tenantId,
          branchId: branchId || null
        }
      }
    });
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(tenantId: string, branchId?: string) {
    const stockManagementData = await this.getStockManagementData(tenantId, branchId);
    return stockManagementData.items.filter(item => 
      item.stockStatus === 'LOW' || item.stockStatus === 'OUT'
    );
  }

  /**
   * Calculate current stock quantity for a product
   */
  async getCurrentStockQuantity(
    productName: string,
    category: string,
    unit: string,
    tenantId: string,
    branchId?: string
  ): Promise<number> {
    const where: any = {
      name: productName,
      category,
      unit,
      tenantId
    };
    
    if (branchId) where.branchId = branchId;

    const result = await prisma.inventoryItem.aggregate({
      where,
      _sum: {
        quantity: true
      }
    });

    return result._sum.quantity || 0;
  }
}