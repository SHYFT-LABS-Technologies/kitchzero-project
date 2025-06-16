export type UserRole = 'KITCHZERO_ADMIN' | 'RESTAURANT_ADMIN' | 'BRANCH_ADMIN';

export type InventoryUnit = 'KG' | 'L' | 'PORTION' | 'PIECE';

export type WasteType = 'RAW' | 'PRODUCT';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ActionType = 
  | 'UPDATE_INVENTORY' 
  | 'DELETE_INVENTORY' 
  | 'UPDATE_WASTE_LOG' 
  | 'DELETE_WASTE_LOG';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  tenantId: string;
  branchId?: string;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  unit: InventoryUnit;
  quantity: number;
  cost: number;
  receivedAt: Date;
  expiryDate: Date;
  tenantId: string;
  branchId: string;
  batchId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Recipe {
  id: string;
  productName: string;
  portionSize: number;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeItem {
  id: string;
  recipeId: string;
  itemName: string;
  quantity: number;
  unit: InventoryUnit;
  createdAt: Date;
  updatedAt: Date;
}

export interface WasteLog {
  id: string;
  itemName: string;
  quantity: number;
  unit: InventoryUnit;
  cost: number;
  wasteType: WasteType;
  reason: string;
  tags: string[];
  recipeId?: string;
  tenantId: string;
  branchId: string;
  loggedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRequest {
  id: string;
  actionType: ActionType;
  reasonForRequest: string;
  originalData: Record<string, any>;
  proposedData: Record<string, any>;
  submittedBy: string;
  reviewStatus: ApprovalStatus;
  reviewedBy?: string;
  reviewComment?: string;
  tenantId: string;
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  username: string;
  newPassword: string;
}

export interface CreateTenantRequest {
  name: string;
  adminUsername: string;
  branchName?: string;
  branchAddress?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalWaste: number;
  wasteValue: number;
  lowStockItems: number;
  expiringItems: number;
  wasteByCategory: Record<string, number>;
  wasteByReason: Record<string, number>;
}