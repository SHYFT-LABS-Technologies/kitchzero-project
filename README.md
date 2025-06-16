# KitchZero - Food Waste Management Platform

KitchZero is a production-grade, secure, scalable, multi-tenant SaaS platform designed to help restaurants and foodservice businesses reduce food waste, manage inventory intelligently, and gain actionable sustainability insights.

## 🏗️ Architecture

This project uses a monorepo structure with Turborepo:

- `apps/web`: Next.js 14 frontend with TypeScript and Tailwind CSS
- `apps/api`: Fastify backend API with TypeScript
- `packages/types`: Shared TypeScript type definitions
- `packages/schemas`: Zod validation schemas
- `packages/config`: Environment configuration
- `packages/utils`: Utility functions and helpers

## 🔐 Security Features

- **Authentication**: Username + password with JWT (access + refresh tokens)
- **Authorization**: Role-based access control (RBAC)
- **Password Security**: bcrypt hashing with enforced password changes
- **Multi-tenancy**: Secure tenant isolation with row-level security
- **Rate limiting**: Built-in request rate limiting
- **Input validation**: Comprehensive Zod schema validation

## 👥 User Roles

| Role | Description |
|------|-------------|
| `KITCHZERO_ADMIN` | Platform administrator - manages tenants |
| `RESTAURANT_ADMIN` | Restaurant administrator - manages all branches |
| `BRANCH_ADMIN` | Branch administrator - manages single location |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- pnpm 8+

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd kitchzero-project

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
```

### 2. Environment Setup

Edit `.env` and configure:

```bash
# Database - Update with your PostgreSQL credentials
DATABASE_URL="postgresql://username:password@localhost:5432/kitchzero"

# JWT Secrets - Generate strong random strings
JWT_SECRET="your-jwt-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"

# Admin CLI Secret - Generate strong random string
ADMIN_CLI_SECRET="your-admin-cli-secret"
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm run db:generate

# Push database schema
pnpm run db:push

# Optional: Run database migrations (for production)
cd apps/api && pnpm run db:migrate
```

### 4. Development

```bash
# Start all services in development mode
pnpm run dev

# Or start individual services:
# API server (http://localhost:3001)
cd apps/api && pnpm run dev

# Web frontend (http://localhost:3000)  
cd apps/web && pnpm run dev
```

### 5. Create Your First Tenant

```bash
# Create a tenant with admin user
pnpm create-tenant --name="Demo Restaurant" --username="demo_admin" --secret="your-admin-cli-secret"
```

This will output the generated admin credentials. **Save them securely!**

### 6. Login

1. Open http://localhost:3000
2. Login with the generated admin credentials
3. Change the password when prompted
4. Explore the dashboard!

## 📦 Core Features

### Inventory Management
- FIFO-based stock deduction
- Batch tracking with expiry dates
- Low stock and expiry alerts
- Multi-unit support (KG, L, PORTION, PIECE)

### Waste Logging
- RAW and PRODUCT waste types
- Automatic recipe ingredient deduction
- AI-powered waste classification and tagging
- Cost tracking and analysis

### Recipe Management
- Ingredient linking and cost calculation
- Portion-based recipes
- Recipe cost analysis

### Approval Workflow
- BRANCH_ADMIN actions require approval
- Comprehensive audit trail
- Reason tracking for all changes

### Dashboard & Insights
- Real-time waste and inventory analytics
- Sustainability scoring
- Trend analysis and reporting
- Export capabilities

## 🏗️ Production Deployment

### Build for Production

```bash
# Build all packages
pnpm run build

# Build individual apps
cd apps/api && pnpm run build
cd apps/web && pnpm run build
```

### Environment Variables (Production)

Ensure these are properly configured:

```bash
NODE_ENV="production"
DATABASE_URL="your-production-database-url"
JWT_SECRET="strong-production-jwt-secret"
JWT_REFRESH_SECRET="strong-production-refresh-secret"
ADMIN_CLI_SECRET="strong-production-admin-secret"
CORS_ORIGIN="https://yourdomain.com"
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
```

### Recommended Stack

- **Frontend**: Vercel
- **Backend**: Railway, Render, or AWS
- **Database**: Supabase, Railway PostgreSQL, or AWS RDS
- **Monitoring**: Sentry, LogRocket

## 🔧 CLI Commands

### Tenant Management

```bash
# Create new tenant
pnpm create-tenant --name="Restaurant Name" --username="admin_user" --secret="admin-secret"

# With custom branch details
pnpm create-tenant --name="Pizza Palace" --username="pizza_admin" --branch-name="Downtown Location" --branch-address="123 Main St" --secret="admin-secret"
```

### Database Management

```bash
# Generate Prisma client
pnpm run db:generate

# Push schema changes (development)
pnpm run db:push

# Create and run migrations (production)
pnpm run db:migrate

# View database in Prisma Studio
cd apps/api && pnpm run db:studio
```

## 🎨 Design System

KitchZero uses a custom Tailwind CSS design system with:

- **Primary**: `#6DBA7E` (Eco Green)
- **Secondary**: `#2F5D62` (Intelligent Blue)  
- **Accent**: `#E37A51` (Warm Terracotta)
- **Background**: `#FAFAF8` (Minimalist Off-White)
- **Text**: `#2E2E2E` (Neutral Charcoal)

## 🧪 Testing

```bash
# Run API tests
cd apps/api && pnpm test

# Run frontend tests  
cd apps/web && pnpm test

# Run all tests
pnpm test
```

## 📖 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - Logout user

### Core Endpoints

- **Inventory**: `/api/tenants/{tenantId}/inventory`
- **Waste Logs**: `/api/tenants/{tenantId}/waste-logs`
- **Recipes**: `/api/tenants/{tenantId}/recipes`
- **Approvals**: `/api/tenants/{tenantId}/approval-requests`

### Health Check

- `GET /health` - API health status

## 🔄 Extending the Platform

### Adding New Features

1. **Backend**: Add new services in `apps/api/src/services/`
2. **Frontend**: Add new pages in `apps/web/src/app/`
3. **Types**: Update shared types in `packages/types/`
4. **Validation**: Add schemas in `packages/schemas/`

### Adding Integrations

Common integrations to consider:

- **Payments**: Stripe for billing
- **Analytics**: Mixpanel, Amplitude
- **Communication**: SendGrid, Twilio
- **Storage**: AWS S3, Cloudinary
- **AI/ML**: OpenAI for enhanced waste analysis

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL
```

**Build Failures**
```bash
# Clear all node_modules and reinstall
pnpm clean
pnpm install
```

**Authentication Issues**
- Verify JWT secrets are set
- Check token expiration times
- Ensure database user records exist

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Built with ❤️ by the KitchZero Team**