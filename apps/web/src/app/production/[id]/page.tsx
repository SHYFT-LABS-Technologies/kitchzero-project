'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit3,
  Trash2,
  Factory,
  Calendar,
  User,
  Building2,
  Scale,
  Package,
  CheckCircle,
  AlertTriangle,
  Save,
  X,
  ChefHat
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import toast from 'react-hot-toast';

interface Production {
  id: string;
  batchNumber?: string;
  quantityProduced: number;
  unit: string;
  productionDate: string;
  status: string;
  notes?: string;
  createdAt: string;
  createdByUser?: {
    username: string;
    role: string;
  };
  recipe?: {
    id: string;
    name: string;
    yield: number;
    yieldUnit: string;
  };
  branch?: {
    id: string;
    name: string;
    address: string;
  };
}

export default function ProductionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [production, setProduction] = useState<Production | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editData, setEditData] = useState({
    batchNumber: '',
    quantityProduced: 0,
    unit: '',
    productionDate: '',
    status: '',
    notes: ''
  });

  const statusOptions = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  useEffect(() => {
    if (user?.tenantId && params.id) {
      fetchProduction();
    }
  }, [user?.tenantId, params.id]);

  const fetchProduction = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/tenants/${user.tenantId}/productions/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProduction(data.data);
          setEditData({
            batchNumber: data.data.batchNumber || '',
            quantityProduced: data.data.quantityProduced,
            unit: data.data.unit,
            productionDate: data.data.productionDate.split('T')[0],
            status: data.data.status,
            notes: data.data.notes || ''
          });
        } else {
          toast.error(data.error || 'Failed to load production record');
          router.push('/production');
        }
      } else {
        toast.error('Failed to load production record');
        router.push('/production');
      }
    } catch (error) {
      console.error('Failed to fetch production:', error);
      toast.error('Failed to load production record');
      router.push('/production');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!user?.tenantId || !production) return;

    try {
      setSaving(true);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/tenants/${user.tenantId}/productions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...editData,
          productionDate: new Date(editData.productionDate).toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Production record updated successfully');
          setEditing(false);
          fetchProduction();
        } else {
          toast.error(data.error || 'Failed to update production record');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update production record');
      }
    } catch (error) {
      console.error('Failed to update production:', error);
      toast.error('Failed to update production record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.tenantId || !production) return;

    if (!confirm('Are you sure you want to delete this production record? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/tenants/${user.tenantId}/productions/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Production record deleted successfully');
          router.push('/production');
        } else {
          toast.error(data.error || 'Failed to delete production record');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete production record');
      }
    } catch (error) {
      console.error('Failed to delete production:', error);
      toast.error('Failed to delete production record');
    } finally {
      setDeleting(false);
    }
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

  const formatProductionDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'text-blue-700 bg-blue-100';
      case 'IN_PROGRESS': return 'text-yellow-700 bg-yellow-100';
      case 'COMPLETED': return 'text-green-700 bg-green-100';
      case 'CANCELLED': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED': return <AlertTriangle className="w-4 h-4" />;
      default: return <Factory className="w-4 h-4" />;
    }
  };

  const canEdit = user?.role === 'RESTAURANT_ADMIN' || user?.role === 'KITCHZERO_ADMIN' || 
                  (user?.role === 'BRANCH_ADMIN' && production?.createdByUser?.username === user?.username);

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

  if (!production) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Production Record Not Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                The production record you're looking for doesn't exist or you don't have access to it.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/production')}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Production
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
                <h1 className="text-3xl font-bold text-gray-900">Production Details</h1>
                <p className="text-gray-600 mt-1">
                  {production.batchNumber ? `Batch ${production.batchNumber}` : 'Production Record'} • {formatProductionDate(production.productionDate)}
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
                      batchNumber: production.batchNumber || '',
                      quantityProduced: production.quantityProduced,
                      unit: production.unit,
                      productionDate: production.productionDate.split('T')[0],
                      status: production.status,
                      notes: production.notes || ''
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
                <h2 className="text-lg font-medium text-gray-900 mb-4">Production Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                    {editing ? (
                      <Input
                        value={editData.batchNumber}
                        onChange={(e) => setEditData(prev => ({ ...prev, batchNumber: e.target.value }))}
                        placeholder="Batch number"
                      />
                    ) : (
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{production.batchNumber || 'Not specified'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    {editing ? (
                      <Select
                        value={editData.status}
                        onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                      >
                        {statusOptions.map(status => (
                          <option key={status} value={status}>{status.replace('_', ' ')}</option>
                        ))}
                      </Select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(production.status)}`}>
                        {getStatusIcon(production.status)}
                        <span className="ml-1">{production.status.replace('_', ' ')}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Produced</label>
                    {editing ? (
                      <div className="flex space-x-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editData.quantityProduced}
                          onChange={(e) => setEditData(prev => ({ ...prev, quantityProduced: parseFloat(e.target.value) || 0 }))}
                          placeholder="Quantity"
                        />
                        <Input
                          value={editData.unit}
                          onChange={(e) => setEditData(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder="Unit"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Scale className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{production.quantityProduced} {production.unit}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Production Date</label>
                    {editing ? (
                      <Input
                        type="date"
                        value={editData.productionDate}
                        onChange={(e) => setEditData(prev => ({ ...prev, productionDate: e.target.value }))}
                      />
                    ) : (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{formatProductionDate(production.productionDate)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  {editing ? (
                    <textarea
                      value={editData.notes}
                      onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Production notes"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{production.notes || 'No notes provided'}</p>
                  )}
                </div>
              </div>

              {/* Recipe Information */}
              {production.recipe && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Recipe Information</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recipe</label>
                      <div className="flex items-center">
                        <ChefHat className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{production.recipe.name}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Yield</label>
                      <div className="flex items-center">
                        <Scale className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{production.recipe.yield} {production.recipe.yieldUnit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Meta Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Record Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
                    <div className="flex items-center text-gray-900">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(production.createdAt)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                    <div className="flex items-center text-gray-900">
                      <User className="w-4 h-4 mr-2" />
                      {production.createdByUser?.username || 'Unknown User'}
                    </div>
                    {production.createdByUser?.role && (
                      <span className="text-xs text-gray-500 ml-6">
                        {production.createdByUser.role.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {production.branch && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                      <div className="flex items-center text-gray-900">
                        <Building2 className="w-4 h-4 mr-2" />
                        {production.branch.name}
                      </div>
                      <span className="text-xs text-gray-500 ml-6">
                        {production.branch.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Production Status Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Factory className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Production Status</p>
                    <p>
                      {production.status === 'COMPLETED' 
                        ? 'This production batch has been completed and the inventory has been updated.'
                        : production.status === 'IN_PROGRESS'
                        ? 'This production batch is currently in progress.'
                        : production.status === 'PLANNED'
                        ? 'This production batch is planned but not yet started.'
                        : 'This production batch has been cancelled.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {!canEdit && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-gray-600 mt-0.5 mr-3" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">Read Only</p>
                      <p>
                        You can only edit production records that you created yourself or if you're a restaurant admin.
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