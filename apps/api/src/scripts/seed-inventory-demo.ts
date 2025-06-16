#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

// Demo inventory items (individual batches/lots) - Sri Lankan Market Focus
const demoInventoryItems = [
  // VEGETABLES - Sri Lankan Staples
  
  // Coconut Products (Essential in Sri Lankan cuisine)
  {
    name: 'Fresh Coconuts',
    category: 'Vegetables',
    quantity: 50.0,
    unit: 'pieces',
    cost: 0.75, // cost per coconut
    supplier: 'Coconut Palace',
    purchaseDate: new Date('2024-06-10'),
    expiryDate: new Date('2024-06-25'),
    location: 'Dry Storage Room A, Bin 1',
    notes: 'Fresh king coconuts for milk and oil extraction',
    batchNumber: 'COC-240610-001'
  },
  {
    name: 'Desiccated Coconut',
    category: 'Dry Goods',
    quantity: 10.0,
    unit: 'kg',
    cost: 4.50,
    supplier: 'Ceylon Coconut Mills',
    purchaseDate: new Date('2024-06-05'),
    expiryDate: new Date('2024-12-05'),
    location: 'Dry Storage Room B, Shelf C',
    notes: 'Fine grade desiccated coconut for desserts',
    batchNumber: 'DCC-240605-001'
  },

  // Green Vegetables
  {
    name: 'Cabbage',
    category: 'Vegetables',
    quantity: 20.0,
    unit: 'kg',
    cost: 1.20,
    supplier: 'Nuwara Eliya Farms',
    purchaseDate: new Date('2024-06-11'),
    expiryDate: new Date('2024-06-25'),
    location: 'Cold Storage Room A, Shelf 4',
    notes: 'Fresh green cabbage from hill country',
    batchNumber: 'CAB-240611-001'
  },
  {
    name: 'Leeks',
    category: 'Vegetables',
    quantity: 8.0,
    unit: 'kg',
    cost: 2.80,
    supplier: 'Nuwara Eliya Farms',
    purchaseDate: new Date('2024-06-12'),
    expiryDate: new Date('2024-06-22'),
    location: 'Cold Storage Room A, Shelf 5',
    notes: 'Fresh leeks for Sri Lankan curries',
    batchNumber: 'LEE-240612-001'
  },
  {
    name: 'Gotukola (Pennywort)',
    category: 'Leafy Greens',
    quantity: 3.0,
    unit: 'kg',
    cost: 1.80,
    supplier: 'Local Herb Garden',
    purchaseDate: new Date('2024-06-13'),
    expiryDate: new Date('2024-06-16'),
    location: 'Cold Storage Room A, Herb Section',
    notes: 'Fresh gotukola for traditional salads',
    batchNumber: 'GOT-240613-001'
  },
  {
    name: 'Mukunuwenna',
    category: 'Leafy Greens',
    quantity: 2.5,
    unit: 'kg',
    cost: 2.20,
    supplier: 'Local Herb Garden',
    purchaseDate: new Date('2024-06-13'),
    expiryDate: new Date('2024-06-16'),
    location: 'Cold Storage Room A, Herb Section',
    notes: 'Traditional leafy green for curries',
    batchNumber: 'MUK-240613-001'
  },

  // Root Vegetables
  {
    name: 'Sweet Potatoes',
    category: 'Vegetables',
    quantity: 25.0,
    unit: 'kg',
    cost: 1.50,
    supplier: 'Kurunegala Farms',
    purchaseDate: new Date('2024-06-08'),
    expiryDate: new Date('2024-07-08'),
    location: 'Dry Storage Room A, Bin 2',
    notes: 'Orange sweet potatoes for curries',
    batchNumber: 'SWP-240608-001'
  },
  {
    name: 'Jak Fruit (Young)',
    category: 'Vegetables',
    quantity: 15.0,
    unit: 'kg',
    cost: 2.00,
    supplier: 'Tropical Fruit Co.',
    purchaseDate: new Date('2024-06-10'),
    expiryDate: new Date('2024-06-17'),
    location: 'Cold Storage Room B, Shelf 1',
    notes: 'Young jak fruit for polos curry',
    batchNumber: 'JAK-240610-001'
  },
  {
    name: 'Breadfruit',
    category: 'Vegetables',
    quantity: 12.0,
    unit: 'kg',
    cost: 1.80,
    supplier: 'Tropical Fruit Co.',
    purchaseDate: new Date('2024-06-11'),
    expiryDate: new Date('2024-06-18'),
    location: 'Cold Storage Room B, Shelf 2',
    notes: 'Fresh breadfruit for traditional curry',
    batchNumber: 'BRF-240611-001'
  },

  // Traditional Vegetables
  {
    name: 'Drumsticks (Murunga)',
    category: 'Vegetables',
    quantity: 5.0,
    unit: 'kg',
    cost: 3.50,
    supplier: 'Local Organic Farm',
    purchaseDate: new Date('2024-06-12'),
    expiryDate: new Date('2024-06-19'),
    location: 'Cold Storage Room A, Shelf 6',
    notes: 'Fresh drumsticks for curry',
    batchNumber: 'DRM-240612-001'
  },
  {
    name: 'Okra (Bandakka)',
    category: 'Vegetables',
    quantity: 8.0,
    unit: 'kg',
    cost: 2.50,
    supplier: 'Matara Vegetable Market',
    purchaseDate: new Date('2024-06-11'),
    expiryDate: new Date('2024-06-18'),
    location: 'Cold Storage Room A, Shelf 7',
    notes: 'Fresh okra for traditional curry',
    batchNumber: 'OKR-240611-001'
  },
  {
    name: 'Bitter Gourd (Karawila)',
    category: 'Vegetables',
    quantity: 6.0,
    unit: 'kg',
    cost: 2.80,
    supplier: 'Matara Vegetable Market',
    purchaseDate: new Date('2024-06-12'),
    expiryDate: new Date('2024-06-19'),
    location: 'Cold Storage Room A, Shelf 8',
    notes: 'Fresh bitter gourd for curry',
    batchNumber: 'BTG-240612-001'
  },
  {
    name: 'Snake Gourd (Pathola)',
    category: 'Vegetables',
    quantity: 7.0,
    unit: 'kg',
    cost: 2.20,
    supplier: 'Matara Vegetable Market',
    purchaseDate: new Date('2024-06-11'),
    expiryDate: new Date('2024-06-18'),
    location: 'Cold Storage Room A, Shelf 9',
    notes: 'Fresh snake gourd for curry',
    batchNumber: 'SNK-240611-001'
  },

  // Common Vegetables
  {
    name: 'Fresh Tomatoes',
    category: 'Vegetables',
    quantity: 25.5,
    unit: 'kg',
    cost: 3.50,
    supplier: 'Local Farm Co.',
    purchaseDate: new Date('2024-06-10'),
    expiryDate: new Date('2024-06-20'),
    location: 'Cold Storage Room A, Shelf 2',
    notes: 'Organic Roma tomatoes, perfect for sauces',
    batchNumber: 'TOM-240610-001'
  },
  {
    name: 'Red Onions',
    category: 'Vegetables',
    quantity: 30.0,
    unit: 'kg',
    cost: 1.80,
    supplier: 'Anuradhapura Onion Farm',
    purchaseDate: new Date('2024-06-08'),
    expiryDate: new Date('2024-08-08'),
    location: 'Dry Storage Room B, Bin 3',
    notes: 'Large red onions, common in Sri Lankan cooking',
    batchNumber: 'RON-240608-001'
  },
  {
    name: 'Green Chili',
    category: 'Spices & Herbs',
    quantity: 5.0,
    unit: 'kg',
    cost: 4.50,
    supplier: 'Spice Gardens',
    purchaseDate: new Date('2024-06-12'),
    expiryDate: new Date('2024-06-19'),
    location: 'Cold Storage Room A, Spice Section',
    notes: 'Fresh green chilies for heat',
    batchNumber: 'GCH-240612-001'
  },
  {
    name: 'Ginger',
    category: 'Spices & Herbs',
    quantity: 4.0,
    unit: 'kg',
    cost: 5.20,
    supplier: 'Spice Gardens',
    purchaseDate: new Date('2024-06-10'),
    expiryDate: new Date('2024-07-10'),
    location: 'Dry Storage Room A, Spice Bin',
    notes: 'Fresh ginger root for curries',
    batchNumber: 'GIN-240610-001'
  },
  {
    name: 'Garlic',
    category: 'Spices & Herbs',
    quantity: 3.0,
    unit: 'kg',
    cost: 6.50,
    supplier: 'Spice Gardens',
    purchaseDate: new Date('2024-06-09'),
    expiryDate: new Date('2024-08-09'),
    location: 'Dry Storage Room A, Spice Bin',
    notes: 'Fresh garlic bulbs',
    batchNumber: 'GAR-240609-001'
  },

  // PROTEINS - Sri Lankan Market
  {
    name: 'Fresh Fish (Tuna)',
    category: 'Seafood',
    quantity: 15.0,
    unit: 'kg',
    cost: 8.00,
    supplier: 'Negombo Fish Market',
    purchaseDate: new Date('2024-06-13'),
    expiryDate: new Date('2024-06-15'),
    location: 'Freezer Room C, Rack 2',
    notes: 'Fresh yellowfin tuna steaks',
    batchNumber: 'TUN-240613-001'
  },
  {
    name: 'Prawns (Large)',
    category: 'Seafood',
    quantity: 8.0,
    unit: 'kg',
    cost: 12.50,
    supplier: 'Negombo Fish Market',
    purchaseDate: new Date('2024-06-13'),
    expiryDate: new Date('2024-06-16'),
    location: 'Freezer Room C, Rack 3',
    notes: 'Large prawns for curry',
    batchNumber: 'PRW-240613-001'
  },
  {
    name: 'Chicken (Whole)',
    category: 'Proteins',
    quantity: 20.0,
    unit: 'kg',
    cost: 6.50,
    supplier: 'Ceylon Poultry',
    purchaseDate: new Date('2024-06-12'),
    expiryDate: new Date('2024-06-17'),
    location: 'Freezer Room C, Rack 1',
    notes: 'Fresh whole chickens for curry',
    batchNumber: 'CHW-240612-001'
  },

  // RICE VARIETIES - Sri Lankan Staples
  {
    name: 'Red Rice (Rathu Kekulu)',
    category: 'Rice & Grains',
    quantity: 50.0,
    unit: 'kg',
    cost: 2.20,
    supplier: 'Polonnaruwa Rice Mills',
    purchaseDate: new Date('2024-06-05'),
    expiryDate: new Date('2025-06-05'),
    location: 'Dry Storage Room B, Rice Section',
    notes: 'Traditional red rice variety',
    batchNumber: 'RDR-240605-001'
  },
  {
    name: 'White Rice (Samba)',
    category: 'Rice & Grains',
    quantity: 75.0,
    unit: 'kg',
    cost: 1.80,
    supplier: 'Polonnaruwa Rice Mills',
    purchaseDate: new Date('2024-06-06'),
    expiryDate: new Date('2025-06-06'),
    location: 'Dry Storage Room B, Rice Section',
    notes: 'Premium samba rice',
    batchNumber: 'WHR-240606-001'
  },

  // SPICES & CONDIMENTS - Sri Lankan Essentials
  {
    name: 'Curry Powder',
    category: 'Spices & Condiments',
    quantity: 5.0,
    unit: 'kg',
    cost: 8.50,
    supplier: 'Ceylon Spice Company',
    purchaseDate: new Date('2024-06-01'),
    expiryDate: new Date('2025-06-01'),
    location: 'Dry Storage Room B, Spice Shelf',
    notes: 'Traditional roasted curry powder blend',
    batchNumber: 'CRP-240601-001'
  },
  {
    name: 'Turmeric Powder',
    category: 'Spices & Condiments',
    quantity: 3.0,
    unit: 'kg',
    cost: 12.00,
    supplier: 'Ceylon Spice Company',
    purchaseDate: new Date('2024-06-01'),
    expiryDate: new Date('2025-06-01'),
    location: 'Dry Storage Room B, Spice Shelf',
    notes: 'Pure Ceylon turmeric powder',
    batchNumber: 'TUR-240601-001'
  },
  {
    name: 'Chili Powder',
    category: 'Spices & Condiments',
    quantity: 4.0,
    unit: 'kg',
    cost: 10.50,
    supplier: 'Ceylon Spice Company',
    purchaseDate: new Date('2024-06-01'),
    expiryDate: new Date('2025-06-01'),
    location: 'Dry Storage Room B, Spice Shelf',
    notes: 'Hot chili powder for curries',
    batchNumber: 'CHP-240601-001'
  },
  {
    name: 'Coriander Seeds',
    category: 'Spices & Condiments',
    quantity: 2.0,
    unit: 'kg',
    cost: 6.80,
    supplier: 'Ceylon Spice Company',
    purchaseDate: new Date('2024-06-01'),
    expiryDate: new Date('2025-06-01'),
    location: 'Dry Storage Room B, Spice Shelf',
    notes: 'Whole coriander seeds for grinding',
    batchNumber: 'COR-240601-001'
  },
  {
    name: 'Cardamom',
    category: 'Spices & Condiments',
    quantity: 0.5,
    unit: 'kg',
    cost: 45.00,
    supplier: 'Kandy Spice Gardens',
    purchaseDate: new Date('2024-06-01'),
    expiryDate: new Date('2025-06-01'),
    location: 'Dry Storage Room B, Premium Spice Section',
    notes: 'Premium Ceylon cardamom pods',
    batchNumber: 'CAR-240601-001'
  },
  {
    name: 'Cinnamon Sticks',
    category: 'Spices & Condiments',
    quantity: 1.0,
    unit: 'kg',
    cost: 25.00,
    supplier: 'Kandy Spice Gardens',
    purchaseDate: new Date('2024-06-01'),
    expiryDate: new Date('2025-06-01'),
    location: 'Dry Storage Room B, Premium Spice Section',
    notes: 'True Ceylon cinnamon sticks',
    batchNumber: 'CIN-240601-001'
  },

  // DAIRY & COCONUT PRODUCTS
  {
    name: 'Coconut Milk',
    category: 'Dairy',
    quantity: 24.0,
    unit: 'cans',
    cost: 1.20,
    supplier: 'Ceylon Coconut Products',
    purchaseDate: new Date('2024-06-10'),
    expiryDate: new Date('2025-06-10'),
    location: 'Dry Storage Room B, Canned Goods',
    notes: 'Thick coconut milk for curries',
    batchNumber: 'COM-240610-001'
  },
  {
    name: 'Yogurt (Curd)',
    category: 'Dairy',
    quantity: 10.0,
    unit: 'kg',
    cost: 2.50,
    supplier: 'Highland Dairy',
    purchaseDate: new Date('2024-06-13'),
    expiryDate: new Date('2024-06-20'),
    location: 'Refrigerator Room D, Dairy Section',
    notes: 'Traditional buffalo curd',
    batchNumber: 'CUR-240613-001'
  },

  // LENTILS & LEGUMES
  {
    name: 'Red Lentils (Masoor Dal)',
    category: 'Legumes',
    quantity: 20.0,
    unit: 'kg',
    cost: 2.80,
    supplier: 'Grain Traders Ltd',
    purchaseDate: new Date('2024-06-05'),
    expiryDate: new Date('2025-06-05'),
    location: 'Dry Storage Room B, Legume Section',
    notes: 'Split red lentils for dhal curry',
    batchNumber: 'RDL-240605-001'
  },
  {
    name: 'Green Gram (Mung Dal)',
    category: 'Legumes',
    quantity: 15.0,
    unit: 'kg',
    cost: 3.20,
    supplier: 'Grain Traders Ltd',
    purchaseDate: new Date('2024-06-05'),
    expiryDate: new Date('2025-06-05'),
    location: 'Dry Storage Room B, Legume Section',
    notes: 'Green gram for traditional curries',
    batchNumber: 'GRG-240605-001'
  },

  // OILS & CONDIMENTS
  {
    name: 'Coconut Oil',
    category: 'Oils & Condiments',
    quantity: 10.0,
    unit: 'liters',
    cost: 3.50,
    supplier: 'Ceylon Coconut Mills',
    purchaseDate: new Date('2024-06-05'),
    expiryDate: new Date('2025-06-05'),
    location: 'Dry Storage Room B, Oil Section',
    notes: 'Pure virgin coconut oil',
    batchNumber: 'COL-240605-001'
  },
  {
    name: 'Sesame Oil',
    category: 'Oils & Condiments',
    quantity: 5.0,
    unit: 'liters',
    cost: 8.50,
    supplier: 'Traditional Oil Mills',
    purchaseDate: new Date('2024-06-05'),
    expiryDate: new Date('2025-06-05'),
    location: 'Dry Storage Room B, Oil Section',
    notes: 'Cold-pressed sesame oil',
    batchNumber: 'SES-240605-001'
  }
];

// Product stock levels (separate from inventory batches) - Sri Lankan Market Focus
const productStockLevels = [
  // Coconut Products
  {
    productName: 'Fresh Coconuts',
    category: 'Vegetables',
    unit: 'pieces',
    minStockLevel: 20.0,
    maxStockLevel: 100.0,
    safetyStock: 10.0,
    reorderQuantity: 50.0,
    leadTimeDays: 1,
    avgDailyUsage: 8.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Desiccated Coconut',
    category: 'Dry Goods',
    unit: 'kg',
    minStockLevel: 5.0,
    maxStockLevel: 25.0,
    safetyStock: 2.0,
    reorderQuantity: 15.0,
    leadTimeDays: 7,
    avgDailyUsage: 1.0,
    isActive: true,
    trackStock: true
  },

  // Vegetables
  {
    productName: 'Cabbage',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 10.0,
    maxStockLevel: 40.0,
    safetyStock: 5.0,
    reorderQuantity: 25.0,
    leadTimeDays: 2,
    avgDailyUsage: 3.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Leeks',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 5.0,
    maxStockLevel: 20.0,
    safetyStock: 2.0,
    reorderQuantity: 12.0,
    leadTimeDays: 2,
    avgDailyUsage: 1.5,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Gotukola (Pennywort)',
    category: 'Leafy Greens',
    unit: 'kg',
    minStockLevel: 2.0,
    maxStockLevel: 8.0,
    safetyStock: 1.0,
    reorderQuantity: 5.0,
    leadTimeDays: 1,
    avgDailyUsage: 0.8,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Mukunuwenna',
    category: 'Leafy Greens',
    unit: 'kg',
    minStockLevel: 2.0,
    maxStockLevel: 8.0,
    safetyStock: 1.0,
    reorderQuantity: 5.0,
    leadTimeDays: 1,
    avgDailyUsage: 0.7,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Sweet Potatoes',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 15.0,
    maxStockLevel: 50.0,
    safetyStock: 5.0,
    reorderQuantity: 30.0,
    leadTimeDays: 3,
    avgDailyUsage: 3.5,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Jak Fruit (Young)',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 8.0,
    maxStockLevel: 25.0,
    safetyStock: 3.0,
    reorderQuantity: 15.0,
    leadTimeDays: 2,
    avgDailyUsage: 2.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Breadfruit',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 8.0,
    maxStockLevel: 25.0,
    safetyStock: 3.0,
    reorderQuantity: 15.0,
    leadTimeDays: 2,
    avgDailyUsage: 2.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Drumsticks (Murunga)',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 3.0,
    maxStockLevel: 15.0,
    safetyStock: 2.0,
    reorderQuantity: 8.0,
    leadTimeDays: 2,
    avgDailyUsage: 1.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Okra (Bandakka)',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 5.0,
    maxStockLevel: 20.0,
    safetyStock: 2.0,
    reorderQuantity: 12.0,
    leadTimeDays: 2,
    avgDailyUsage: 1.5,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Bitter Gourd (Karawila)',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 4.0,
    maxStockLevel: 15.0,
    safetyStock: 2.0,
    reorderQuantity: 8.0,
    leadTimeDays: 2,
    avgDailyUsage: 1.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Snake Gourd (Pathola)',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 4.0,
    maxStockLevel: 15.0,
    safetyStock: 2.0,
    reorderQuantity: 10.0,
    leadTimeDays: 2,
    avgDailyUsage: 1.2,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Fresh Tomatoes',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 15.0,
    maxStockLevel: 50.0,
    safetyStock: 8.0,
    reorderQuantity: 30.0,
    leadTimeDays: 2,
    avgDailyUsage: 4.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Red Onions',
    category: 'Vegetables',
    unit: 'kg',
    minStockLevel: 20.0,
    maxStockLevel: 60.0,
    safetyStock: 10.0,
    reorderQuantity: 40.0,
    leadTimeDays: 3,
    avgDailyUsage: 5.0,
    isActive: true,
    trackStock: true
  },

  // Spices & Herbs
  {
    productName: 'Green Chili',
    category: 'Spices & Herbs',
    unit: 'kg',
    minStockLevel: 3.0,
    maxStockLevel: 12.0,
    safetyStock: 1.5,
    reorderQuantity: 8.0,
    leadTimeDays: 1,
    avgDailyUsage: 1.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Ginger',
    category: 'Spices & Herbs',
    unit: 'kg',
    minStockLevel: 2.0,
    maxStockLevel: 10.0,
    safetyStock: 1.0,
    reorderQuantity: 6.0,
    leadTimeDays: 2,
    avgDailyUsage: 0.8,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Garlic',
    category: 'Spices & Herbs',
    unit: 'kg',
    minStockLevel: 2.0,
    maxStockLevel: 8.0,
    safetyStock: 1.0,
    reorderQuantity: 5.0,
    leadTimeDays: 3,
    avgDailyUsage: 0.6,
    isActive: true,
    trackStock: true
  },

  // Seafood & Proteins
  {
    productName: 'Fresh Fish (Tuna)',
    category: 'Seafood',
    unit: 'kg',
    minStockLevel: 8.0,
    maxStockLevel: 25.0,
    safetyStock: 4.0,
    reorderQuantity: 15.0,
    leadTimeDays: 1,
    avgDailyUsage: 3.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Prawns (Large)',
    category: 'Seafood',
    unit: 'kg',
    minStockLevel: 5.0,
    maxStockLevel: 20.0,
    safetyStock: 2.0,
    reorderQuantity: 12.0,
    leadTimeDays: 1,
    avgDailyUsage: 2.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Chicken (Whole)',
    category: 'Proteins',
    unit: 'kg',
    minStockLevel: 12.0,
    maxStockLevel: 40.0,
    safetyStock: 6.0,
    reorderQuantity: 25.0,
    leadTimeDays: 1,
    avgDailyUsage: 4.0,
    isActive: true,
    trackStock: true
  },

  // Rice & Grains
  {
    productName: 'Red Rice (Rathu Kekulu)',
    category: 'Rice & Grains',
    unit: 'kg',
    minStockLevel: 30.0,
    maxStockLevel: 100.0,
    safetyStock: 15.0,
    reorderQuantity: 60.0,
    leadTimeDays: 7,
    avgDailyUsage: 8.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'White Rice (Samba)',
    category: 'Rice & Grains',
    unit: 'kg',
    minStockLevel: 40.0,
    maxStockLevel: 150.0,
    safetyStock: 20.0,
    reorderQuantity: 80.0,
    leadTimeDays: 7,
    avgDailyUsage: 12.0,
    isActive: true,
    trackStock: true
  },

  // Spices & Condiments
  {
    productName: 'Curry Powder',
    category: 'Spices & Condiments',
    unit: 'kg',
    minStockLevel: 3.0,
    maxStockLevel: 15.0,
    safetyStock: 2.0,
    reorderQuantity: 8.0,
    leadTimeDays: 7,
    avgDailyUsage: 1.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Turmeric Powder',
    category: 'Spices & Condiments',
    unit: 'kg',
    minStockLevel: 2.0,
    maxStockLevel: 10.0,
    safetyStock: 1.0,
    reorderQuantity: 5.0,
    leadTimeDays: 7,
    avgDailyUsage: 0.5,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Chili Powder',
    category: 'Spices & Condiments',
    unit: 'kg',
    minStockLevel: 2.0,
    maxStockLevel: 12.0,
    safetyStock: 1.0,
    reorderQuantity: 6.0,
    leadTimeDays: 7,
    avgDailyUsage: 0.8,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Coriander Seeds',
    category: 'Spices & Condiments',
    unit: 'kg',
    minStockLevel: 1.0,
    maxStockLevel: 5.0,
    safetyStock: 0.5,
    reorderQuantity: 3.0,
    leadTimeDays: 7,
    avgDailyUsage: 0.3,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Cardamom',
    category: 'Spices & Condiments',
    unit: 'kg',
    minStockLevel: 0.2,
    maxStockLevel: 1.0,
    safetyStock: 0.1,
    reorderQuantity: 0.5,
    leadTimeDays: 7,
    avgDailyUsage: 0.05,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Cinnamon Sticks',
    category: 'Spices & Condiments',
    unit: 'kg',
    minStockLevel: 0.5,
    maxStockLevel: 2.0,
    safetyStock: 0.2,
    reorderQuantity: 1.0,
    leadTimeDays: 7,
    avgDailyUsage: 0.1,
    isActive: true,
    trackStock: true
  },

  // Dairy Products
  {
    productName: 'Coconut Milk',
    category: 'Dairy',
    unit: 'cans',
    minStockLevel: 15.0,
    maxStockLevel: 50.0,
    safetyStock: 8.0,
    reorderQuantity: 30.0,
    leadTimeDays: 5,
    avgDailyUsage: 4.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Yogurt (Curd)',
    category: 'Dairy',
    unit: 'kg',
    minStockLevel: 5.0,
    maxStockLevel: 20.0,
    safetyStock: 3.0,
    reorderQuantity: 12.0,
    leadTimeDays: 2,
    avgDailyUsage: 2.0,
    isActive: true,
    trackStock: true
  },

  // Legumes
  {
    productName: 'Red Lentils (Masoor Dal)',
    category: 'Legumes',
    unit: 'kg',
    minStockLevel: 10.0,
    maxStockLevel: 40.0,
    safetyStock: 5.0,
    reorderQuantity: 25.0,
    leadTimeDays: 7,
    avgDailyUsage: 3.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Green Gram (Mung Dal)',
    category: 'Legumes',
    unit: 'kg',
    minStockLevel: 8.0,
    maxStockLevel: 30.0,
    safetyStock: 4.0,
    reorderQuantity: 20.0,
    leadTimeDays: 7,
    avgDailyUsage: 2.5,
    isActive: true,
    trackStock: true
  },

  // Oils
  {
    productName: 'Coconut Oil',
    category: 'Oils & Condiments',
    unit: 'liters',
    minStockLevel: 5.0,
    maxStockLevel: 25.0,
    safetyStock: 3.0,
    reorderQuantity: 15.0,
    leadTimeDays: 5,
    avgDailyUsage: 2.0,
    isActive: true,
    trackStock: true
  },
  {
    productName: 'Sesame Oil',
    category: 'Oils & Condiments',
    unit: 'liters',
    minStockLevel: 2.0,
    maxStockLevel: 10.0,
    safetyStock: 1.0,
    reorderQuantity: 6.0,
    leadTimeDays: 7,
    avgDailyUsage: 0.8,
    isActive: true,
    trackStock: true
  }
];

async function seedInventoryDemo() {
  console.log('🌱 Starting inventory demo seed...');

  try {
    // Clean existing data
    console.log('🧹 Cleaning existing inventory and stock level data...');
    await prisma.stockUsageHistory.deleteMany({});
    await prisma.stockAlert.deleteMany({});
    await prisma.productStockLevel.deleteMany({});
    await prisma.inventoryItem.deleteMany({});

    // Get the default tenant and branch
    const tenant = await prisma.tenant.findFirst();
    const branch = await prisma.branch.findFirst();

    if (!tenant || !branch) {
      throw new Error('No tenant or branch found. Please run the main seed first.');
    }

    console.log(`📦 Found tenant: ${tenant.name}, branch: ${branch.name}`);

    // Create inventory items (individual batches)
    console.log('📦 Creating inventory items...');
    for (const item of demoInventoryItems) {
      await prisma.inventoryItem.create({
        data: {
          ...item,
          tenantId: tenant.id,
          branchId: branch.id,
        },
      });
      console.log(`✅ Created inventory item: ${item.name} (${item.quantity} ${item.unit})`);
    }

    // Create product stock levels (separate table)
    console.log('📊 Creating product stock levels...');
    for (const stockLevel of productStockLevels) {
      await prisma.productStockLevel.create({
        data: {
          ...stockLevel,
          tenantId: tenant.id,
          branchId: branch.id,
        },
      });
      console.log(`✅ Created stock level: ${stockLevel.productName} (min: ${stockLevel.minStockLevel}, max: ${stockLevel.maxStockLevel})`);
    }

    console.log('🎉 Demo inventory seeding completed successfully!');
    console.log(`📊 Created ${demoInventoryItems.length} inventory items and ${productStockLevels.length} stock level configurations`);
    
    // Show summary
    console.log('\n📈 Summary:');
    const itemsByCategory = demoInventoryItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(itemsByCategory).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} items`);
    });

  } catch (error) {
    console.error('❌ Error seeding demo inventory:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedInventoryDemo()
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { seedInventoryDemo };