#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

interface CreateTenantOptions {
  name: string;
  username: string;
  branchName?: string;
  branchAddress?: string;
  secret?: string;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%&*';
  const length = 12;
  let password = '';
  
  password += chars.charAt(Math.floor(Math.random() * 26)); // uppercase
  password += chars.charAt(Math.floor(Math.random() * 26) + 26); // lowercase  
  password += chars.charAt(Math.floor(Math.random() * 8) + 52); // number
  password += chars.charAt(Math.floor(Math.random() * 5) + 60); // special
  
  for (let i = 4; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  return bcrypt.hash(password, saltRounds);
}

async function createTenant(options: CreateTenantOptions) {
  try {
    const adminSecret = process.env.ADMIN_CLI_SECRET;
    if (options.secret !== adminSecret) {
      console.error('❌ Invalid admin secret. Access denied.');
      process.exit(1);
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { username: options.username }
    });
    
    if (existingUser) {
      console.error(`❌ Username '${options.username}' already exists.`);
      process.exit(1);
    }
    
    const generatedPassword = generatePassword();
    const passwordHash = await hashPassword(generatedPassword);
    
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: options.name
        }
      });
      
      const branch = await tx.branch.create({
        data: {
          name: options.branchName || `${options.name} Main Branch`,
          address: options.branchAddress || 'Main Location',
          tenantId: tenant.id
        }
      });
      
      const user = await tx.user.create({
        data: {
          username: options.username,
          passwordHash,
          role: 'RESTAURANT_ADMIN',
          tenantId: tenant.id,
          branchId: branch.id,
          mustChangePassword: true
        }
      });
      
      return { tenant, branch, user, generatedPassword };
    });
    
    console.log('✅ Tenant created successfully!');
    console.log('');
    console.log('📋 Tenant Details:');
    console.log(`   ID: ${result.tenant.id}`);
    console.log(`   Name: ${result.tenant.name}`);
    console.log('');
    console.log('🏢 Default Branch:');
    console.log(`   ID: ${result.branch.id}`);
    console.log(`   Name: ${result.branch.name}`);
    console.log(`   Address: ${result.branch.address}`);
    console.log('');
    console.log('👤 Admin User:');
    console.log(`   ID: ${result.user.id}`);
    console.log(`   Username: ${result.user.username}`);
    console.log(`   Role: ${result.user.role}`);
    console.log(`   Password: ${result.generatedPassword}`);
    console.log('');
    console.log('⚠️  IMPORTANT: The admin user must change their password on first login.');
    console.log('   Save these credentials securely as they cannot be recovered.');
    
  } catch (error) {
    console.error('❌ Failed to create tenant:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const program = new Command();
  
  program
    .name('create-tenant')
    .description('Create a new tenant with admin user and default branch')
    .option('--name <name>', 'Tenant name (e.g., "Pizza Hut")')
    .option('--username <username>', 'Admin username (e.g., "pizzahut_admin")')
    .option('--branch-name [branchName]', 'Default branch name')
    .option('--branch-address [branchAddress]', 'Default branch address')
    .option('--secret <secret>', 'Admin CLI secret for authentication')
    .action(async (options) => {
      if (!options.name || !options.username || !options.secret) {
        console.error('❌ Missing required options: --name, --username, and --secret are required');
        program.help();
      }
      
      await createTenant(options);
    });
  
  program.parse();
}

if (require.main === module) {
  main().catch(console.error);
}