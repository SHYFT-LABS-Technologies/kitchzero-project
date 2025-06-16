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

  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: any; tokens: AuthTokens; mustChangePassword?: boolean }>> {
    const response = await this.post<ApiResponse<{ user: any; tokens: AuthTokens; mustChangePassword?: boolean }>>('/api/auth/login', credentials);
    
    if (response.success && response.data) {
      this.setTokens(response.data.tokens);
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
      this.clearTokens();
      window.location.href = '/auth/login';
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
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/api/tenants/${tenantId}/waste-logs?${searchParams}`);
  },
  createLog: (tenantId: string, branchId: string, data: any) => 
    apiClient.post(`/api/tenants/${tenantId}/branches/${branchId}/waste-logs`, data),
  updateLog: (tenantId: string, logId: string, data: any) => 
    apiClient.put(`/api/tenants/${tenantId}/waste-logs/${logId}`, data),
  deleteLog: (tenantId: string, logId: string) => 
    apiClient.delete(`/api/tenants/${tenantId}/waste-logs/${logId}`),
  getStats: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/api/tenants/${tenantId}/waste-stats?${searchParams}`);
  },
  getTrends: (tenantId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/api/tenants/${tenantId}/waste-trends?${searchParams}`);
  },
};

export const recipeApi = {
  getRecipes: (tenantId: string) => 
    apiClient.get(`/api/tenants/${tenantId}/recipes`),
  getRecipe: (tenantId: string, recipeId: string) => 
    apiClient.get(`/api/tenants/${tenantId}/recipes/${recipeId}`),
  createRecipe: (tenantId: string, data: any) => 
    apiClient.post(`/api/tenants/${tenantId}/recipes`, data),
  updateRecipe: (tenantId: string, recipeId: string, data: any) => 
    apiClient.put(`/api/tenants/${tenantId}/recipes/${recipeId}`, data),
  deleteRecipe: (tenantId: string, recipeId: string) => 
    apiClient.delete(`/api/tenants/${tenantId}/recipes/${recipeId}`),
  getCost: (tenantId: string, recipeId: string, branchId?: string) => {
    const params = branchId ? `?branchId=${branchId}` : '';
    return apiClient.get(`/api/tenants/${tenantId}/recipes/${recipeId}/cost${params}`);
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
  getStats: () => apiClient.get('/api/dashboard/stats'),
};