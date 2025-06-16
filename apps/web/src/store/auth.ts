import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@kitchzero/types';

interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  tenantId: string;
  branchId?: string;
  tenant: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  setUser: (user: AuthUser, mustChangePassword?: boolean) => void;
  clearUser: () => void;
  setMustChangePassword: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      mustChangePassword: false,
      
      setUser: (user: AuthUser, mustChangePassword = false) => {
        set({
          user,
          isAuthenticated: true,
          mustChangePassword
        });
      },
      
      clearUser: () => {
        set({
          user: null,
          isAuthenticated: false,
          mustChangePassword: false
        });
      },
      
      setMustChangePassword: (value: boolean) => {
        set({ mustChangePassword: value });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
);