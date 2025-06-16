import { z } from 'zod';

export const UserRoleSchema = z.enum(['KITCHZERO_ADMIN', 'RESTAURANT_ADMIN', 'BRANCH_ADMIN']);

export const InventoryUnitSchema = z.enum(['KG', 'L', 'PORTION', 'PIECE']);

export const WasteTypeSchema = z.enum(['RAW', 'PRODUCT']);

export const ApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const ActionTypeSchema = z.enum([
  'UPDATE_INVENTORY',
  'DELETE_INVENTORY', 
  'UPDATE_WASTE_LOG',
  'DELETE_WASTE_LOG'
]);

export const LoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100)
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
  )
});

export const ResetPasswordSchema = z.object({
  username: z.string().min(3).max(50),
  newPassword: z.string().min(8).max(100).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
  )
});

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(100),
  adminUsername: z.string().min(3).max(50),
  branchName: z.string().min(1).max(100).optional(),
  branchAddress: z.string().min(1).max(500).optional()
});

export const CreateInventoryItemSchema = z.object({
  itemName: z.string().min(1).max(100),
  unit: InventoryUnitSchema,
  quantity: z.number().positive(),
  cost: z.number().positive(),
  expiryDate: z.string().datetime(),
  batchId: z.string().min(1).max(100)
});

export const UpdateInventoryItemSchema = z.object({
  quantity: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  expiryDate: z.string().datetime().optional()
});

export const CreateRecipeSchema = z.object({
  productName: z.string().min(1).max(100),
  portionSize: z.number().positive(),
  ingredients: z.array(z.object({
    itemName: z.string().min(1).max(100),
    quantity: z.number().positive(),
    unit: InventoryUnitSchema
  })).min(1)
});

export const CreateWasteLogSchema = z.object({
  itemName: z.string().min(1).max(100),
  quantity: z.number().positive(),
  unit: InventoryUnitSchema,
  wasteType: WasteTypeSchema,
  reason: z.string().min(1).max(500),
  recipeId: z.string().uuid().optional()
});

export const CreateApprovalRequestSchema = z.object({
  actionType: ActionTypeSchema,
  reasonForRequest: z.string().min(1).max(500),
  originalData: z.record(z.any()),
  proposedData: z.record(z.any())
});

export const ReviewApprovalRequestSchema = z.object({
  reviewStatus: z.enum(['APPROVED', 'REJECTED']),
  reviewComment: z.string().max(500).optional()
});

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
});

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const WasteLogFiltersSchema = z.object({
  wasteType: WasteTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  branchId: z.string().uuid().optional()
}).merge(DateRangeSchema).merge(PaginationSchema);

export const InventoryFiltersSchema = z.object({
  unit: InventoryUnitSchema.optional(),
  lowStock: z.boolean().optional(),
  expiringSoon: z.boolean().optional(),
  branchId: z.string().uuid().optional()
}).merge(PaginationSchema);