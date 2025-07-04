'use client';

import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Leaf, 
  Users, 
  Package, 
  Trash2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  DollarSign,
  Calendar,
  Clock,
  ChefHat,
  Factory,
  Building2,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  PieChart,
  Plus
} from 'lucide-react';
import { apiClient, dashboardApi } from '@/lib/api';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/app-layout';
import Link from 'next/link';
import { useCurrency } from '@/context/settings-context';

interface DashboardStats {
  totalInventory: number;
  wasteThisWeek: number;
  expiringItems: number;
  sustainabilityScore: number;
  totalValue?: number;
  wasteReduction?: number;
  activeRecipes?: number;
  productionBatches?: number;
  branches?: number;
  users?: number;
}

interface RecentActivity {
  id: string;
  type: 'waste' | 'inventory' | 'production' | 'recipe';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  status?: 'success' | 'warning' | 'error';
}

interface TopWasteItem {
  name: string;
  quantity: number;
  cost: number;
  trend: 'up' | 'down' | 'stable';
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topWasteItems, setTopWasteItems] = useState<TopWasteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d
  const { formatCurrency, getCurrencySymbol } = useCurrency();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else {
      fetchDashboardData();
    }
  }, [isAuthenticated, router, timeRange]);

  const fetchDashboardData = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      
      // Fetch real data from backend
      const [statsResponse, activityResponse, wasteResponse] = await Promise.all([
        dashboardApi.getStats(user.tenantId),
        dashboardApi.getActivity(user.tenantId, { limit: '10' }),
        dashboardApi.getWasteItems(user.tenantId, { limit: '5' })
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
      
      if (activityResponse.success) {
        setRecentActivity(activityResponse.data);
      }
      
      if (wasteResponse.success) {
        setTopWasteItems(wasteResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };


  const getQuickActions = () => {
    const baseActions = [
      { icon: Package, label: 'Add Inventory', href: '/inventory/new' },
      { icon: Trash2, label: 'Log Waste', href: '/waste/new' },
      { icon: ChefHat, label: 'Create Recipe', href: '/recipes/new' },
      { icon: Factory, label: 'Start Production', href: '/production/new' }
    ];

    if (user?.role === 'RESTAURANT_ADMIN' || user?.role === 'KITCHZERO_ADMIN') {
      baseActions.push(
        { icon: Users, label: 'Manage Users', href: '/users' },
        { icon: Building2, label: 'Manage Branches', href: '/branches' }
      );
    }

    return baseActions;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'waste': return Trash2;
      case 'inventory': return Package;
      case 'production': return Factory;
      case 'recipe': return ChefHat;
      default: return Activity;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const quickActions = getQuickActions();

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.username}</h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening at {user.tenant?.name || 'your restaurant'} today.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Inventory</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? '...' : stats?.totalInventory || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">items tracked</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+2.5%</span>
              <span className="text-gray-500 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Waste This Week</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? '...' : formatCurrency(stats?.wasteThisWeek || 0, { showDecimals: false })}
                </p>
                <p className="text-xs text-gray-500 mt-1">total cost</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">-8.1%</span>
              <span className="text-gray-500 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? '...' : stats?.expiringItems || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">items need attention</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/inventory?filter=expiring" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center">
                View details <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sustainability Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? '...' : stats?.sustainabilityScore || 0}
                </p>
                <p className="text-xs text-green-600 mt-1">out of 100</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${stats?.sustainabilityScore || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Waste Items */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Top Waste Items</h3>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {topWasteItems.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-primary-500 mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.quantity}kg wasted</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 mr-2">{formatCurrency(item.cost)}</span>
                    {item.trend === 'up' && <TrendingUp className="h-3 w-3 text-red-500" />}
                    {item.trend === 'down' && <TrendingDown className="h-3 w-3 text-green-500" />}
                    {item.trend === 'stable' && <div className="h-3 w-3 bg-gray-400 rounded-full"></div>}
                  </div>
                </div>
              ))}
            </div>
            <Link href="/reports/waste" className="mt-4 inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium">
              View detailed report <ArrowUpRight className="h-3 w-3 ml-1" />
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const IconComponent = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg ${getStatusColor(activity.status)}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {activity.timestamp}
                        {activity.user && (
                          <>
                            <span className="mx-1">•</span>
                            <span>{activity.user}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/activity" className="mt-4 inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all activity <ArrowUpRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 group"
                >
                  <div className="p-3 bg-gray-100 group-hover:bg-primary-100 rounded-xl transition-colors">
                    <IconComponent className="h-6 w-6 text-gray-600 group-hover:text-primary-600 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700 mt-2 text-center transition-colors">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Additional Stats for Admins */}
        {(user?.role === 'RESTAURANT_ADMIN' || user?.role === 'KITCHZERO_ADMIN') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Recipes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? '...' : stats?.activeRecipes || 24}
                  </p>
                </div>
                <ChefHat className="h-8 w-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Production Batches</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? '...' : stats?.productionBatches || 18}
                  </p>
                </div>
                <Factory className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? '...' : stats?.users || 12}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Getting Started for New Users */}
        {stats && stats.totalInventory === 0 && (
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-6">
            <div className="flex items-start">
              <Leaf className="h-6 w-6 text-primary-600 mt-1 mr-4" />
              <div className="flex-1">
                <h4 className="font-semibold text-primary-900 mb-2">Welcome to KitchZero!</h4>
                <p className="text-primary-800 mb-4">
                  Your sustainability dashboard is ready. Get started by adding inventory items, 
                  logging waste, or creating your first recipe.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/inventory/new" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Inventory
                  </Link>
                  <Link href="/recipes/new" className="inline-flex items-center px-4 py-2 bg-white text-primary-600 text-sm font-medium rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors">
                    <ChefHat className="h-4 w-4 mr-2" />
                    Create Recipe
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}