'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  ChefHat, 
  Clock, 
  DollarSign,
  Users,
  Eye,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { recipeApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useCurrency } from '@/context/settings-context';

interface Recipe {
  id: string;
  name: string;
  description?: string;
  category?: string;
  yield: number;
  yieldUnit: string;
  preparationTime?: number;
  cookingTime?: number;
  costPerUnit?: number;
  isActive: boolean;
  createdAt: string;
  branch?: { name: string };
  ingredients: Array<{
    id: string;
    ingredientName: string;
    category: string;
    quantity: number;
    unit: string;
    order: number;
  }>;
  _count: {
    productions: number;
  };
}

export default function RecipesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (user?.tenantId) {
      fetchRecipes();
      fetchCategories();
    }
  }, [user?.tenantId, searchTerm, categoryFilter, statusFilter, pagination.page]);

  const fetchRecipes = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      };

      if (searchTerm) params.search = searchTerm;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (statusFilter !== 'ALL') params.isActive = statusFilter === 'ACTIVE' ? 'true' : 'false';

      const data = await recipeApi.getRecipes(user.tenantId, params);

      if (data.success) {
        setRecipes(data.data.recipes || []);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      toast.error('Failed to load recipes');
      setRecipes([]); // Ensure recipes is always an array
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!user?.tenantId) return;

    try {
      // Workaround: Get categories from existing recipes for now
      const data = await recipeApi.getRecipes(user.tenantId, { limit: '1000' });
      if (data.success) {
        const uniqueCategories = [...new Set((data.data.recipes || [])
          .map((recipe: any) => recipe.category)
          .filter(Boolean)
        )].sort();
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const deleteRecipe = async (id: string) => {
    if (!user?.tenantId) return;
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      const data = await recipeApi.deleteRecipe(user.tenantId, id);

      if (data.success) {
        toast.success('Recipe deleted successfully');
        fetchRecipes();
      } else {
        toast.error(data.error || 'Failed to delete recipe');
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      toast.error('Failed to delete recipe');
    }
  };

  const toggleRecipeStatus = async (id: string, currentStatus: boolean) => {
    if (!user?.tenantId) return;

    try {
      const data = await recipeApi.updateRecipe(user.tenantId, id, { isActive: !currentStatus });

      if (data.success) {
        toast.success(`Recipe ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchRecipes();
      } else {
        toast.error(data.error || 'Failed to update recipe');
      }
    } catch (error) {
      console.error('Failed to update recipe:', error);
      toast.error('Failed to update recipe');
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // formatCurrency now comes from useCurrency hook

  // Check if user can manage recipes
  const canManageRecipes = user?.role === 'RESTAURANT_ADMIN' || user?.role === 'KITCHZERO_ADMIN';

  if (loading && recipes.length === 0) {
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
              <h1 className="text-3xl font-bold text-gray-900">Recipe Management</h1>
              <p className="text-gray-600 mt-1">
                Manage your recipes, track ingredient usage, and monitor production costs
              </p>
            </div>
            {canManageRecipes && (
              <button
                onClick={() => router.push('/recipes/new')}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Recipe
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {(categories || []).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </div>
          </div>

          {/* Recipes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(recipes || []).map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Recipe Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {recipe.name}
                      </h3>
                      {recipe.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {recipe.category}
                        </span>
                      )}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${recipe.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                  </div>
                  
                  {recipe.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
                </div>

                {/* Recipe Stats */}
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-1" />
                      <span>Yields {recipe.yield} {recipe.yieldUnit}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span>{recipe.costPerUnit ? formatCurrency(recipe.costPerUnit) : 'N/A'}/unit</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{formatTime((recipe.preparationTime || 0) + (recipe.cookingTime || 0))}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <ChefHat className="w-4 h-4 mr-1" />
                      <span>{recipe._count.productions} batches</span>
                    </div>
                  </div>
                </div>

                {/* Ingredients Preview */}
                <div className="px-6 pb-4">
                  <p className="text-xs text-gray-500 mb-2">
                    Ingredients ({(recipe.ingredients || []).length}):
                  </p>
                  <div className="text-xs text-gray-600">
                    {(recipe.ingredients || [])
                      .slice(0, 3)
                      .map(ing => `${ing.quantity} ${ing.unit} ${ing.itemName || ing.ingredientName}`)
                      .join(', ')}
                    {(recipe.ingredients || []).length > 3 && '...'}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => router.push(`/recipes/${recipe.id}`)}
                      className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    
                    {canManageRecipes && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
                          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => toggleRecipeStatus(recipe.id, recipe.isActive)}
                          className={`inline-flex items-center text-sm ${recipe.isActive ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}`}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                        
                        {recipe._count.productions === 0 && (
                          <button
                            onClick={() => deleteRecipe(recipe.id)}
                            className="inline-flex items-center text-sm text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {recipes.length === 0 && !loading && (
            <div className="text-center py-12">
              <ChefHat className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recipes found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first recipe.
              </p>
              {canManageRecipes && (
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/recipes/new')}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Recipe
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total recipes)
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