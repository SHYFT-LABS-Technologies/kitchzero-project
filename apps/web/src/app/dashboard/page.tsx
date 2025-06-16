'use client';

import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Leaf, Users, Package, Trash2, AlertCircle, TrendingUp, LogOut } from 'lucide-react';
import { apiClient, dashboardApi } from '@/lib/api';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/app-layout';

interface DashboardStats {
  totalInventory: number;
  wasteThisWeek: number;
  expiringItems: number;
  sustainabilityScore: number;
}

export default function DashboardPage() {
  const { user, isAuthenticated, clearUser } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else {
      fetchDashboardStats();
    }
  }, [isAuthenticated, router]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      clearUser();
      toast.success('Logged out successfully');
      router.push('/auth/login');
    } catch (error) {
      // Even if logout fails on server, clear local state
      clearUser();
      router.push('/auth/login');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">
            Monitor your food waste, track inventory, and optimize sustainability across your operations.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Package className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Inventory</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : stats?.totalInventory || 0}
                  </p>
                  <p className="text-xs text-gray-500">items tracked</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Waste This Week</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : `$${(stats?.wasteThisWeek || 0).toFixed(2)}`}
                  </p>
                  <p className="text-xs text-gray-500">total cost</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : stats?.expiringItems || 0}
                  </p>
                  <p className="text-xs text-gray-500">items need attention</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Sustainability Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : stats?.sustainabilityScore || 0}
                  </p>
                  <p className="text-xs text-green-600">out of 100</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
              <p className="card-description">Common tasks and operations</p>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => router.push('/inventory/new')}
                  className="btn-outline w-full"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Add Inventory
                </button>
                <button 
                  onClick={() => router.push('/waste/new')}
                  className="btn-outline w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Log Waste
                </button>
                <button 
                  onClick={() => router.push('/users')}
                  className="btn-outline w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </button>
                <button 
                  onClick={() => router.push('/reports')}
                  className="btn-outline w-full"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Reports
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
              <p className="card-description">Latest updates and alerts</p>
            </div>
            <div className="card-content">
              {loading ? (
                <div className="space-y-4">
                  <div className="animate-pulse flex space-x-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="animate-pulse flex space-x-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs text-gray-400">Activity will appear here as you use the system</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Getting Started Notice */}
        {stats && stats.totalInventory === 0 && (
          <div className="card bg-info border-primary-200">
            <div className="card-content">
              <div className="flex items-center">
                <Leaf className="h-5 w-5 text-primary-600 mr-3" />
                <div>
                  <h4 className="font-medium text-primary-800">Welcome to KitchZero!</h4>
                  <p className="text-sm text-primary-700">
                    Your dashboard is ready. Start by adding inventory items or logging waste to see your sustainability metrics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}