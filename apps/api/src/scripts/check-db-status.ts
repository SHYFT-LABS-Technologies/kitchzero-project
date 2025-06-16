#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  try {
    console.log('🔍 Checking database status...');
    
    // Test database connection
    console.log('\n1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if tables exist by querying them
    console.log('\n2. Checking table structure...');
    
    try {
      const tenantCount = await prisma.tenant.count();
      console.log(`✅ Tenants table exists (${tenantCount} records)`);
    } catch (error) {
      console.log('❌ Tenants table missing or has issues');
    }
    
    try {
      const branchCount = await prisma.branch.count();
      console.log(`✅ Branches table exists (${branchCount} records)`);
    } catch (error) {
      console.log('❌ Branches table missing or has issues');
    }
    
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Users table exists (${userCount} records)`);
    } catch (error) {
      console.log('❌ Users table missing or has issues');
    }
    
    try {
      const inventoryCount = await prisma.inventoryItem.count();
      console.log(`✅ InventoryItems table exists (${inventoryCount} records)`);
    } catch (error: any) {
      console.log('❌ InventoryItems table missing or has issues:', error.message);
    }
    
    // Check if we have test data
    console.log('\n3. Checking for test data...');
    try {
      const firstTenant = await prisma.tenant.findFirst({
        include: {
          branches: true,
          users: true
        }
      });
      
      if (firstTenant) {
        console.log(`✅ Found tenant: ${firstTenant.name}`);
        console.log(`   Branches: ${firstTenant.branches.length}`);
        console.log(`   Users: ${firstTenant.users.length}`);
        
        if (firstTenant.branches.length > 0) {
          console.log(`   First branch: ${firstTenant.branches[0].name}`);
        }
      } else {
        console.log('❌ No tenants found - need to create tenant first');
      }
    } catch (error) {
      console.log('❌ Error checking test data:', error);
    }
    
    console.log('\n✅ Database status check completed');
    
  } catch (error) {
    console.error('❌ Database status check failed:', error);
    
    if (error instanceof Error && error.message.includes('connect')) {
      console.log('\n💡 Database connection failed. Check:');
      console.log('1. Is PostgreSQL running?');
      console.log('2. Is DATABASE_URL correct in .env?');
      console.log('3. Does the database exist?');
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkDatabaseStatus().catch(console.error);
}