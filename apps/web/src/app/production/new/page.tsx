'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Package,
  DollarSign,
  Clock,
  Star,
  Save,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { recipeApi, productionApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Recipe {
  id: string;
  name: string;
  description?: string;
  category?: string;
  yield: number;
  yieldUnit: string;
  costPerUnit?: number;
  ingredients: Array<{
    ingredientName: string;
    category: string;
    quantity: number;
    unit: string;
    isOptional: boolean;
  }>;
}

interface AvailabilityCheck {
  recipe: {
    id: string;
    name: string;
    yield: number;
    yieldUnit: string;
  };
  multiplier: number;
  expectedYield: number;
  canProduce: boolean;
  missingIngredients: Array<{
    ingredientName: string;
    category: string;
    required: number;
    available: number;
    shortage: number;
    unit: string;
  }>;
  availability: Array<{
    ingredientName: string;
    category: string;
    required: number;
    available: number;
    sufficient: boolean;
    shortage: number;
    unit: string;
    isOptional: boolean;
  }>;
}

export default function NewProductionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [availability, setAvailability] = useState<AvailabilityCheck | null>(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [formData, setFormData] = useState({
    recipeId: '',
    plannedQuantity: 1,
    quantityProduced: 1,
    batchNumber: '',
    notes: '',
    qualityRating: 0,
    productionDate: new Date().toISOString().slice(0, 16) // datetime-local format
  });

  useEffect(() => {
    if (user?.tenantId) {
      fetchRecipes();
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (selectedRecipe && formData.plannedQuantity > 0) {
      checkIngredientAvailability();
    }
  }, [selectedRecipe, formData.plannedQuantity]);

  const fetchRecipes = async () => {
    if (!user?.tenantId) return;

    try {
      const params: Record<string, string> = {
        isActive: 'true',
        limit: '100'
      };

      if (recipeSearch) {
        params.search = recipeSearch;
      }

      const data = await recipeApi.getRecipes(user.tenantId, params);

      if (data.success) {
        setRecipes(data.data.recipes);
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      toast.error('Failed to load recipes');
    }
  };

  const checkIngredientAvailability = async () => {
    if (!selectedRecipe || !user?.tenantId) return;

    try {
      const multiplier = formData.plannedQuantity / selectedRecipe.yield;
      
      const data = await recipeApi.checkAvailability(user.tenantId, selectedRecipe.id, multiplier);

      if (data.success) {
        setAvailability(data.data);
      }
    } catch (error) {
      console.error('Failed to check availability:', error);
    }
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setFormData(prev => ({
      ...prev,
      recipeId: recipe.id,
      plannedQuantity: recipe.yield,
      quantityProduced: recipe.yield
    }));
  };

  const generateBatchNumber = () => {
    if (!selectedRecipe) return '';
    
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.toTimeString().slice(0, 5).replace(':', '');
    const recipePrefix = selectedRecipe.name.substring(0, 3).toUpperCase();
    
    return `${recipePrefix}-${dateStr}-${timeStr}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRecipe || !user?.tenantId) return;

    if (!availability?.canProduce) {
      toast.error('Cannot produce: Missing required ingredients');
      return;
    }

    try {
      setLoading(true);

      const productionData = {
        recipeId: formData.recipeId,
        plannedQuantity: formData.plannedQuantity,
        quantityProduced: formData.quantityProduced,
        batchNumber: formData.batchNumber || generateBatchNumber(),
        notes: formData.notes,
        qualityRating: formData.qualityRating > 0 ? formData.qualityRating : undefined,
        productionDate: new Date(formData.productionDate),
        tenantId: user.tenantId,
        branchId: user.branchId || '',
        producedBy: user.userId
      };

      const data = await productionApi.createProduction(user.tenantId, productionData);

      if (data.success) {
        toast.success('Production batch created successfully! Ingredients automatically deducted from inventory.');
        router.push('/production');
      } else {
        toast.error(data.error || 'Failed to create production batch');
      }
    } catch (error) {
      console.error('Failed to create production:', error);
      toast.error('Failed to create production batch');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Start New Production</h1>
              <p className="text-gray-600 mt-1">
                Create a production batch and automatically deduct ingredients from inventory
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Recipe Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Select Recipe</h2>
              
              <div className="mb-4">
                <Input
                  placeholder="Search recipes..."
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => handleRecipeSelect(recipe)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedRecipe?.id === recipe.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{recipe.name}</h3>
                        {recipe.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                            {recipe.category}
                          </span>
                        )}
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Yields: {recipe.yield} {recipe.yieldUnit}</p>
                          {recipe.costPerUnit && (
                            <p>Cost: {formatCurrency(recipe.costPerUnit)}/unit</p>
                          )}
                          <p>{recipe.ingredients.length} ingredients</p>
                        </div>
                      </div>
                      {selectedRecipe?.id === recipe.id && (
                        <CheckCircle className="w-5 h-5 text-primary-600 ml-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {recipes.length === 0 && (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recipes found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create a recipe first to start production.
                  </p>
                </div>
              )}
            </div>

            {/* Production Details */}
            {selectedRecipe && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Production Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Planned Quantity *
                    </label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={formData.plannedQuantity}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          plannedQuantity: parseFloat(e.target.value) || 0,
                          quantityProduced: parseFloat(e.target.value) || 0
                        }))}
                        required
                      />
                      <span className="text-sm text-gray-500">{selectedRecipe.yieldUnit}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Recipe yields {selectedRecipe.yield} {selectedRecipe.yieldUnit}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actual Quantity Produced *
                    </label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.quantityProduced}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantityProduced: parseFloat(e.target.value) || 0 }))}
                        required
                      />
                      <span className="text-sm text-gray-500">{selectedRecipe.yieldUnit}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Production Date *
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.productionDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, productionDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number
                    </label>
                    <Input
                      value={formData.batchNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                      placeholder="Auto-generated if empty"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality Rating (1-10)
                    </label>
                    <Select
                      value={formData.qualityRating.toString()}
                      onChange={(e) => setFormData(prev => ({ ...prev, qualityRating: parseInt(e.target.value) }))}
                    >
                      <option value="0">Not rated</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(rating => (
                        <option key={rating} value={rating}>
                          {rating} {rating <= 5 ? '⭐' : rating <= 8 ? '⭐⭐' : '⭐⭐⭐'}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Production Notes
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any notes about this production batch..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Ingredient Availability */}
            {availability && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Ingredient Availability</h2>
                  <div className={`flex items-center ${availability.canProduce ? 'text-green-600' : 'text-red-600'}`}>
                    {availability.canProduce ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Ready to Produce
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Missing Ingredients
                      </>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  Production will yield <strong>{availability.expectedYield} {availability.recipe.yieldUnit}</strong>
                </div>

                <div className="space-y-3">
                  {availability.availability.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        item.sufficient || item.isOptional
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{item.ingredientName}</span>
                          {item.isOptional && (
                            <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                              Optional
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.category} • Need: {item.required} {item.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${item.sufficient || item.isOptional ? 'text-green-700' : 'text-red-700'}`}>
                          Available: {item.available} {item.unit}
                        </div>
                        {item.shortage > 0 && !item.isOptional && (
                          <div className="text-sm text-red-600">
                            Short: {item.shortage} {item.unit}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {!availability.canProduce && availability.missingIngredients.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="font-medium text-red-900">Cannot proceed with production</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      Missing ingredients: {availability.missingIngredients.map(ing => ing.ingredientName).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Cost Estimation */}
            {selectedRecipe && availability && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Cost Estimation</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency((selectedRecipe.costPerUnit || 0) * formData.quantityProduced)}
                    </div>
                    <div className="text-sm text-gray-500">Estimated Total Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(selectedRecipe.costPerUnit)}
                    </div>
                    <div className="text-sm text-gray-500">Cost per Unit</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {formData.quantityProduced}
                    </div>
                    <div className="text-sm text-gray-500">Units to Produce</div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedRecipe || !availability?.canProduce}
                className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Production...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Start Production
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}