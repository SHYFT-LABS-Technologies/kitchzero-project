'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { productionApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useCurrency } from '@/context/settings-context';

interface Production {
  id: string;
  batchNumber?: string;
  quantityProduced: number;
  plannedQuantity?: number;
  unitCost?: number;
  totalCost?: number;
  productionDate: string;
  status: string;
  notes?: string;
  qualityRating?: number;
  recipe: {
    name: string;
    yield: number;
    yieldUnit: string;
    category?: string;
  };
  ingredientUsage: Array<{
    ingredientName: string;
    quantityUsed: number;
    unit: string;
    costUsed?: number;
  }>;
  _count: {
    wasteFromProduction: number;
  };
}

interface ProductionAnalytics {
  summary: {
    totalProductions: number;
    totalQuantityProduced: number;
    totalCost: number;
    averageQualityRating: number;
    averageCostPerUnit: number;
  };
  topRecipes: Array<{
    recipeId: string;
    recipeName: string;
    productionCount: number;
    totalQuantity: number;
    totalCost: number;
  }>;
}

export default function ProductionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [productions, setProductions] = useState<Production[]>([]);
  const [analytics, setAnalytics] = useState<ProductionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('7'); // days
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (user?.tenantId) {
      fetchProductions();
      fetchAnalytics();
    }
  }, [user?.tenantId, searchTerm, statusFilter, dateFilter, pagination.page]);

  const fetchProductions = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      };

      if (statusFilter !== 'ALL') params.status = statusFilter;
      
      if (dateFilter !== 'ALL') {
        const days = parseInt(dateFilter);
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        params.dateFrom = dateFrom.toISOString();
      }

      const data = await productionApi.getProductions(user.tenantId, params);

      if (data.success) {
        setProductions(data.data.productions);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch productions:', error);
      toast.error('Failed to load productions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!user?.tenantId) return;

    try {
      const params: Record<string, string> = {};
      
      if (dateFilter !== 'ALL') {
        const days = parseInt(dateFilter);
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        params.dateFrom = dateFrom.toISOString();
      }

      const data = await productionApi.getAnalytics(user.tenantId, params);

      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-700 bg-green-100';
      case 'IN_PROGRESS': return 'text-blue-700 bg-blue-100';
      case 'PLANNED': return 'text-yellow-700 bg-yellow-100';
      case 'CANCELLED': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4" />;
      case 'PLANNED': return <Calendar className="w-4 h-4" />;
      case 'CANCELLED': return <AlertTriangle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  // formatCurrency now comes from useCurrency hook

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEfficiencyPercentage = (produced: number, planned?: number) => {
    if (!planned || planned === 0) return 100;
    return Math.round((produced / planned) * 100);
  };

  if (loading && productions.length === 0) {
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Production Management</h1>
              <p className="text-gray-600 mt-1">
                Track daily production, monitor costs, and analyze efficiency
              </p>
            </div>
            <button
              onClick={() => router.push('/production/new')}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Production
            </button>
          </div>

          {/* Analytics Cards */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Batches</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.summary.totalProductions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Items Produced</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics.summary.totalQuantityProduced}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Cost</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.summary.totalCost)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Cost/Unit</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.summary.averageCostPerUnit)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Quality</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analytics.summary.averageQualityRating ? `${analytics.summary.averageQualityRating.toFixed(1)}/10` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search productions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PLANNED">Planned</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
              
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="ALL">All Time</option>
                <option value="1">Today</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </Select>
            </div>
          </div>

          {/* Productions List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Production Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productions.map((production) => (
                    <tr key={production.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {production.batchNumber || `Batch ${production.id.slice(-6)}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(production.productionDate)}
                          </div>
                          {production.qualityRating && (
                            <div className="text-xs text-gray-500">
                              Quality: {production.qualityRating}/10
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {production.recipe.name}
                          </div>
                          {production.recipe.category && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              {production.recipe.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {production.quantityProduced} {production.recipe.yieldUnit}
                          </div>
                          {production.plannedQuantity && (
                            <div className="text-xs text-gray-500">
                              Planned: {production.plannedQuantity} {production.recipe.yieldUnit}
                              <span className={`ml-1 ${getEfficiencyPercentage(production.quantityProduced, production.plannedQuantity) >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                ({getEfficiencyPercentage(production.quantityProduced, production.plannedQuantity)}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(production.totalCost)}
                          </div>
                          {production.unitCost && (
                            <div className="text-xs text-gray-500">
                              {formatCurrency(production.unitCost)}/unit
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(production.status)}`}>
                          {getStatusIcon(production.status)}
                          <span className="ml-1">{production.status}</span>
                        </span>
                        {production._count.wasteFromProduction > 0 && (
                          <div className="text-xs text-orange-600 mt-1">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            {production._count.wasteFromProduction} waste log(s)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => router.push(`/production/${production.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {productions.length === 0 && !loading && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No productions found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start by creating your first production batch.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/production/new')}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Start Production
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Top Recipes */}
          {analytics && analytics.topRecipes.length > 0 && (
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Top Recipes by Production Volume</h2>
              <div className="space-y-3">
                {analytics.topRecipes.slice(0, 5).map((recipe, index) => (
                  <div key={recipe.recipeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{recipe.recipeName}</p>
                        <p className="text-xs text-gray-500">{recipe.productionCount} batches produced</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{recipe.totalQuantity} units</p>
                      <p className="text-xs text-gray-500">{formatCurrency(recipe.totalCost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total productions)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}