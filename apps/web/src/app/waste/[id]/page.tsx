'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit3,
  Trash2,
  Package,
  AlertTriangle,
  Calendar,
  User,
  Building2,
  DollarSign,
  Scale,
  Tag,
  Info,
  Save,
  X
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import toast from 'react-hot-toast';

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
  production?: {
    batchNumber?: string;
    quantityProduced: number;
    productionDate: string;
  };
  branch?: {
    name: string;
  };
}

export default function WasteLogDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [wasteLog, setWasteLog] = useState<WasteLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editData, setEditData] = useState({
    quantity: 0,
    reason: '',
    severity: '',
    preventable: true,
    tags: [] as string[]
  });

  const wasteReasons = [
    'Expired/spoiled',
    'Overcooked/burnt',
    'Contaminated',
    'Over-ordered',
    'Damaged in storage',
    'Customer return',
    'Production error',
    'Equipment failure',
    'Power outage',
    'Staff error',
    'Quality control rejection',
    'Leftover/unsold'
  ];

  useEffect(() => {
    if (user?.tenantId && params.id) {
      fetchWasteLog();
    }
  }, [user?.tenantId, params.id]);

  const fetchWasteLog = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/waste-logs/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWasteLog(data.data);
          setEditData({
            quantity: data.data.quantity,
            reason: data.data.reason,
            severity: data.data.severity,
            preventable: data.data.preventable,
            tags: data.data.tags || []
          });
        } else {
          toast.error(data.error || 'Failed to load waste log');
          router.push('/waste');
        }
      } else {
        toast.error('Failed to load waste log');
        router.push('/waste');
      }
    } catch (error) {
      console.error('Failed to fetch waste log:', error);
      toast.error('Failed to load waste log');
      router.push('/waste');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!user?.tenantId || !wasteLog) return;

    try {
      setSaving(true);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/waste-logs/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Waste log updated successfully');
          setEditing(false);
          fetchWasteLog(); // Refresh data
        } else {
          toast.error(data.error || 'Failed to update waste log');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update waste log');
      }
    } catch (error) {
      console.error('Failed to update waste log:', error);
      toast.error('Failed to update waste log');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.tenantId || !wasteLog) return;

    if (!confirm('Are you sure you want to delete this waste log? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/waste-logs/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Waste log deleted successfully');
          router.push('/waste');
        } else {
          toast.error(data.error || 'Failed to delete waste log');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete waste log');
      }
    } catch (error) {
      console.error('Failed to delete waste log:', error);
      toast.error('Failed to delete waste log');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'text-red-700 bg-red-100';
      case 'MEDIUM': return 'text-yellow-700 bg-yellow-100';
      case 'LOW': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getWasteTypeColor = (wasteType: string) => {
    switch (wasteType) {
      case 'PRODUCT': return 'text-purple-700 bg-purple-100';
      case 'RAW': return 'text-blue-700 bg-blue-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const canEdit = user?.role === 'RESTAURANT_ADMIN' || user?.role === 'KITCHZERO_ADMIN' || 
                  (user?.role === 'BRANCH_ADMIN' && wasteLog?.loggedByUser?.username === user?.username);

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

  if (!wasteLog) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Waste Log Not Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                The waste log you're looking for doesn't exist or you don't have access to it.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/waste')}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Waste Logs
                </button>
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
        <div className="max-w-4xl mx-auto">
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
                <h1 className="text-3xl font-bold text-gray-900">Waste Log Details</h1>
                <p className="text-gray-600 mt-1">
                  {wasteLog.itemName} • {formatDate(wasteLog.createdAt)}
                </p>
              </div>
            </div>

            {canEdit && !editing && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            )}

            {editing && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleEdit}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditData({
                      quantity: wasteLog.quantity,
                      reason: wasteLog.reason,
                      severity: wasteLog.severity,
                      preventable: wasteLog.preventable,
                      tags: wasteLog.tags || []
                    });
                  }}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Waste Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{wasteLog.itemName}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <span className="text-gray-900">{wasteLog.category || 'N/A'}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    {editing ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.quantity}
                        onChange={(e) => setEditData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                      />
                    ) : (
                      <div className="flex items-center">
                        <Scale className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{wasteLog.quantity} {wasteLog.unit}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{formatCurrency(wasteLog.cost)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Waste Type</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWasteTypeColor(wasteLog.wasteType)}`}>
                      {wasteLog.wasteType}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                    {editing ? (
                      <Select
                        value={editData.severity}
                        onChange={(e) => setEditData(prev => ({ ...prev, severity: e.target.value }))}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </Select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(wasteLog.severity)}`}>
                        {wasteLog.severity}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  {editing ? (
                    <Select
                      value={editData.reason}
                      onChange={(e) => setEditData(prev => ({ ...prev, reason: e.target.value }))}
                    >
                      {wasteReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </Select>
                  ) : (
                    <p className="text-gray-900">{wasteLog.reason}</p>
                  )}
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preventable</label>
                  {editing ? (
                    <Select
                      value={editData.preventable.toString()}
                      onChange={(e) => setEditData(prev => ({ ...prev, preventable: e.target.value === 'true' }))}
                    >
                      <option value="true">Yes - Could have been prevented</option>
                      <option value="false">No - Not preventable</option>
                    </Select>
                  ) : (
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${wasteLog.preventable ? 'bg-orange-400' : 'bg-green-400'}`} />
                      <span className="text-gray-900">
                        {wasteLog.preventable ? 'Preventable' : 'Not Preventable'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {wasteLog.tags && wasteLog.tags.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {wasteLog.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recipe/Production Info */}
              {(wasteLog.recipe || wasteLog.production) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    {wasteLog.recipe ? 'Recipe Information' : 'Production Information'}
                  </h2>
                  
                  {wasteLog.recipe && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Recipe</label>
                        <span className="text-gray-900">{wasteLog.recipe.name}</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Yield</label>
                        <span className="text-gray-900">{wasteLog.recipe.yield} {wasteLog.recipe.yieldUnit}</span>
                      </div>
                    </div>
                  )}

                  {wasteLog.production && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                        <span className="text-gray-900">{wasteLog.production.batchNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Production Date</label>
                        <span className="text-gray-900">{formatDate(wasteLog.production.productionDate)}</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Produced</label>
                        <span className="text-gray-900">{wasteLog.production.quantityProduced}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Meta Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Log Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logged Date</label>
                    <div className="flex items-center text-gray-900">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(wasteLog.createdAt)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logged By</label>
                    <div className="flex items-center text-gray-900">
                      <User className="w-4 h-4 mr-2" />
                      {wasteLog.loggedByUser?.username || 'Unknown User'}
                    </div>
                    {wasteLog.loggedByUser?.role && (
                      <span className="text-xs text-gray-500 ml-6">
                        {wasteLog.loggedByUser.role.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {wasteLog.branch && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                      <div className="flex items-center text-gray-900">
                        <Building2 className="w-4 h-4 mr-2" />
                        {wasteLog.branch.name}
                      </div>
                    </div>
                  )}

                  {wasteLog.location && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <span className="text-gray-900">{wasteLog.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Impact Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Impact Information</p>
                    <p>
                      {wasteLog.wasteType === 'RAW' 
                        ? 'This waste was automatically deducted from inventory using FIFO logic.'
                        : 'This finished product waste automatically deducted the recipe ingredients from inventory.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {!canEdit && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-gray-600 mt-0.5 mr-3" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">Read Only</p>
                      <p>
                        You can only edit waste logs that you created yourself or if you're a restaurant admin.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}