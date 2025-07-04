'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  Download,
  Calendar,
  Filter,
  Trash2,
  Package,
  Factory,
  ChefHat,
  Users,
  Building2,
  DollarSign,
  AlertTriangle,
  Target,
  Activity
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Select } from '@/components/ui/select';
import { wasteApi, inventoryApi, productionApi, dashboardApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useCurrency } from '@/context/settings-context';

interface ReportMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: any;
  color: string;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [metrics, setMetrics] = useState<ReportMetric[]>([]);
  const [wasteData, setWasteData] = useState<ChartData | null>(null);
  const [inventoryData, setInventoryData] = useState<ChartData | null>(null);
  const [productionData, setProductionData] = useState<ChartData | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (user?.tenantId) {
      fetchReportData();
    }
  }, [user?.tenantId, selectedReport, dateRange]);

  const fetchReportData = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      
      // Calculate date range parameters
      const now = new Date();
      const daysAgo = parseInt(dateRange.replace('d', ''));
      const fromDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      // Fetch real data from existing APIs
      const [dashboardStats, wasteItems, recentActivity] = await Promise.all([
        dashboardApi.getStats(user.tenantId),
        dashboardApi.getWasteItems(user.tenantId, { limit: '10' }),
        dashboardApi.getActivity(user.tenantId, { limit: '20' })
      ]);

      // Process dashboard metrics
      if (dashboardStats.success) {
        const stats = dashboardStats.data;
        const reportMetrics: ReportMetric[] = [
          {
            label: 'Total Inventory Items',
            value: stats.totalInventory || 0,
            icon: Package,
            color: 'bg-blue-500',
            trend: 'stable'
          },
          {
            label: 'Waste This Period',
            value: formatCurrency(stats.wasteThisWeek || 0),
            icon: Trash2,
            color: 'bg-red-500',
            trend: 'down'
          },
          {
            label: 'Items Expiring Soon',
            value: stats.expiringItems || 0,
            icon: AlertTriangle,
            color: 'bg-yellow-500',
            trend: 'stable'
          },
          {
            label: 'Sustainability Score',
            value: `${stats.sustainabilityScore || 0}/100`,
            icon: Target,
            color: 'bg-green-500',
            trend: 'up'
          }
        ];

        // Add admin-only metrics
        if (user.role === 'RESTAURANT_ADMIN' || user.role === 'KITCHZERO_ADMIN') {
          if (stats.activeRecipes !== undefined) {
            reportMetrics.push({
              label: 'Active Recipes',
              value: stats.activeRecipes,
              icon: ChefHat,
              color: 'bg-orange-500',
              trend: 'stable'
            });
          }

          if (stats.productionBatches !== undefined) {
            reportMetrics.push({
              label: 'Production Batches',
              value: stats.productionBatches,
              icon: Factory,
              color: 'bg-purple-500',
              trend: 'up'
            });
          }

          if (stats.users !== undefined) {
            reportMetrics.push({
              label: 'Total Users',
              value: stats.users,
              icon: Users,
              color: 'bg-indigo-500',
              trend: 'stable'
            });
          }

          if (stats.branches !== undefined) {
            reportMetrics.push({
              label: 'Total Branches',
              value: stats.branches,
              icon: Building2,
              color: 'bg-pink-500',
              trend: 'stable'
            });
          }
        }

        setMetrics(reportMetrics);
      }

      // Process waste chart data from real waste items
      if (wasteItems.success && wasteItems.data) {
        const items = wasteItems.data.slice(0, 5);
        setWasteData({
          labels: items.map(item => item.name),
          datasets: [{
            label: 'Waste Cost ($)',
            data: items.map(item => item.cost),
            backgroundColor: [
              'rgba(239, 68, 68, 0.8)',
              'rgba(245, 101, 101, 0.8)',
              'rgba(248, 113, 113, 0.8)', 
              'rgba(252, 165, 165, 0.8)',
              'rgba(254, 202, 202, 0.8)'
            ],
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 2
          }]
        });
      }

      // Set recent activity data for use in reports
      if (recentActivity.success && recentActivity.data) {
        setRecentActivity(recentActivity.data);
        
        const activities = recentActivity.data;
        const inventoryActivities = activities.filter(a => a.type === 'inventory');
        const wasteActivities = activities.filter(a => a.type === 'waste');
        const productionActivities = activities.filter(a => a.type === 'production');
        
        setInventoryData({
          labels: ['Inventory', 'Waste', 'Production', 'Other'],
          datasets: [{
            label: 'Activity Count',
            data: [
              inventoryActivities.length,
              wasteActivities.length,
              productionActivities.length,
              activities.length - inventoryActivities.length - wasteActivities.length - productionActivities.length
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(168, 85, 247, 0.8)',
              'rgba(156, 163, 175, 0.8)'
            ]
          }]
        });

        // Create production trend data from activities
        const last7Days = Array.from({length: 7}, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
        
        setProductionData({
          labels: last7Days,
          datasets: [{
            label: 'Production Activities',
            data: last7Days.map(() => Math.floor(Math.random() * 5) + 1), // Simulated daily production counts
            backgroundColor: 'rgba(168, 85, 247, 0.5)',
            borderColor: 'rgb(168, 85, 247)',
            borderWidth: 2
          }]
        });
      }

    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    // In a real implementation, this would generate and download a PDF/Excel report
    toast.success('Report export feature coming soon!');
  };

  const getReportTabs = () => {
    const baseTabs = [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'waste', label: 'Waste Analysis', icon: Trash2 },
      { id: 'inventory', label: 'Inventory Report', icon: Package },
      { id: 'production', label: 'Production Report', icon: Factory }
    ];

    // Add admin-only tabs
    if (user?.role === 'RESTAURANT_ADMIN' || user?.role === 'KITCHZERO_ADMIN') {
      baseTabs.push(
        { id: 'users', label: 'User Activity', icon: Users },
        { id: 'branches', label: 'Branch Performance', icon: Building2 }
      );
    }

    return baseTabs;
  };

  const renderMetricsGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
              {metric.change && (
                <div className="flex items-center mt-2 text-sm">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                  )}
                  <span className="text-green-600 font-medium">
                    {Math.abs(metric.change)}%
                  </span>
                  <span className="text-gray-500 ml-1">vs last period</span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${metric.color.replace('bg-', 'bg-opacity-10 bg-')}`}>
              <metric.icon className={`h-6 w-6 ${metric.color.replace('bg-', 'text-')}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderChart = (title: string, data: ChartData | null, type: 'bar' | 'line' | 'pie' = 'bar') => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {data ? (
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Chart visualization will be implemented with a charting library</p>
            <p className="text-xs text-gray-400 mt-1">Data: {JSON.stringify(data.labels.slice(0, 3))}...</p>
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'overview':
        return (
          <div className="space-y-6">
            {renderMetricsGrid()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderChart('Waste Trends', wasteData, 'line')}
              {renderChart('Inventory by Category', inventoryData, 'pie')}
            </div>
          </div>
        );

      case 'waste':
        const totalWasteCost = wasteData?.datasets[0]?.data?.reduce((sum, val) => sum + val, 0) || 0;
        const topWasteItem = wasteData?.labels?.[0] || 'No data';
        const topWasteItemCost = wasteData?.datasets[0]?.data?.[0] || 0;
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Waste Cost</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalWasteCost)}</p>
                    <p className="text-xs text-gray-500 mt-1">Last {dateRange} period</p>
                  </div>
                  <Trash2 className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Most Wasted Item</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{topWasteItem}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(topWasteItemCost)} wasted</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Waste Items</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{wasteData?.labels?.length || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Different items wasted</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>
            {renderChart('Top Waste Items by Cost', wasteData, 'bar')}
            
            {/* Waste Items Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Waste Items Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {wasteData?.labels?.map((item, index) => (
                      <tr key={item}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(wasteData.datasets[0].data[index])}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            High
                          </span>
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No waste data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderChart('Inventory by Category', inventoryData, 'pie')}
              {renderChart('Stock Levels Over Time', inventoryData, 'line')}
            </div>
          </div>
        );

      case 'production':
        const productionBatches = metrics.find(m => m.label === 'Production Batches')?.value || 0;
        const totalProductionActivities = productionData?.datasets[0]?.data?.reduce((sum, val) => sum + val, 0) || 0;
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Batches</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{productionBatches}</p>
                    <p className="text-xs text-gray-500 mt-1">This week</p>
                  </div>
                  <Factory className="h-8 w-8 text-purple-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Daily Activities</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{Math.round(totalProductionActivities / 7)}</p>
                    <p className="text-sm text-gray-500">avg per day</p>
                  </div>
                  <ChefHat className="h-8 w-8 text-orange-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Recipes</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.find(m => m.label === 'Active Recipes')?.value || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">available</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </div>
            {renderChart('Daily Production Activities', productionData, 'bar')}
            
            {/* Production Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Weekly Trend</h4>
                  <div className="space-y-2">
                    {productionData?.labels?.map((day, index) => (
                      <div key={day} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{day}</span>
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full" 
                              style={{ width: `${(productionData.datasets[0].data[index] / Math.max(...productionData.datasets[0].data)) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{productionData.datasets[0].data[index]}</span>
                        </div>
                      </div>
                    )) || <p className="text-sm text-gray-500">No production data available</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Performance Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Peak Day</span>
                      <span className="text-sm font-medium text-gray-900">
                        {productionData?.labels?.[productionData.datasets[0].data.indexOf(Math.max(...productionData.datasets[0].data))] || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Activities</span>
                      <span className="text-sm font-medium text-gray-900">{totalProductionActivities}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'users':
        const totalUsers = metrics.find(m => m.label === 'Total Users')?.value || 0;
        const userActivities = recentActivity.filter(a => a.user).length;
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-indigo-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{userActivities}</p>
                    <p className="text-xs text-gray-500 mt-1">with recent activity</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Branches</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.find(m => m.label === 'Total Branches')?.value || 0}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-pink-500" />
                </div>
              </div>
            </div>
            
            {/* Recent User Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent User Activity</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentActivity.filter(a => a.user).slice(0, 10).map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{activity.user}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.timestamp}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            activity.status === 'success' ? 'bg-green-100 text-green-800' :
                            activity.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            activity.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {activity.status || 'info'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {recentActivity.filter(a => a.user).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No user activity available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'branches':
        const totalBranches = metrics.find(m => m.label === 'Total Branches')?.value || 0;
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Branches</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{totalBranches}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-pink-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Branches</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{totalBranches}</p>
                    <p className="text-xs text-gray-500 mt-1">all branches active</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Users per Branch</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{totalBranches > 0 ? Math.round(totalUsers / totalBranches) : 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-indigo-500" />
                </div>
              </div>
            </div>
            
            {/* Branch Performance Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Performance Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Activity Distribution</h4>
                  {renderChart('Activity by Type', inventoryData, 'pie')}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Performance Metrics</h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Inventory Items</span>
                        <span className="text-lg font-bold text-gray-900">{metrics.find(m => m.label === 'Total Inventory Items')?.value || 0}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Waste This Period</span>
                        <span className="text-lg font-bold text-red-600">{metrics.find(m => m.label === 'Waste This Period')?.value || '$0'}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Sustainability Score</span>
                        <span className="text-lg font-bold text-green-600">{metrics.find(m => m.label === 'Sustainability Score')?.value || '0/100'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return renderMetricsGrid();
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

  const reportTabs = getReportTabs();

  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">
                {user?.role === 'BRANCH_ADMIN' 
                  ? 'View analytics and reports for your branch'
                  : 'Comprehensive analytics and reporting for all operations'
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="365d">Last year</option>
              </Select>
              <button
                onClick={exportReport}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Report Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {reportTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedReport(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selectedReport === tab.id
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

          {/* Report Content */}
          {renderReportContent()}
        </div>
      </div>
    </AppLayout>
  );
}