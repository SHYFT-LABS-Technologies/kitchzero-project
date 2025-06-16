import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword, generateTokens, verifyToken, generatePassword } from '@kitchzero/utils';
import { env } from '@kitchzero/config';
import { LoginRequest, ChangePasswordRequest, ResetPasswordRequest, AuthTokens, UserRole } from '@kitchzero/types';

export class AuthService {
  async login(data: LoginRequest): Promise<{ user: any; tokens: AuthTokens; mustChangePassword: boolean }> {
    const user = await prisma.user.findUnique({
      where: { username: data.username },
      include: { tenant: true, branch: true }
    });
    
    if (!user || !(await comparePassword(data.password, user.passwordHash))) {
      throw new Error('Invalid credentials');
    }
    
    const tokens = generateTokens(
      {
        userId: user.id,
        username: user.username,
        role: user.role as UserRole,
        tenantId: user.tenantId,
        branchId: user.branchId || undefined
      },
      env.JWT_SECRET,
      env.JWT_REFRESH_SECRET,
      env.JWT_EXPIRES_IN,
      env.JWT_REFRESH_EXPIRES_IN
    );
    
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        branchId: user.branchId,
        tenant: user.tenant,
        branch: user.branch
      },
      tokens,
      mustChangePassword: user.mustChangePassword
    };
  }
  
  async changePassword(userId: string, data: ChangePasswordRequest): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!(await comparePassword(data.currentPassword, user.passwordHash))) {
      throw new Error('Current password is incorrect');
    }
    
    const newPasswordHash = await hashPassword(data.newPassword, env.BCRYPT_ROUNDS);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false
      }
    });
    
    await this.revokeAllRefreshTokens(userId);
  }
  
  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    const user = await prisma.user.findUnique({ where: { username: data.username } });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const newPasswordHash = await hashPassword(data.newPassword, env.BCRYPT_ROUNDS);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false
      }
    });
    
    await this.revokeAllRefreshTokens(user.id);
  }
  
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });
    
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }
    
    try {
      verifyToken(refreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw new Error('Invalid refresh token');
    }
    
    const newTokens = generateTokens(
      {
        userId: tokenRecord.user.id,
        username: tokenRecord.user.username,
        role: tokenRecord.user.role as UserRole,
        tenantId: tokenRecord.user.tenantId,
        branchId: tokenRecord.user.branchId || undefined
      },
      env.JWT_SECRET,
      env.JWT_REFRESH_SECRET,
      env.JWT_EXPIRES_IN,
      env.JWT_REFRESH_EXPIRES_IN
    );
    
    await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
    await this.storeRefreshToken(tokenRecord.user.id, newTokens.refreshToken);
    
    return newTokens;
  }
  
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt
      }
    });
  }
  
  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
}