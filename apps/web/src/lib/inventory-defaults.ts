// Default categories and common items for inventory management

export const DEFAULT_CATEGORIES = [
  'Vegetables',
  'Fruits', 
  'Meat & Poultry',
  'Seafood',
  'Dairy & Eggs',
  'Grains & Cereals',
  'Spices & Seasonings',
  'Herbs',
  'Beverages',
  'Frozen Foods',
  'Canned Goods',
  'Condiments & Sauces',
  'Oils & Vinegars',
  'Baking Supplies',
  'Snacks',
  'Nuts & Seeds',
  'Pasta & Noodles',
  'Bread & Bakery',
  'Desserts',
  'Prepared Foods'
];

export const DEFAULT_UNITS = [
  'kg', 'g', 'lbs', 'oz',
  'liters', 'ml', 'gallons', 'cups', 'pints', 'quarts',
  'pieces', 'items', 'units',
  'boxes', 'bags', 'packages', 'containers',
  'cans', 'bottles', 'jars',
  'bunches', 'heads', 'stalks',
  'sheets', 'rolls', 'packets'
];

export const COMMON_ITEMS_BY_CATEGORY = {
  'Vegetables': [
    'Tomatoes', 'Onions', 'Carrots', 'Potatoes', 'Bell Peppers',
    'Broccoli', 'Spinach', 'Lettuce', 'Cucumbers', 'Celery',
    'Mushrooms', 'Garlic', 'Ginger', 'Zucchini', 'Eggplant'
  ],
  'Fruits': [
    'Apples', 'Bananas', 'Oranges', 'Lemons', 'Limes',
    'Strawberries', 'Blueberries', 'Grapes', 'Avocados', 'Pineapple'
  ],
  'Meat & Poultry': [
    'Chicken Breast', 'Chicken Thighs', 'Ground Beef', 'Beef Steak',
    'Pork Chops', 'Turkey', 'Bacon', 'Sausage', 'Ham'
  ],
  'Seafood': [
    'Salmon', 'Tuna', 'Shrimp', 'Cod', 'Crab', 'Lobster', 'Mussels'
  ],
  'Dairy & Eggs': [
    'Milk', 'Eggs', 'Butter', 'Cheese', 'Yogurt', 'Cream', 'Sour Cream'
  ],
  'Grains & Cereals': [
    'Rice', 'Flour', 'Bread', 'Pasta', 'Quinoa', 'Oats', 'Barley'
  ],
  'Spices & Seasonings': [
    'Salt', 'Black Pepper', 'Garlic Powder', 'Onion Powder', 'Paprika',
    'Cumin', 'Oregano', 'Thyme', 'Rosemary', 'Bay Leaves'
  ],
  'Herbs': [
    'Basil', 'Parsley', 'Cilantro', 'Mint', 'Dill', 'Chives', 'Sage'
  ],
  'Beverages': [
    'Water', 'Coffee', 'Tea', 'Juice', 'Soda', 'Wine', 'Beer'
  ],
  'Condiments & Sauces': [
    'Olive Oil', 'Vegetable Oil', 'Vinegar', 'Soy Sauce', 'Hot Sauce',
    'Ketchup', 'Mustard', 'Mayonnaise', 'BBQ Sauce'
  ]
};

export const COMMON_SUPPLIERS = [
  'Local Farm Co.',
  'Sysco',
  'US Foods',
  'Performance Food Group',
  'Reinhart Foodservice',
  'Gordon Food Service',
  'Local Butcher Shop',
  'Organic Wholesale',
  'Fresh Market Suppliers',
  'Regional Distributor'
];

// Helper function to get all common items
export function getAllCommonItems(): string[] {
  return Object.values(COMMON_ITEMS_BY_CATEGORY).flat();
}

// Helper function to get items for a specific category
export function getItemsForCategory(category: string): string[] {
  return COMMON_ITEMS_BY_CATEGORY[category as keyof typeof COMMON_ITEMS_BY_CATEGORY] || [];
}

// Helper function to search items across all categories
export function searchCommonItems(query: string): Array<{name: string, category: string}> {
  const results: Array<{name: string, category: string}> = [];
  const searchTerm = query.toLowerCase();
  
  Object.entries(COMMON_ITEMS_BY_CATEGORY).forEach(([category, items]) => {
    items.forEach(item => {
      if (item.toLowerCase().includes(searchTerm)) {
        results.push({ name: item, category });
      }
    });
  });
  
  return results;
}