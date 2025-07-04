'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit3,
  Trash2,
  ChefHat,
  Clock,
  Users,
  Scale,
  Tag,
  Calendar,
  User,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import toast from 'react-hot-toast';

interface Ingredient {
  id: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  category?: string;
  order?: number;
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  yield: number;
  yieldUnit: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: string;
  category?: string;
  instructions?: string;
  tags?: string[];
  createdAt: string;
  createdByUser?: {
    username: string;
    role: string;
  };
  ingredients: Ingredient[];
}

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    yield: 0,
    yieldUnit: '',
    prepTime: 0,
    cookTime: 0,
    servings: 0,
    difficulty: '',
    category: '',
    instructions: '',
    tags: [] as string[]
  });

  const difficultyOptions = ['EASY', 'MEDIUM', 'HARD'];
  const categoryOptions = ['APPETIZER', 'MAIN_COURSE', 'DESSERT', 'BEVERAGE', 'SIDE_DISH', 'SAUCE', 'SOUP'];

  useEffect(() => {
    if (user?.tenantId && params.id) {
      fetchRecipe();
    }
  }, [user?.tenantId, params.id]);

  const fetchRecipe = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/recipes/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecipe(data.data);
          setEditData({
            name: data.data.name,
            description: data.data.description || '',
            yield: data.data.yield,
            yieldUnit: data.data.yieldUnit,
            prepTime: data.data.prepTime || 0,
            cookTime: data.data.cookTime || 0,
            servings: data.data.servings || 0,
            difficulty: data.data.difficulty || '',
            category: data.data.category || '',
            instructions: data.data.instructions || '',
            tags: data.data.tags || []
          });
        } else {
          toast.error(data.error || 'Failed to load recipe');
          router.push('/recipes');
        }
      } else {
        toast.error('Failed to load recipe');
        router.push('/recipes');
      }
    } catch (error) {
      console.error('Failed to fetch recipe:', error);
      toast.error('Failed to load recipe');
      router.push('/recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!user?.tenantId || !recipe) return;

    try {
      setSaving(true);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/recipes/${params.id}`, {
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
          toast.success('Recipe updated successfully');
          setEditing(false);
          fetchRecipe();
        } else {
          toast.error(data.error || 'Failed to update recipe');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update recipe');
      }
    } catch (error) {
      console.error('Failed to update recipe:', error);
      toast.error('Failed to update recipe');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.tenantId || !recipe) return;

    if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/recipes/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Recipe deleted successfully');
          router.push('/recipes');
        } else {
          toast.error(data.error || 'Failed to delete recipe');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete recipe');
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      toast.error('Failed to delete recipe');
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'text-green-700 bg-green-100';
      case 'MEDIUM': return 'text-yellow-700 bg-yellow-100';
      case 'HARD': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'APPETIZER': return 'text-purple-700 bg-purple-100';
      case 'MAIN_COURSE': return 'text-blue-700 bg-blue-100';
      case 'DESSERT': return 'text-pink-700 bg-pink-100';
      case 'BEVERAGE': return 'text-cyan-700 bg-cyan-100';
      case 'SIDE_DISH': return 'text-orange-700 bg-orange-100';
      case 'SAUCE': return 'text-indigo-700 bg-indigo-100';
      case 'SOUP': return 'text-emerald-700 bg-emerald-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const canEdit = user?.role === 'RESTAURANT_ADMIN' || user?.role === 'KITCHZERO_ADMIN';

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

  if (!recipe) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Recipe Not Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                The recipe you're looking for doesn't exist or you don't have access to it.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/recipes')}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Recipes
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
                <h1 className="text-3xl font-bold text-gray-900">Recipe Details</h1>
                <p className="text-gray-600 mt-1">
                  {recipe.name} • {formatDate(recipe.createdAt)}
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
                      name: recipe.name,
                      description: recipe.description || '',
                      yield: recipe.yield,
                      yieldUnit: recipe.yieldUnit,
                      prepTime: recipe.prepTime || 0,
                      cookTime: recipe.cookTime || 0,
                      servings: recipe.servings || 0,
                      difficulty: recipe.difficulty || '',
                      category: recipe.category || '',
                      instructions: recipe.instructions || '',
                      tags: recipe.tags || []
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
                <h2 className="text-lg font-medium text-gray-900 mb-4">Recipe Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
                    {editing ? (
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Recipe name"
                      />
                    ) : (
                      <div className="flex items-center">
                        <ChefHat className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{recipe.name}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    {editing ? (
                      <Select
                        value={editData.category}
                        onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="">Select category</option>
                        {categoryOptions.map(category => (
                          <option key={category} value={category}>{category.replace('_', ' ')}</option>
                        ))}
                      </Select>
                    ) : (
                      recipe.category ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(recipe.category)}`}>
                          {recipe.category.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-500">Not specified</span>
                      )
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yield</label>
                    {editing ? (
                      <div className="flex space-x-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editData.yield}
                          onChange={(e) => setEditData(prev => ({ ...prev, yield: parseFloat(e.target.value) || 0 }))}
                          placeholder="Yield"
                        />
                        <Input
                          value={editData.yieldUnit}
                          onChange={(e) => setEditData(prev => ({ ...prev, yieldUnit: e.target.value }))}
                          placeholder="Unit"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Scale className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{recipe.yield} {recipe.yieldUnit}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                    {editing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editData.servings}
                        onChange={(e) => setEditData(prev => ({ ...prev, servings: parseInt(e.target.value) || 0 }))}
                        placeholder="Number of servings"
                      />
                    ) : (
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{recipe.servings || 'Not specified'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (minutes)</label>
                    {editing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editData.prepTime}
                        onChange={(e) => setEditData(prev => ({ ...prev, prepTime: parseInt(e.target.value) || 0 }))}
                        placeholder="Preparation time"
                      />
                    ) : (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{recipe.prepTime ? `${recipe.prepTime} min` : 'Not specified'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (minutes)</label>
                    {editing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editData.cookTime}
                        onChange={(e) => setEditData(prev => ({ ...prev, cookTime: parseInt(e.target.value) || 0 }))}
                        placeholder="Cooking time"
                      />
                    ) : (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{recipe.cookTime ? `${recipe.cookTime} min` : 'Not specified'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    {editing ? (
                      <Select
                        value={editData.difficulty}
                        onChange={(e) => setEditData(prev => ({ ...prev, difficulty: e.target.value }))}
                      >
                        <option value="">Select difficulty</option>
                        {difficultyOptions.map(difficulty => (
                          <option key={difficulty} value={difficulty}>{difficulty}</option>
                        ))}
                      </Select>
                    ) : (
                      recipe.difficulty ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                          {recipe.difficulty}
                        </span>
                      ) : (
                        <span className="text-gray-500">Not specified</span>
                      )
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  {editing ? (
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Recipe description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{recipe.description || 'No description provided'}</p>
                  )}
                </div>

                {/* Instructions */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                  {editing ? (
                    <textarea
                      value={editData.instructions}
                      onChange={(e) => setEditData(prev => ({ ...prev, instructions: e.target.value }))}
                      placeholder="Step-by-step instructions"
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="text-gray-900 whitespace-pre-wrap">{recipe.instructions || 'No instructions provided'}</div>
                  )}
                </div>

                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.map(tag => (
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

              {/* Ingredients */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Ingredients</h2>
                
                {recipe.ingredients && recipe.ingredients.length > 0 ? (
                  <div className="space-y-3">
                    {recipe.ingredients.map((ingredient) => (
                      <div key={ingredient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{ingredient.ingredientName}</span>
                        <span className="text-gray-600">{ingredient.quantity} {ingredient.unit}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No ingredients specified</p>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Meta Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Recipe Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
                    <div className="flex items-center text-gray-900">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(recipe.createdAt)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                    <div className="flex items-center text-gray-900">
                      <User className="w-4 h-4 mr-2" />
                      {recipe.createdByUser?.username || 'Unknown User'}
                    </div>
                    {recipe.createdByUser?.role && (
                      <span className="text-xs text-gray-500 ml-6">
                        {recipe.createdByUser.role.replace('_', ' ')}
                      </span>
                    )}
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
                        {user?.role === 'BRANCH_ADMIN' 
                          ? 'Branch admins can view recipes but only restaurant admins can edit or delete them.'
                          : 'You can only edit recipes if you\'re a restaurant admin.'
                        }
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