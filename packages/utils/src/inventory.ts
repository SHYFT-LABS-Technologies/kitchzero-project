import { InventoryItem, InventoryUnit } from '@kitchzero/types';

export interface FifoDeduction {
  batchId: string;
  quantityUsed: number;
  remainingQuantity: number;
}

export function calculateFifoDeduction(
  inventory: InventoryItem[],
  itemName: string,
  quantityNeeded: number,
  unit: InventoryUnit
): FifoDeduction[] {
  // Filter and sort by receivedAt (FIFO)
  const availableStock = inventory
    .filter(item => 
      item.itemName === itemName && 
      item.unit === unit && 
      item.quantity > 0
    )
    .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  
  const deductions: FifoDeduction[] = [];
  let remainingNeeded = quantityNeeded;
  
  for (const item of availableStock) {
    if (remainingNeeded <= 0) break;
    
    const quantityToUse = Math.min(item.quantity, remainingNeeded);
    
    deductions.push({
      batchId: item.batchId,
      quantityUsed: quantityToUse,
      remainingQuantity: item.quantity - quantityToUse
    });
    
    remainingNeeded -= quantityToUse;
  }
  
  return deductions;
}

export function calculateInventoryValue(inventory: InventoryItem[]): number {
  return inventory.reduce((total, item) => total + (item.quantity * item.cost), 0);
}

export function getLowStockItems(
  inventory: InventoryItem[],
  thresholds: Record<string, number> = {}
): InventoryItem[] {
  const stockByItem = new Map<string, number>();
  
  // Calculate total stock per item
  inventory.forEach(item => {
    const key = `${item.itemName}-${item.unit}`;
    const current = stockByItem.get(key) || 0;
    stockByItem.set(key, current + item.quantity);
  });
  
  // Find items below threshold
  const lowStockItems: InventoryItem[] = [];
  const defaultThreshold = 10;
  
  inventory.forEach(item => {
    const key = `${item.itemName}-${item.unit}`;
    const totalStock = stockByItem.get(key) || 0;
    const threshold = thresholds[item.itemName] || defaultThreshold;
    
    if (totalStock <= threshold && !lowStockItems.find(i => 
      i.itemName === item.itemName && i.unit === item.unit
    )) {
      lowStockItems.push(item);
    }
  });
  
  return lowStockItems;
}

export function getExpiringItems(
  inventory: InventoryItem[],
  daysThreshold: number = 7
): InventoryItem[] {
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + daysThreshold);
  
  return inventory.filter(item => 
    item.expiryDate <= thresholdDate && item.expiryDate >= today
  );
}

export function calculateCostPerUnit(
  inventory: InventoryItem[],
  itemName: string,
  unit: InventoryUnit
): number {
  const items = inventory.filter(item => 
    item.itemName === itemName && item.unit === unit && item.quantity > 0
  );
  
  if (items.length === 0) return 0;
  
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
}