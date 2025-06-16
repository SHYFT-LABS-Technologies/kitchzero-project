'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  BarChart3, 
  Search, 
  Filter, 
  Save, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Settings
} from 'lucide-react';
import { inventoryApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import AppLayout from '@/components/layout/app-layout';

interface StockManagementItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  safetyStock?: number;
  reorderQuantity?: number;
  leadTimeDays?: number;
  trackStock: boolean;
  isActive: boolean;
  supplier?: string;
  avgDailyUsage?: number;
  stockStatus: 'LOW' | 'OK' | 'HIGH' | 'OUT';
}

export default function StockManagementPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [items, setItems] = useState<StockManagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'OK' | 'HIGH' | 'OUT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (user?.tenantId) {
      fetchStockData();
    }
  }, [user?.tenantId]);

  const fetchStockData = async () => {
    if (!user?.tenantId) {
      toast.error('User information not available');
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔍 Fetching inventory for tenantId:', user.tenantId);
      
      // Use the new stock management endpoint
      const response = await inventoryApi.getStockManagement(user.tenantId);
      
      if (response.success) {
        setItems(response.data.items || []);
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      toast.error('Failed to load stock management data');
    } finally {
      setLoading(false);
    }
  };

  const updateStockLevels = async (item: StockManagementItem, updates: Partial<StockManagementItem>) => {
    if (!user?.tenantId) {
      toast.error('User information not available');
      return;
    }

    try {
      setSaving(item.id);
      
      const response = await inventoryApi.updateStockLevels(
        user.tenantId, 
        item.name, 
        item.category, 
        item.unit, 
        updates
      );
      
      if (response.success) {
        // Update local state
        setItems(prev => prev.map(prevItem => 
          prevItem.id === item.id ? { ...prevItem, ...updates } : prevItem
        ));
        toast.success('Stock levels updated successfully');
      } else {
        toast.error('Failed to update stock levels');
      }
    } catch (error) {
      console.error('Failed to update stock levels:', error);
      toast.error('Failed to update stock levels');
    } finally {
      setSaving(null);
    }
  };

  const calculateStockStatus = (item: StockManagementItem): 'LOW' | 'OK' | 'HIGH' | 'OUT' => {
    if (item.currentQuantity === 0) return 'OUT';
    if (!item.minStockLevel && !item.maxStockLevel) return 'OK';
    
    if (item.minStockLevel && item.currentQuantity <= item.minStockLevel) return 'LOW';
    if (item.maxStockLevel && item.currentQuantity >= item.maxStockLevel) return 'HIGH';
    return 'OK';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OUT': return 'text-red-700 bg-red-100';
      case 'LOW': return 'text-orange-700 bg-orange-100';
      case 'HIGH': return 'text-blue-700 bg-blue-100';
      default: return 'text-green-700 bg-green-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OUT': return <AlertTriangle className="w-4 h-4" />;
      case 'LOW': return <TrendingDown className="w-4 h-4" />;
      case 'HIGH': return <TrendingUp className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || calculateStockStatus(item) === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleFieldUpdate = (itemId: string, field: keyof StockManagementItem, value: any) => {
    // Update local state immediately for better UX
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleSaveItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      const updates = {
        minStockLevel: item.minStockLevel,
        maxStockLevel: item.maxStockLevel,
        safetyStock: item.safetyStock,
        reorderQuantity: item.reorderQuantity,
        leadTimeDays: item.leadTimeDays,
        trackStock: item.trackStock
      };
      updateStockLevels(item, updates);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Stock Level Management</h1>
                <p className="text-gray-600 mt-1">
                  Set minimum and maximum stock levels for automated reorder alerts
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="ALL">All Status</option>
                <option value="OUT">Out of Stock</option>
                <option value="LOW">Low Stock</option>
                <option value="OK">Normal</option>
                <option value="HIGH">Overstocked</option>
              </Select>
              
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Stock Management Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reorder Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => {
                    const status = calculateStockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.category}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.currentQuantity} {item.unit}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            <span className="ml-1">{status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.minStockLevel || ''}
                            onChange={(e) => handleFieldUpdate(item.id, 'minStockLevel', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.maxStockLevel || ''}
                            onChange={(e) => handleFieldUpdate(item.id, 'maxStockLevel', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.reorderQuantity || ''}
                            onChange={(e) => handleFieldUpdate(item.id, 'reorderQuantity', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="1"
                            value={item.leadTimeDays || ''}
                            onChange={(e) => handleFieldUpdate(item.id, 'leadTimeDays', parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                            placeholder="1"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleSaveItem(item.id)}
                            disabled={saving === item.id}
                            className="inline-flex items-center px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50 transition-colors"
                          >
                            {saving === item.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            ) : (
                              <Save className="w-3 h-3 mr-1" />
                            )}
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {items.length === 0 
                    ? "Add some inventory items first, then return here to set stock levels."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
                {items.length === 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => router.push('/inventory/new')}
                      className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Add Your First Item
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guidelines */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Stock Management Best Practices</h3>
                <div className="text-sm text-blue-700 mt-1 space-y-1">
                  <p>• <strong>Min Level:</strong> Set to average weekly usage - prevents stockouts</p>
                  <p>• <strong>Max Level:</strong> Set to 2-3 months usage - prevents waste and spoilage</p>
                  <p>• <strong>Reorder Quantity:</strong> Usually 2-4 weeks worth of usage</p>
                  <p>• <strong>Lead Time:</strong> Include supplier delivery time + buffer days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}