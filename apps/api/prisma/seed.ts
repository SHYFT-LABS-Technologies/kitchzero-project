#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcrypt';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  return bcrypt.hash(password, saltRounds);
}

async function seed() {
  console.log('🌱 Starting comprehensive database seed...');

  try {
    // Clean existing data
    console.log('🧹 Cleaning existing data...');
    await prisma.refreshToken.deleteMany({});
    await prisma.wasteLog.deleteMany({});
    await prisma.stockUsageHistory.deleteMany({});
    await prisma.stockAlert.deleteMany({});
    await prisma.productStockLevel.deleteMany({});
    await prisma.inventoryItem.deleteMany({});
    await prisma.recipeIngredient.deleteMany({});
    await prisma.recipe.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.tenantSettings.deleteMany({});
    await prisma.tenant.deleteMany({});

    // Create KitchZero Admin User (Global Admin)
    console.log('👑 Creating KitchZero admin user...');
    const kitchzeroAdminPassword = await hashPassword('admin123');
    
    // For the global admin, we'll create a special "system" tenant
    const systemTenant = await prisma.tenant.create({
      data: {
        name: 'KitchZero System'
      }
    });

    const kitchzeroAdmin = await prisma.user.create({
      data: {
        username: 'kitchzero_admin',
        passwordHash: kitchzeroAdminPassword,
        role: 'KITCHZERO_ADMIN',
        tenantId: systemTenant.id,
        mustChangePassword: false
      }
    });

    console.log(`✅ Created KitchZero admin: ${kitchzeroAdmin.username}`);

    // Create Demo Restaurant Tenant with Multiple Branches
    console.log('🏢 Creating demo restaurant tenant...');
    const demoTenant = await prisma.tenant.create({
      data: {
        name: 'Spice Garden Restaurant'
      }
    });

    // Create multiple branches for the restaurant
    console.log('🏪 Creating restaurant branches...');
    const branches = await Promise.all([
      prisma.branch.create({
        data: {
          name: 'Downtown Main',
          address: '123 Main Street, Colombo 01, Sri Lanka',
          tenantId: demoTenant.id
        }
      }),
      prisma.branch.create({
        data: {
          name: 'Kandy Heights',
          address: '456 Temple Road, Kandy, Sri Lanka',
          tenantId: demoTenant.id
        }
      }),
      prisma.branch.create({
        data: {
          name: 'Galle Fort',
          address: '789 Fort Street, Galle, Sri Lanka',
          tenantId: demoTenant.id
        }
      })
    ]);

    console.log(`✅ Created ${branches.length} branches`);

    // Create default tenant settings for both tenants
    console.log('⚙️ Creating default tenant settings...');
    
    // System tenant settings (minimal, for KitchZero admin)
    await prisma.tenantSettings.create({
      data: {
        tenantId: systemTenant.id,
        currency: 'USD',
        currencySymbol: '$',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        language: 'en',
        businessName: 'KitchZero System',
        businessAddress: 'San Francisco, CA, USA',
        businessPhone: '+1 (555) 123-4567',
        businessEmail: 'admin@kitchzero.com',
        taxRate: 0.0, // No tax for system tenant
        notificationEmail: true,
        notificationSms: false,
        lowStockThreshold: 5,
        wasteAlertThreshold: 100
      }
    });

    // Demo restaurant settings (Sri Lanka focused)
    await prisma.tenantSettings.create({
      data: {
        tenantId: demoTenant.id,
        currency: 'LKR',
        currencySymbol: 'Rs.',
        timezone: 'Asia/Colombo',
        dateFormat: 'DD/MM/YYYY',
        language: 'en',
        businessName: 'Spice Garden Restaurant',
        businessAddress: '123 Main Street, Colombo 01, Sri Lanka',
        businessPhone: '+94 11 234 5678',
        businessEmail: 'info@spicegarden.lk',
        taxRate: 8.0, // VAT rate in Sri Lanka
        notificationEmail: true,
        notificationSms: true, // Enable SMS for restaurant
        lowStockThreshold: 10,
        wasteAlertThreshold: 50
      }
    });

    console.log('✅ Created tenant settings with Sri Lanka defaults');

    // Create Restaurant Admin (can manage all branches)
    console.log('👨‍💼 Creating restaurant admin...');
    const restaurantAdminPassword = await hashPassword('admin123');
    const restaurantAdmin = await prisma.user.create({
      data: {
        username: 'spice_admin',
        passwordHash: restaurantAdminPassword,
        role: 'RESTAURANT_ADMIN',
        tenantId: demoTenant.id,
        branchId: branches[0].id, // Assigned to main branch but can access all
        mustChangePassword: false
      }
    });

    console.log(`✅ Created restaurant admin: ${restaurantAdmin.username}`);

    // Create Branch Admins (one for each branch)
    console.log('👩‍💼 Creating branch admins...');
    const branchAdmins = await Promise.all([
      prisma.user.create({
        data: {
          username: 'downtown_admin',
          passwordHash: await hashPassword('branch123'),
          role: 'BRANCH_ADMIN',
          tenantId: demoTenant.id,
          branchId: branches[0].id,
          mustChangePassword: false
        }
      }),
      prisma.user.create({
        data: {
          username: 'kandy_admin',
          passwordHash: await hashPassword('branch123'),
          role: 'BRANCH_ADMIN',
          tenantId: demoTenant.id,
          branchId: branches[1].id,
          mustChangePassword: false
        }
      }),
      prisma.user.create({
        data: {
          username: 'galle_admin',
          passwordHash: await hashPassword('branch123'),
          role: 'BRANCH_ADMIN',
          tenantId: demoTenant.id,
          branchId: branches[2].id,
          mustChangePassword: false
        }
      })
    ]);

    console.log(`✅ Created ${branchAdmins.length} branch admins`);

    // Create sample recipes
    console.log('🍽️ Creating sample recipes...');
    const recipes = await Promise.all([
      prisma.recipe.create({
        data: {
          name: 'Chicken Curry',
          description: 'Traditional Sri Lankan chicken curry with coconut milk',
          category: 'Main Course',
          yield: 4,
          yieldUnit: 'portions',
          preparationTime: 20,
          cookingTime: 45,
          instructions: [
            'Cut chicken into medium pieces',
            'Heat oil in a pan and add curry leaves',
            'Add onions and cook until golden',
            'Add chicken and cook until white',
            'Add spices and coconut milk',
            'Simmer for 30 minutes until tender'
          ],
          tenantId: demoTenant.id,
          branchId: null, // Available to all branches
          createdBy: restaurantAdmin.id,
          ingredients: {
            create: [
              {
                ingredientName: 'Chicken (Whole)',
                category: 'Proteins',
                quantity: 1,
                unit: 'kg',
                notes: 'Cut into medium pieces',
                order: 1
              },
              {
                ingredientName: 'Coconut Milk',
                category: 'Dairy',
                quantity: 2,
                unit: 'cans',
                notes: 'Thick coconut milk',
                order: 2
              },
              {
                ingredientName: 'Red Onions',
                category: 'Vegetables',
                quantity: 200,
                unit: 'g',
                notes: 'Sliced',
                order: 3
              },
              {
                ingredientName: 'Curry Powder',
                category: 'Spices & Condiments',
                quantity: 30,
                unit: 'g',
                notes: 'Roasted curry powder',
                order: 4
              }
            ]
          }
        }
      }),
      prisma.recipe.create({
        data: {
          name: 'Fish Curry',
          description: 'Spicy fish curry with tamarind',
          category: 'Main Course',
          yield: 3,
          yieldUnit: 'portions',
          preparationTime: 15,
          cookingTime: 30,
          instructions: [
            'Clean and cut fish into pieces',
            'Marinate fish with turmeric and salt',
            'Heat oil and fry fish lightly',
            'Add onions, chilies, and spices',
            'Add coconut milk and simmer'
          ],
          tenantId: demoTenant.id,
          branchId: null,
          createdBy: restaurantAdmin.id,
          ingredients: {
            create: [
              {
                ingredientName: 'Fresh Fish (Tuna)',
                category: 'Seafood',
                quantity: 500,
                unit: 'g',
                notes: 'Cut into pieces',
                order: 1
              },
              {
                ingredientName: 'Coconut Milk',
                category: 'Dairy',
                quantity: 1,
                unit: 'cans',
                order: 2
              },
              {
                ingredientName: 'Turmeric Powder',
                category: 'Spices & Condiments',
                quantity: 10,
                unit: 'g',
                order: 3
              }
            ]
          }
        }
      })
    ]);

    console.log(`✅ Created ${recipes.length} recipes`);

    // Create sample inventory items for each branch
    console.log('📦 Creating sample inventory items...');
    const inventoryData = [
      // Downtown Main branch inventory
      {
        branchId: branches[0].id,
        items: [
          {
            name: 'Chicken (Whole)',
            category: 'Proteins',
            quantity: 25.0,
            unit: 'kg',
            cost: 1950, // Rs. 1,950 per kg
            supplier: 'Ceylon Poultry',
            purchaseDate: new Date('2024-06-12'),
            expiryDate: new Date('2024-06-17'),
            location: 'Freezer Room A',
            batchNumber: 'CHW-240612-001'
          },
          {
            name: 'Fresh Fish (Tuna)',
            category: 'Seafood',
            quantity: 15.0,
            unit: 'kg',
            cost: 2400, // Rs. 2,400 per kg
            supplier: 'Negombo Fish Market',
            purchaseDate: new Date('2024-06-13'),
            expiryDate: new Date('2024-06-15'),
            location: 'Freezer Room B',
            batchNumber: 'TUN-240613-001'
          },
          {
            name: 'Red Onions',
            category: 'Vegetables',
            quantity: 30.0,
            unit: 'kg',
            cost: 540, // Rs. 540 per kg
            supplier: 'Local Farm',
            purchaseDate: new Date('2024-06-10'),
            expiryDate: new Date('2024-07-10'),
            location: 'Dry Storage',
            batchNumber: 'RON-240610-001'
          }
        ]
      },
      // Kandy Heights branch inventory
      {
        branchId: branches[1].id,
        items: [
          {
            name: 'Chicken (Whole)',
            category: 'Proteins',
            quantity: 20.0,
            unit: 'kg',
            cost: 2040, // Rs. 2,040 per kg
            supplier: 'Hill Country Poultry',
            purchaseDate: new Date('2024-06-11'),
            expiryDate: new Date('2024-06-16'),
            location: 'Freezer Room',
            batchNumber: 'CHW-240611-002'
          },
          {
            name: 'Coconut Milk',
            category: 'Dairy',
            quantity: 48.0,
            unit: 'cans',
            cost: 360, // Rs. 360 per can
            supplier: 'Ceylon Coconut Products',
            purchaseDate: new Date('2024-06-10'),
            expiryDate: new Date('2025-06-10'),
            location: 'Dry Storage',
            batchNumber: 'COM-240610-001'
          }
        ]
      },
      // Galle Fort branch inventory  
      {
        branchId: branches[2].id,
        items: [
          {
            name: 'Fresh Fish (Tuna)',
            category: 'Seafood',
            quantity: 12.0,
            unit: 'kg',
            cost: 2250, // Rs. 2,250 per kg
            supplier: 'Galle Harbor',
            purchaseDate: new Date('2024-06-13'),
            expiryDate: new Date('2024-06-15'),
            location: 'Freezer',
            batchNumber: 'TUN-240613-003'
          },
          {
            name: 'Curry Powder',
            category: 'Spices & Condiments',
            quantity: 5.0,
            unit: 'kg',
            cost: 2550, // Rs. 2,550 per kg
            supplier: 'Galle Spice Co',
            purchaseDate: new Date('2024-06-01'),
            expiryDate: new Date('2025-06-01'),
            location: 'Spice Storage',
            batchNumber: 'CRP-240601-003'
          }
        ]
      }
    ];

    for (const branchInventory of inventoryData) {
      for (const item of branchInventory.items) {
        await prisma.inventoryItem.create({
          data: {
            ...item,
            tenantId: demoTenant.id,
            branchId: branchInventory.branchId
          }
        });
      }
    }

    console.log('📦 Created inventory items for all branches');

    // Create sample waste logs
    console.log('🗑️ Creating sample waste logs...');
    await Promise.all([
      prisma.wasteLog.create({
        data: {
          itemName: 'Chicken (Whole)',
          category: 'Proteins',
          quantity: 2.0,
          unit: 'kg',
          cost: 3900, // Rs. 3,900 total
          wasteType: 'RAW',
          reason: 'Expired/spoiled',
          tags: ['expiry', 'storage_issue'],
          preventable: true,
          severity: 'MEDIUM',
          tenantId: demoTenant.id,
          branchId: branches[0].id,
          loggedBy: branchAdmins[0].id
        }
      }),
      prisma.wasteLog.create({
        data: {
          itemName: 'Fish Curry',
          category: 'Prepared Foods',
          quantity: 1.0,
          unit: 'portions',
          cost: 2550, // Rs. 2,550 per portion
          wasteType: 'PRODUCT',
          reason: 'Customer return',
          tags: ['quality_issue'],
          preventable: false,
          severity: 'LOW',
          recipeId: recipes[1].id,
          tenantId: demoTenant.id,
          branchId: branches[2].id,
          loggedBy: branchAdmins[2].id
        }
      })
    ]);

    console.log('✅ Created sample waste logs');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Created Structure:');
    console.log(`   • 1 System Tenant (KitchZero)`);
    console.log(`   • 1 Demo Restaurant Tenant (${demoTenant.name})`);
    console.log(`   • ${branches.length} Restaurant Branches`);
    console.log(`   • 1 KitchZero Admin`);
    console.log(`   • 1 Restaurant Admin`);
    console.log(`   • ${branchAdmins.length} Branch Admins`);
    console.log(`   • ${recipes.length} Sample Recipes`);
    console.log(`   • Multiple Inventory Items per Branch`);
    console.log(`   • Sample Waste Logs`);
    console.log(`   • Tenant Settings (LKR currency for Sri Lanka)`);

    console.log('\n🔐 Login Credentials:');
    console.log('  KitchZero Admin:');
    console.log('    Username: kitchzero_admin');
    console.log('    Password: admin123');
    console.log('');
    console.log('  Restaurant Admin (can access all branches):');
    console.log('    Username: spice_admin');
    console.log('    Password: admin123');
    console.log('');
    console.log('  Branch Admins (can only access their own branch):');
    console.log('    Downtown Main: downtown_admin / branch123');
    console.log('    Kandy Heights: kandy_admin / branch123');
    console.log('    Galle Fort: galle_admin / branch123');

    console.log('\n🏢 Branch Structure:');
    branches.forEach((branch, index) => {
      console.log(`   ${index + 1}. ${branch.name} - ${branch.address}`);
      console.log(`      ID: ${branch.id}`);
      console.log(`      Admin: ${branchAdmins[index].username}`);
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seed()
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { seed };