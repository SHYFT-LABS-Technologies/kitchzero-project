'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { settingsApi } from '@/lib/api';

interface TenantSettings {
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  language: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  taxRate: number;
  notificationEmail: boolean;
  notificationSms: boolean;
  lowStockThreshold: number;
  wasteAlertThreshold: number;
}

interface SettingsContextType {
  settings: TenantSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const defaultSettings: TenantSettings = {
  currency: 'LKR',
  currencySymbol: 'Rs.',
  timezone: 'Asia/Colombo',
  dateFormat: 'DD/MM/YYYY',
  language: 'en',
  businessName: 'Your Restaurant',
  businessAddress: 'Colombo, Sri Lanka',
  businessPhone: '+94 11 234 5678',
  businessEmail: 'info@restaurant.lk',
  taxRate: 8.0,
  notificationEmail: true,
  notificationSms: false,
  lowStockThreshold: 10,
  wasteAlertThreshold: 50
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    if (!user?.tenantId) {
      setSettings(defaultSettings);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await settingsApi.getSettings(user.tenantId);
      
      if (response.success) {
        setSettings(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch settings');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch settings';
      console.warn('Failed to fetch settings, using defaults:', errorMessage);
      
      // Don't set error state for authentication issues - just use defaults
      if (!errorMessage.includes('Authentication failed')) {
        setError(errorMessage);
      }
      
      // Always fallback to default settings so the app can continue to function
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user?.tenantId]);

  const value: SettingsContextType = {
    settings,
    loading,
    error,
    refetch: fetchSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Hook to get currency formatting function with current settings
export function useCurrency() {
  const { settings } = useSettings();
  
  const formatCurrency = (
    amount: number | string | null | undefined,
    options: {
      showDecimals?: boolean;
      showSymbol?: boolean;
      compact?: boolean;
    } = {}
  ): string => {
    const {
      showDecimals = true,
      showSymbol = true,
      compact = false
    } = options;

    // Handle null/undefined/empty values
    if (amount === null || amount === undefined || amount === '') {
      return showSymbol ? `${settings?.currencySymbol || 'Rs.'}0` : '0';
    }

    // Convert to number
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Handle invalid numbers
    if (isNaN(numAmount)) {
      return showSymbol ? `${settings?.currencySymbol || 'Rs.'}0` : '0';
    }

    const currencySymbol = settings?.currencySymbol || 'Rs.';
    
    // Compact formatting for large numbers
    if (compact && Math.abs(numAmount) >= 1000) {
      let compactAmount = numAmount;
      let suffix = '';
      
      if (Math.abs(numAmount) >= 1000000) {
        compactAmount = numAmount / 1000000;
        suffix = 'M';
      } else if (Math.abs(numAmount) >= 1000) {
        compactAmount = numAmount / 1000;
        suffix = 'K';
      }
      
      const formattedAmount = compactAmount.toFixed(1).replace(/\.0$/, '') + suffix;
      return showSymbol ? `${currencySymbol}${formattedAmount}` : formattedAmount;
    }

    // Regular formatting
    const decimals = showDecimals ? 2 : 0;
    const formattedAmount = numAmount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    if (!showSymbol) {
      return formattedAmount;
    }

    // Always position symbol before the amount
    return `${currencySymbol}${formattedAmount}`;
  };

  const getCurrencySymbol = (): string => {
    return settings?.currencySymbol || 'Rs.';
  };

  const getCurrencyCode = (): string => {
    return settings?.currency || 'LKR';
  };

  return {
    formatCurrency,
    getCurrencySymbol,
    getCurrencyCode,
    settings
  };
}