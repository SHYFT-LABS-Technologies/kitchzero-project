# KitchZero Setup Instructions

## Quick Fix for Current Issues

Follow these steps in order:

### 1. Install Dependencies
```bash
# In the project root
pnpm install
```

### 2. Setup Environment
```bash
# Copy environment file
cp .env.example .env
```

Edit `.env` and set your database URL:
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/kitchzero"
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"
ADMIN_CLI_SECRET="your-super-secret-admin-cli-key-here"
```

### 3. Generate Prisma Client
```bash
# Navigate to API directory first
cd apps/api
pnpm run db:generate
```

### 4. Push Database Schema
```bash
# Still in apps/api directory
pnpm run db:push
```

### 5. Start Development
```bash
# Go back to root
cd ../..
pnpm run dev
```

### 6. Create First Tenant
```bash
# Create a tenant (from project root)
pnpm create-tenant --name="Demo Restaurant" --username="demo_admin" --secret="your-super-secret-admin-cli-key-here"
```

## Troubleshooting

### If Prisma generation fails:
```bash
cd apps/api
npx prisma generate
npx prisma db push
```

### If workspace issues persist:
```bash
# Remove node_modules and reinstall
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
pnpm install
```

### Database Issues:
Make sure PostgreSQL is running and accessible with the credentials in your `.env` file.

## Quick Development Start

After setup, these commands will be most useful:

```bash
# Start all services
pnpm run dev

# API only (port 3001)
cd apps/api && pnpm run dev

# Web only (port 3000)
cd apps/web && pnpm run dev

# View database
cd apps/api && pnpm run db:studio
```