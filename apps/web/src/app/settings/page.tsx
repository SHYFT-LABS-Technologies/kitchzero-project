'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon,
  DollarSign,
  Globe,
  Clock,
  Bell,
  Building2,
  User,
  Shield,
  Save,
  Info,
  MapPin,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { settingsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useSettings } from '@/context/settings-context';

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

const CURRENCIES = [
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs.' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' }
];

const TIMEZONES = [
  { value: 'Asia/Colombo', label: 'Sri Lanka (GMT+5:30)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'Eastern Time (GMT-5)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' }
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2024)' }
];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<TenantSettings>({
    currency: 'LKR',
    currencySymbol: 'Rs.',
    timezone: 'Asia/Colombo',
    dateFormat: 'DD/MM/YYYY',
    language: 'en',
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    taxRate: 0,
    notificationEmail: true,
    notificationSms: false,
    lowStockThreshold: 10,
    wasteAlertThreshold: 50
  });

  // Check permissions
  const canEditSettings = user?.role === 'RESTAURANT_ADMIN' || user?.role === 'KITCHZERO_ADMIN';
  const { refetch: refetchGlobalSettings } = useSettings();

  useEffect(() => {
    if (!user?.tenantId) {
      router.push('/auth/login');
      return;
    }
    fetchSettings();
  }, [user?.tenantId, router]);

  const fetchSettings = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      const response = await settingsApi.getSettings(user.tenantId);
      
      if (response.success) {
        setSettings(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch settings');
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
      
      // Fallback to default Sri Lanka settings if API fails
      const defaultSettings = {
        currency: 'LKR',
        currencySymbol: 'Rs.',
        timezone: 'Asia/Colombo',
        dateFormat: 'DD/MM/YYYY',
        language: 'en',
        businessName: user?.tenant?.name || 'Your Restaurant',
        businessAddress: 'Colombo, Sri Lanka',
        businessPhone: '+94 11 234 5678',
        businessEmail: 'info@restaurant.lk',
        taxRate: 8.0,
        notificationEmail: true,
        notificationSms: false,
        lowStockThreshold: 10,
        wasteAlertThreshold: 50
      };
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canEditSettings) {
      toast.error('You do not have permission to modify settings');
      return;
    }

    if (!user?.tenantId) {
      toast.error('No tenant ID available');
      return;
    }

    try {
      setSaving(true);
      const response = await settingsApi.updateSettings(user.tenantId, settings);
      
      if (response.success) {
        toast.success('Settings saved successfully');
        // Refresh global settings context to update currency across app
        refetchGlobalSettings();
      } else {
        throw new Error(response.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    if (currency) {
      setSettings(prev => ({
        ...prev,
        currency: currency.code,
        currencySymbol: currency.symbol
      }));
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'business', label: 'Business Info', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'alerts', label: 'Alerts & Thresholds', icon: Shield }
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">
                Manage your restaurant's configuration and preferences
              </p>
            </div>
            {canEditSettings && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>

          {/* Permission Notice */}
          {!canEditSettings && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Info className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800 text-sm">
                  You can view settings but cannot make changes. Contact your restaurant admin to modify these settings.
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Currency
                    </label>
                    <Select
                      value={settings.currency}
                      onChange={(e) => handleCurrencyChange(e.target.value)}
                      disabled={!canEditSettings}
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name} ({currency.code})
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Currency used for all financial calculations and displays
                    </p>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Timezone
                    </label>
                    <Select
                      value={settings.timezone}
                      onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                      disabled={!canEditSettings}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Date Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date Format
                    </label>
                    <Select
                      value={settings.dateFormat}
                      onChange={(e) => setSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                      disabled={!canEditSettings}
                    >
                      {DATE_FORMATS.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="w-4 h-4 inline mr-1" />
                      Language
                    </label>
                    <Select
                      value={settings.language}
                      onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                      disabled={!canEditSettings}
                    >
                      <option value="en">English</option>
                      <option value="si">සිංහල (Sinhala)</option>
                      <option value="ta">தமிழ் (Tamil)</option>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Business Info */}
            {activeTab === 'business' && (
              <div className="p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name
                    </label>
                    <Input
                      value={settings.businessName}
                      onChange={(e) => setSettings(prev => ({ ...prev, businessName: e.target.value }))}
                      disabled={!canEditSettings}
                      placeholder="Your Restaurant Name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Business Address
                    </label>
                    <textarea
                      value={settings.businessAddress}
                      onChange={(e) => setSettings(prev => ({ ...prev, businessAddress: e.target.value }))}
                      disabled={!canEditSettings}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50"
                      placeholder="Street address, city, postal code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone Number
                    </label>
                    <Input
                      value={settings.businessPhone}
                      onChange={(e) => setSettings(prev => ({ ...prev, businessPhone: e.target.value }))}
                      disabled={!canEditSettings}
                      placeholder="+94 11 234 5678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={settings.businessEmail}
                      onChange={(e) => setSettings(prev => ({ ...prev, businessEmail: e.target.value }))}
                      disabled={!canEditSettings}
                      placeholder="info@restaurant.lk"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={settings.taxRate}
                      onChange={(e) => setSettings(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                      disabled={!canEditSettings}
                      placeholder="8.0"
                    />
                    <p className="text-xs text-gray-500 mt-1">VAT/Sales tax rate for your location</p>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Email Notifications</h4>
                      <p className="text-sm text-gray-500">Receive alerts and reports via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notificationEmail}
                        onChange={(e) => setSettings(prev => ({ ...prev, notificationEmail: e.target.checked }))}
                        disabled={!canEditSettings}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                      <p className="text-sm text-gray-500">Receive critical alerts via SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notificationSms}
                        onChange={(e) => setSettings(prev => ({ ...prev, notificationSms: e.target.checked }))}
                        disabled={!canEditSettings}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Alerts & Thresholds */}
            {activeTab === 'alerts' && (
              <div className="p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Alert Thresholds</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Low Stock Threshold
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={settings.lowStockThreshold}
                      onChange={(e) => setSettings(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                      disabled={!canEditSettings}
                      placeholder="10"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when inventory quantity falls below this amount
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waste Alert Threshold ({settings.currencySymbol})
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={settings.wasteAlertThreshold}
                      onChange={(e) => setSettings(prev => ({ ...prev, wasteAlertThreshold: parseInt(e.target.value) || 0 }))}
                      disabled={!canEditSettings}
                      placeholder="50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when waste cost exceeds this amount per day
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}