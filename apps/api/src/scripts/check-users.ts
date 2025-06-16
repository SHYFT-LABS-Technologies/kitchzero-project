#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking existing users in database...');
    
    const users = await prisma.user.findMany({
      include: {
        tenant: true,
        branch: true
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found in database.');
      console.log('💡 Run: pnpm run create-tenant to create your first user.');
      return;
    }

    console.log(`✅ Found ${users.length} user(s):`);
    console.log('');

    users.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Tenant: ${user.tenant.name}`);
      console.log(`   Branch: ${user.branch?.name || 'No branch'}`);
      console.log(`   Must Change Password: ${user.mustChangePassword}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

    console.log('🔑 To test login, use any username above with the password provided when the tenant was created.');
    console.log('💡 If you forgot the password, create a new tenant or reset the password.');

  } catch (error) {
    console.error('❌ Error checking users:', error);
    if (error instanceof Error && error.message.includes('connect')) {
      console.log('');
      console.log('💡 Database connection failed. Check:');
      console.log('   1. PostgreSQL is running');
      console.log('   2. DATABASE_URL in .env is correct');
      console.log('   3. Database exists and schema is pushed');
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkUsers();
}