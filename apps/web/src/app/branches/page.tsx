'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Building2,
  MapPin,
  Users,
  Package,
  Edit3,
  Calendar,
  UserPlus,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface Branch {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  _count?: {
    users: number;
    inventoryItems: number;
  };
}

export default function BranchesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tenantId) {
      fetchBranches();
    }
  }, [user?.tenantId]);

  const fetchBranches = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/tenants/${user.tenantId}/branches`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBranches(data.data);
        } else {
          console.error('API error:', data);
          toast.error(data.error || 'Failed to load branches');
        }
      } else {
        console.error('HTTP error:', response.status, response.statusText);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Error response:', errorText);
        toast.error(`Failed to load branches (${response.status})`);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!user?.tenantId) return;

    if (!confirm(`Are you sure you want to delete "${branchName}"? This action cannot be undone and will remove all associated data.`)) {
      return;
    }

    try {
      setDeleting(branchId);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/tenants/${user.tenantId}/branches/${branchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Branch deleted successfully');
          fetchBranches();
        } else {
          toast.error(data.error || 'Failed to delete branch');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete branch');
      }
    } catch (error) {
      console.error('Failed to delete branch:', error);
      toast.error('Failed to delete branch');
    } finally {
      setDeleting(null);
    }
  };

  // Check if user has permission to manage branches
  const canManageBranches = user?.role === 'RESTAURANT_ADMIN' || user?.role === 'KITCHZERO_ADMIN';

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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Branch Management</h1>
              <p className="text-gray-600 mt-1">
                Manage your restaurant branches and locations
              </p>
            </div>
            {canManageBranches && (
              <button
                onClick={() => router.push('/branches/new')}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Branch
              </button>
            )}
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search branches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
            </div>
          </div>

          {/* Branches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBranches.map((branch) => (
              <div
                key={branch.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Building2 className="h-8 w-8 text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{branch.name}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {branch.address}
                      </div>
                    </div>
                  </div>
                  {canManageBranches && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => router.push(`/branches/${branch.id}/users`)}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Manage Users"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/branches/${branch.id}/edit`)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Edit Branch"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(branch.id, branch.name)}
                        disabled={deleting === branch.id}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                        title="Delete Branch"
                      >
                        {deleting === branch.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Branch Stats */}
                {branch._count && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {branch._count.users}
                          </p>
                          <p className="text-xs text-gray-500">Users</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-gray-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {branch._count.inventoryItems}
                          </p>
                          <p className="text-xs text-gray-500">Items</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Created Date */}
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="w-3 h-3 mr-1" />
                  Created {formatDate(branch.createdAt)}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredBranches.length === 0 && !loading && (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'No branches match your search' : 'No branches found'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'Try adjusting your search terms.'
                  : canManageBranches 
                    ? 'Get started by creating your first branch.'
                    : 'Contact your administrator to create branches.'
                }
              </p>
              {canManageBranches && !searchTerm && (
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/branches/new')}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add First Branch
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Access Control Info for Branch Admins */}
          {user?.role === 'BRANCH_ADMIN' && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Building2 className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Branch Access</p>
                  <p>
                    As a Branch Admin, you can only view and manage your assigned branch. 
                    Contact your Restaurant Admin if you need access to other branches.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}