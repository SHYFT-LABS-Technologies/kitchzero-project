import { ApiResponse, AuthTokens, LoginRequest, ChangePasswordRequest } from '@kitchzero/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
      
      // If we have tokens but no auth state, clear tokens to force fresh login
      // This handles cases where localStorage has stale tokens
      if (this.accessToken && this.refreshToken) {
        try {
          // Check if tokens are valid by attempting to parse JWT
          const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
          const now = Date.now() / 1000;
          
          // If access token is expired and we don't have a valid refresh token structure
          if (payload.exp < now) {
            console.warn('Access token expired on initialization, will attempt refresh on first request');
          }
        } catch (error) {
          console.warn('Invalid token format found, clearing tokens');
          this.clearTokens();
        }
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && this.refreshToken) {
        try {
          await this.refreshTokens();
          
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          
          return retryResponse.json();
        } catch (refreshError) {
          // Token refresh failed, the user needs to login again
          // But don't redirect automatically - let the app handle this gracefully
          console.warn('Authentication failed, tokens have been cleared');
          throw new Error('Authentication failed - please login again');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async login(credentials: LoginRequest): Promise<{ success: boolean; user: any; tokens: AuthTokens; mustChangePassword?: boolean }> {
    const response = await this.post<{ success: boolean; user: any; tokens: AuthTokens; mustChangePassword?: boolean }>('/api/auth/login', credentials);
    
    if (response.success && response.tokens) {
      this.setTokens(response.tokens);
    }
    
    return response;
  }

  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse> {
    return this.post<ApiResponse>('/api/auth/change-password', data);
  }

  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await this.post('/api/auth/logout', { refreshToken: this.refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    this.clearTokens();
  }

  private async refreshTokens(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setTokens(data.tokens);
    } catch (error) {
      console.warn('Token refresh failed, clearing tokens:', error);
      this.clearTokens();
      
      // Don't immediately redirect - let the app handle the authentication state
      // This prevents unexpected redirects on page reload
      throw error;
    }
  }

  private setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Clear auth store when tokens are cleared
      // Import dynamically to avoid circular dependency
      import('../store/auth').then(({ useAuthStore }) => {
        useAuthStore.getState().clearUser();
      }).catch(() => {
        // Ignore errors if store is not available
      });
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

export const inventoryApi = {
  getItems: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params || {});
    const queryString = searchParams.toString();
    const url = `/api/tenants/${tenantId}/inventory${queryString ? `?${queryString}` : ''}`;
    console.log('🌐 API request URL:', url);
    return apiClient.get(url);
  },
  getItemsByBranch: (tenantId: string, branchId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params || {});
    const queryString = searchParams.toString();
    return apiClient.get(`/api/tenants/${tenantId}/branches/${branchId}/inventory${queryString ? `?${queryString}` : ''}`);
  },
  getItem: (tenantId: string, itemId: string) =>
    apiClient.get(`/api/tenants/${tenantId}/inventory/${itemId}`),
  createItem: (tenantId: string, branchId: string, data: any) =>
    apiClient.post(`/api/tenants/${tenantId}/branches/${branchId}/inventory`, data),
  updateItem: (tenantId: string, itemId: string, data: any) =>
    apiClient.put(`/api/tenants/${tenantId}/inventory/${itemId}`, data),
  deleteItem: (tenantId: string, itemId: string) =>
    apiClient.delete(`/api/tenants/${tenantId}/inventory/${itemId}`),
  getStats: (tenantId: string) =>
    apiClient.get(`/api/tenants/${tenantId}/inventory/stats`),
  // Stock Management endpoints
  getStockManagement: (tenantId: string) =>
    apiClient.get(`/api/tenants/${tenantId}/inventory/stock-management`),
  updateStockLevels: (tenantId: string, productName: string, category: string, unit: string, data: any) => 
    apiClient.put(`/api/tenants/${tenantId}/products/${encodeURIComponent(productName)}/${encodeURIComponent(category)}/${encodeURIComponent(unit)}/stock-levels`, data),
};

export const wasteApi = {
  getLogs: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params || {});
    const queryString = searchParams.toString();
    return apiClient.get(`/api/tenants/${tenantId}/waste-logs${queryString ? `?${queryString}` : ''}`);
  },
  createLog: (tenantId: string, branchId: string, data: any) => 
    apiClient.post(`/api/tenants/${tenantId}/branches/${branchId}/waste-logs`, data),
  updateLog: (tenantId: string, logId: string, data: any) => 
    apiClient.put(`/api/tenants/${tenantId}/waste-logs/${logId}`, data),
  deleteLog: (tenantId: string, logId: string) => 
    apiClient.delete(`/api/tenants/${tenantId}/waste-logs/${logId}`),
  getStats: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params || {});
    const queryString = searchParams.toString();
    return apiClient.get(`/api/tenants/${tenantId}/waste-stats${queryString ? `?${queryString}` : ''}`);
  },
  getTrends: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params || {});
    const queryString = searchParams.toString();
    return apiClient.get(`/api/tenants/${tenantId}/waste-trends${queryString ? `?${queryString}` : ''}`);
  },
};

export const recipeApi = {
  getRecipes: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params || {});
    const queryString = searchParams.toString();
    return apiClient.get(`/api/recipes${queryString ? `?${queryString}` : ''}`);
  },
  getRecipe: (tenantId: string, recipeId: string) => 
    apiClient.get(`/api/recipes/${recipeId}`),
  createRecipe: (tenantId: string, data: any) => 
    apiClient.post(`/api/recipes`, data),
  updateRecipe: (tenantId: string, recipeId: string, data: any) => 
    apiClient.put(`/api/recipes/${recipeId}`, data),
  deleteRecipe: (tenantId: string, recipeId: string) => 
    apiClient.delete(`/api/recipes/${recipeId}`),
  getCost: (tenantId: string, recipeId: string, branchId?: string) => {
    const params = branchId ? `?branchId=${branchId}` : '';
    return apiClient.get(`/api/recipes/${recipeId}/cost${params}`);
  },
  checkAvailability: (tenantId: string, recipeId: string, multiplier: number) => 
    apiClient.get(`/api/recipes/${recipeId}/availability?multiplier=${multiplier}`),
};

export const productionApi = {
  getProductions: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params || {});
    const queryString = searchParams.toString();
    return apiClient.get(`/api/tenants/${tenantId}/productions${queryString ? `?${queryString}` : ''}`);
  },
  getProduction: (tenantId: string, productionId: string) => 
    apiClient.get(`/api/tenants/${tenantId}/productions/${productionId}`),
  createProduction: (tenantId: string, data: any) => 
    apiClient.post(`/api/tenants/${tenantId}/productions`, data),
  updateProduction: (tenantId: string, productionId: string, data: any) => 
    apiClient.put(`/api/tenants/${tenantId}/productions/${productionId}`, data),
  deleteProduction: (tenantId: string, productionId: string) => 
    apiClient.delete(`/api/tenants/${tenantId}/productions/${productionId}`),
  getAnalytics: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params || {});
    const queryString = searchParams.toString();
    return apiClient.get(`/api/tenants/${tenantId}/productions/analytics${queryString ? `?${queryString}` : ''}`);
  },
};

export const approvalApi = {
  getRequests: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/api/tenants/${tenantId}/approval-requests?${searchParams}`);
  },
  getRequest: (tenantId: string, requestId: string) => 
    apiClient.get(`/api/tenants/${tenantId}/approval-requests/${requestId}`),
  reviewRequest: (tenantId: string, requestId: string, data: any) => 
    apiClient.post(`/api/tenants/${tenantId}/approval-requests/${requestId}/review`, data),
  submitInventoryUpdate: (tenantId: string, itemId: string, data: any) => 
    apiClient.post(`/api/tenants/${tenantId}/inventory/${itemId}/request-update`, data),
  submitInventoryDelete: (tenantId: string, itemId: string, data: any) => 
    apiClient.post(`/api/tenants/${tenantId}/inventory/${itemId}/request-delete`, data),
  getPendingCount: (tenantId: string) => 
    apiClient.get(`/api/tenants/${tenantId}/approval-requests/pending/count`),
  getStats: (tenantId: string) => 
    apiClient.get(`/api/tenants/${tenantId}/approval-requests/stats`),
};

export const dashboardApi = {
  getStats: (tenantId: string) => 
    apiClient.get(`/api/tenants/${tenantId}/dashboard/stats`),
  getActivity: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params || {});
    const queryString = searchParams.toString();
    return apiClient.get(`/api/tenants/${tenantId}/dashboard/activity${queryString ? `?${queryString}` : ''}`);
  },
  getWasteItems: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params || {});
    const queryString = searchParams.toString();
    return apiClient.get(`/api/tenants/${tenantId}/dashboard/waste-items${queryString ? `?${queryString}` : ''}`);
  },
};

export const settingsApi = {
  getSettings: (tenantId: string) => 
    apiClient.get(`/api/tenants/${tenantId}/settings`),
  updateSettings: (tenantId: string, settings: any) => 
    apiClient.put(`/api/tenants/${tenantId}/settings`, settings),
};