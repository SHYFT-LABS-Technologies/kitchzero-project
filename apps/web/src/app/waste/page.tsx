'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Download,
  AlertTriangle,
  Package,
  Trash2,
  Eye,
  Edit,
  TrendingDown,
  BarChart3,
  Leaf,
  Target,
  X,
  ChevronDown,
  Info,
  RefreshCw,
  FileText,
  DollarSign
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { wasteApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useCurrency } from '@/context/settings-context';

interface WasteLog {
  id: string;
  itemName: string;
  category?: string;
  quantity: number;
  unit: string;
  cost: number;
  wasteType: string;
  reason: string;
  tags: string[];
  preventable: boolean;
  severity: string;
  location?: string;
  createdAt: string;
  loggedByUser?: {
    username: string;
    role: string;
  };
  recipe?: {
    name: string;
    yield: number;
    yieldUnit: string;
  };
  branch?: {
    name: string;
  };
}

interface WasteAnalytics {
  totalCost: number;
  preventableCost: number;
  sustainabilityScore: number;
  wasteReduction: number;
  mostWastedCategory: string;
  averageWastePerDay: number;
}

interface WasteStats {
  totalItems: number;
  totalCost: number;
  preventableWaste: number;
  topCategories: Array<{
    category: string;
    count: number;
    cost: number;
  }>;
  topReasons: Array<{
    reason: string;
    count: number;
    cost: number;
  }>;
}

export default function WastePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
  const [analytics, setAnalytics] = useState<WasteAnalytics | null>(null);
  const [stats, setStats] = useState<WasteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('ALL');
  const [preventableFilter, setPreventableFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('7'); // days
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const { formatCurrency, getCurrencySymbol } = useCurrency();

  useEffect(() => {
    if (user?.tenantId) {
      fetchWasteLogs();
      fetchAnalytics();
    }
  }, [user?.tenantId, searchTerm, wasteTypeFilter, preventableFilter, severityFilter, dateFilter, pagination.page]);

  const fetchWasteLogs = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      };

      if (searchTerm) params.search = searchTerm;
      if (wasteTypeFilter !== 'ALL') params.wasteType = wasteTypeFilter;
      if (preventableFilter !== 'ALL') params.preventable = preventableFilter;
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (dateFilter) params.days = dateFilter;

      const response = await wasteApi.getLogs(user.tenantId, params);
      
      if (response.success) {
        // Backend returns { wasteLogs: [...], pagination: {...} }
        const data = response.data;
        setWasteLogs(Array.isArray(data.wasteLogs) ? data.wasteLogs : []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 0
        }));
      } else {
        throw new Error(response.error || 'Failed to fetch waste logs');
      }
    } catch (error) {
      console.error('Failed to fetch waste logs:', error);
      toast.error('Failed to load waste logs');
      setWasteLogs([]); // Ensure it's always an array
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!user?.tenantId) return;

    try {
      const params: Record<string, string> = {};
      if (dateFilter) params.days = dateFilter;
      
      const [analyticsResponse, statsResponse] = await Promise.all([
        wasteApi.getStats(user.tenantId, params),
        wasteApi.getTrends(user.tenantId, params)
      ]);
      
      if (analyticsResponse.success) {
        // Backend returns { summary: {...}, breakdown: {...}, insights: {...} }
        const data = analyticsResponse.data;
        setAnalytics({
          totalCost: data.summary?.totalCost || 0,
          preventableCost: data.summary?.preventableCost || 0,
          sustainabilityScore: data.summary?.sustainabilityScore || 0,
          wasteReduction: 0, // Calculate from trends if needed
          mostWastedCategory: data.breakdown?.byCategory?.[0]?.category || 'N/A',
          averageWastePerDay: data.summary?.totalCost ? (data.summary.totalCost / 30) : 0
        });
      }
      
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getWasteTypeColor = (wasteType: string) => {
    switch (wasteType.toUpperCase()) {
      case 'PRODUCT': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'RAW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-LK', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setWasteTypeFilter('ALL');
    setPreventableFilter('ALL');
    setSeverityFilter('ALL');
    setDateFilter('7');
    setShowFilters(false);
  };

  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!Array.isArray(wasteLogs)) return;
    setSelectedRows(
      selectedRows.length === wasteLogs.length 
        ? [] 
        : wasteLogs.map(log => log.id)
    );
  };

  const activeFiltersCount = [
    searchTerm,
    wasteTypeFilter !== 'ALL' ? wasteTypeFilter : null,
    preventableFilter !== 'ALL' ? preventableFilter : null,
    severityFilter !== 'ALL' ? severityFilter : null,
    dateFilter !== '7' ? dateFilter : null
  ].filter(Boolean).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Analytics Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3"></div>
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Table Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="p-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-0">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Waste Management</h1>
              <p className="text-gray-600 mt-1">
                Track and analyze food waste to improve sustainability and reduce costs
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <button
                onClick={() => router.push('/waste/new')}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log Waste
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Waste Cost</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics?.totalCost || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Last {dateFilter} days</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Preventable Waste</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics?.preventableCost || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Could have been avoided</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Leaf className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Sustainability Score</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics?.sustainabilityScore || 0}/100</p>
                  <div className="flex items-center mt-1">
                    <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+{analytics?.wasteReduction || 0}% vs last period</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Daily Average</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics?.averageWastePerDay || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Per day waste cost</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by item name, category, or reason..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      showFilters || activeFiltersCount > 0
                        ? 'border-primary-300 bg-primary-50 text-primary-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="ml-2 bg-primary-100 text-primary-800 text-xs rounded-full px-2 py-0.5">
                        {activeFiltersCount}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </button>
                  )}

                  <button
                    onClick={fetchWasteLogs}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Options */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                      <Select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      >
                        <option value="1">Last 24 hours</option>
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 3 months</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Waste Type</label>
                      <Select
                        value={wasteTypeFilter}
                        onChange={(e) => setWasteTypeFilter(e.target.value)}
                      >
                        <option value="ALL">All Types</option>
                        <option value="RAW">Raw Materials</option>
                        <option value="PRODUCT">Finished Products</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                      <Select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                      >
                        <option value="ALL">All Severities</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preventable</label>
                      <Select
                        value={preventableFilter}
                        onChange={(e) => setPreventableFilter(e.target.value)}
                      >
                        <option value="ALL">All</option>
                        <option value="true">Preventable</option>
                        <option value="false">Not Preventable</option>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div className="px-4 py-3 bg-gray-50 rounded-b-xl">
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  Showing {Array.isArray(wasteLogs) ? wasteLogs.length : 0} of {pagination.total} waste logs
                  {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount === 1 ? '' : 's'} applied)`}
                </div>
                {selectedRows.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{selectedRows.length} selected</span>
                    <button className="text-primary-600 hover:text-primary-700 font-medium">
                      Bulk Actions
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Waste Logs Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={Array.isArray(wasteLogs) && selectedRows.length === wasteLogs.length && wasteLogs.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity & Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type & Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(wasteLogs) && wasteLogs.map((wasteLog) => (
                    <tr key={wasteLog.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(wasteLog.id)}
                          onChange={() => handleRowSelect(wasteLog.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{wasteLog.itemName}</div>
                          {wasteLog.category && (
                            <div className="text-sm text-gray-500">{wasteLog.category}</div>
                          )}
                          {wasteLog.location && (
                            <div className="text-xs text-gray-400 mt-1">📍 {wasteLog.location}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {wasteLog.quantity} {wasteLog.unit}
                          </div>
                          <div className="text-sm font-medium text-red-600">
                            {formatCurrency(wasteLog.cost)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getWasteTypeColor(wasteLog.wasteType)}`}>
                            {wasteLog.wasteType}
                          </span>
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(wasteLog.severity)}`}>
                              {wasteLog.severity}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">{wasteLog.reason}</div>
                          <div className="flex items-center mt-1">
                            {wasteLog.preventable ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Preventable
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Unavoidable
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">{formatDate(wasteLog.createdAt)}</div>
                          {wasteLog.loggedByUser && (
                            <div className="text-sm text-gray-500">by {wasteLog.loggedByUser.username}</div>
                          )}
                          {wasteLog.branch && (
                            <div className="text-xs text-gray-400">{wasteLog.branch.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/waste/${wasteLog.id}`)}
                            className="text-primary-600 hover:text-primary-900 p-1 rounded"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/waste/${wasteLog.id}/edit`)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded"
                            title="Edit waste log"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {(!Array.isArray(wasteLogs) || wasteLogs.length === 0) && (
              <div className="text-center py-12">
                <Trash2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No waste logs found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeFiltersCount > 0
                    ? 'Try adjusting your filters or search criteria.'
                    : 'Get started by logging your first waste entry.'
                  }
                </p>
                <div className="mt-6">
                  {activeFiltersCount > 0 ? (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push('/waste/new')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Log First Waste Entry
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                      className="px-3 py-1 border border-gray-300 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
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