import jwt from 'jsonwebtoken';
import { AuthTokens, UserRole } from '@kitchzero/types';

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  tenantId: string;
  branchId?: string;
  iat?: number;
  exp?: number;
}

export function generateTokens(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  jwtSecret: string,
  refreshSecret: string,
  expiresIn: string = '15m',
  refreshExpiresIn: string = '7d'
): AuthTokens {
  // Add a random jti (JWT ID) to ensure uniqueness
  const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);
  
  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn, jwtid: jti } as jwt.SignOptions);
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn, jwtid: jti + '_refresh' } as jwt.SignOptions);
  
  return { accessToken, refreshToken };
}

export function verifyToken(token: string, secret: string): JWTPayload {
  return jwt.verify(token, secret) as JWTPayload;
}

export function generatePassword(): string {
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

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    'KITCHZERO_ADMIN': 3,
    'RESTAURANT_ADMIN': 2,
    'BRANCH_ADMIN': 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canAccessTenant(userRole: UserRole, userTenantId: string, targetTenantId: string): boolean {
  if (userRole === 'KITCHZERO_ADMIN') return true;
  return userTenantId === targetTenantId;
}

export function canAccessBranch(
  userRole: UserRole, 
  userBranchId: string | undefined, 
  targetBranchId: string
): boolean {
  if (userRole === 'KITCHZERO_ADMIN' || userRole === 'RESTAURANT_ADMIN') return true;
  return userBranchId === targetBranchId;
}