'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Users,
  Building2,
  UserPlus,
  Edit3,
  Shield,
  Calendar,
  Filter,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  role: string;
  branchId: string | null;
  createdAt: string;
  branch?: {
    id: string;
    name: string;
    address: string;
  };
}

interface Branch {
  id: string;
  name: string;
  address: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'BRANCH_ADMIN',
    branchId: '',
    mustChangePassword: true
  });

  useEffect(() => {
    if (user?.tenantId) {
      fetchBranches();
      fetchUsers();
    }
  }, [user?.tenantId, branchFilter]);

  const fetchBranches = async () => {
    if (!user?.tenantId) return;

    try {
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
        }
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchUsers = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (branchFilter !== 'ALL') {
        params.append('branchId', branchFilter);
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/tenants/${user.tenantId}/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.data);
        } else {
          console.error('API error:', data);
          toast.error(data.error || 'Failed to load users');
        }
      } else {
        console.error('HTTP error:', response.status, response.statusText);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Error response:', errorText);
        toast.error(`Failed to load users (${response.status})`);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.tenantId) return;

    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (!formData.password.trim()) {
      toast.error('Password is required');
      return;
    }

    try {
      setCreateLoading(true);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/tenants/${user.tenantId}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          branchId: formData.branchId || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('User created successfully');
          setShowCreateForm(false);
          setFormData({
            username: '',
            password: '',
            role: 'BRANCH_ADMIN',
            branchId: '',
            mustChangePassword: true
          });
          fetchUsers(); // Refresh the list
        } else {
          toast.error(data.error || 'Failed to create user');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: { branchId?: string | null; role?: string }) => {
    if (!user?.tenantId) return;

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/tenants/${user.tenantId}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('User updated successfully');
          setEditingUser(null);
          fetchUsers(); // Refresh the list
        } else {
          toast.error(data.error || 'Failed to update user');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!user?.tenantId) return;

    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(userId);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/tenants/${user.tenantId}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('User deleted successfully');
          fetchUsers();
        } else {
          toast.error(data.error || 'Failed to delete user');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'RESTAURANT_ADMIN': return 'text-purple-700 bg-purple-100';
      case 'BRANCH_ADMIN': return 'text-blue-700 bg-blue-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  // Check if user has permission to manage users
  const canManageUsers = user?.role === 'RESTAURANT_ADMIN' || user?.role === 'KITCHZERO_ADMIN';

  if (!canManageUsers) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have permission to manage users. Contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">
                Manage users and their branch assignments
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Add User
            </button>
          </div>

          {/* Create User Form */}
          {showCreateForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Create New User</h2>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="e.g., john_doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter temporary password"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <Select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="BRANCH_ADMIN">Branch Admin</option>
                      <option value="RESTAURANT_ADMIN">Restaurant Admin</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign to Branch
                    </label>
                    <Select
                      value={formData.branchId}
                      onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                    >
                      <option value="">No specific branch</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.mustChangePassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, mustChangePassword: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    User must change password on first login
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {createLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              <div>
                <Select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  <option value="ALL">All Branches</option>
                  <option value="">Unassigned</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="ALL">All Roles</option>
                  <option value="RESTAURANT_ADMIN">Restaurant Admin</option>
                  <option value="BRANCH_ADMIN">Branch Admin</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{user.username}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {editingUser?.id === user.id ? (
                      <button
                        onClick={() => setEditingUser(null)}
                        className="p-2 text-green-600 hover:text-green-700 rounded-lg hover:bg-green-50"
                      >
                        ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      disabled={deleting === user.id}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      title="Delete User"
                    >
                      {deleting === user.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Branch Assignment */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Assignment
                  </label>
                  {editingUser?.id === user.id ? (
                    <Select
                      value={user.branchId || ''}
                      onChange={(e) => handleUpdateUser(user.id, { branchId: e.target.value || null })}
                      className="w-full"
                    >
                      <option value="">No specific branch</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <div className="text-sm text-gray-900">
                      {user.branch ? (
                        <span className="flex items-center">
                          <Building2 className="w-4 h-4 mr-1 text-gray-400" />
                          {user.branch.name}
                        </span>
                      ) : (
                        <span className="text-gray-500">Not assigned to any branch</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Role */}
                {editingUser?.id === user.id && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <Select
                      value={user.role}
                      onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                      className="w-full"
                    >
                      <option value="BRANCH_ADMIN">Branch Admin</option>
                      <option value="RESTAURANT_ADMIN">Restaurant Admin</option>
                    </Select>
                  </div>
                )}

                {/* Created Date */}
                <div className="text-xs text-gray-500 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Joined {formatDate(user.createdAt)}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || branchFilter !== 'ALL' || roleFilter !== 'ALL' 
                  ? 'No users match your filters' 
                  : 'No users found'
                }
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || branchFilter !== 'ALL' || roleFilter !== 'ALL'
                  ? 'Try adjusting your search terms or filters.'
                  : 'Create your first user to get started.'
                }
              </p>
              {!searchTerm && branchFilter === 'ALL' && roleFilter === 'ALL' && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Add First User
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}