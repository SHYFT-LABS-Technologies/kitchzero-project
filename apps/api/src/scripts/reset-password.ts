#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { resolve } from 'path';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

interface ResetPasswordOptions {
  username: string;
  password?: string;
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

async function resetPassword(options: ResetPasswordOptions) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: options.username },
      include: { tenant: true }
    });

    if (!user) {
      console.error(`❌ User '${options.username}' not found.`);
      process.exit(1);
    }

    const newPassword = options.password || generatePassword();
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: true
      }
    });

    // Clear all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id }
    });

    console.log('✅ Password reset successfully!');
    console.log('');
    console.log('👤 User Details:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Tenant: ${user.tenant.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   New Password: ${newPassword}`);
    console.log('');
    console.log('⚠️  IMPORTANT: The user must change their password on first login.');
    console.log('   All existing sessions have been terminated.');

  } catch (error) {
    console.error('❌ Failed to reset password:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const program = new Command();
  
  program
    .name('reset-password')
    .description('Reset a user\'s password')
    .option('--username <username>', 'Username to reset password for')
    .option('--password [password]', 'New password (will generate one if not provided)')
    .action(async (options) => {
      if (!options.username) {
        console.error('❌ Missing required option: --username');
        program.help();
      }
      
      await resetPassword(options);
    });
  
  program.parse();
}

if (require.main === module) {
  main().catch(console.error);
}