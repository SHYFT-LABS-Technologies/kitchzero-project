#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing KitchZero APIs...');
  console.log(`📡 API Base: ${API_BASE}`);
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health:', healthData);
    
    // Test inventory endpoint (should fail without auth)
    console.log('\n2. Testing inventory endpoint (without auth)...');
    const inventoryResponse = await fetch(`${API_BASE}/api/inventory`);
    console.log(`Status: ${inventoryResponse.status}`);
    if (inventoryResponse.status === 401) {
      console.log('✅ Properly requires authentication');
    } else {
      console.log('❌ Authentication not working properly');
    }
    
    console.log('\n3. Testing categories endpoint (without auth)...');
    const categoriesResponse = await fetch(`${API_BASE}/api/inventory/categories`);
    console.log(`Status: ${categoriesResponse.status}`);
    if (categoriesResponse.status === 401) {
      console.log('✅ Categories endpoint properly requires authentication');
    } else {
      console.log('❌ Categories authentication not working properly');
    }
    
    console.log('\n✅ API tests completed');
    console.log('\n📝 Next steps:');
    console.log('1. Run: pnpm run db:generate');
    console.log('2. Run: pnpm run db:push');
    console.log('3. Run: pnpm run create-tenant');
    console.log('4. Run: pnpm run seed-inventory');
    console.log('5. Test login with created user');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

if (require.main === module) {
  testAPI();
}