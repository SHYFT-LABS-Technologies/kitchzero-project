'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Clock, 
  Users, 
  ChefHat,
  Save,
  AlertCircle,
  Search
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { inventoryApi, recipeApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface InventoryItem {
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
}

interface IngredientRow {
  id: string;
  ingredientName: string;
  category: string;
  quantity: number;
  unit: string;
  notes?: string;
  isOptional: boolean;
}

export default function NewRecipePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    yield: 1,
    yieldUnit: 'pieces',
    preparationTime: 0,
    cookingTime: 0,
    instructions: [''],
    notes: ''
  });
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{
    id: '1',
    ingredientName: '',
    category: '',
    quantity: 0,
    unit: 'kg',
    notes: '',
    isOptional: false
  }]);

  const recipeCategories = [
    'Bakery', 'Main Course', 'Appetizer', 'Dessert', 'Beverage', 
    'Soup', 'Salad', 'Side Dish', 'Snack', 'Sauce'
  ];

  const recipeUnits = [
    'kg', 'g', 'mg',           // Weight
    'l', 'ml', 'cl',           // Volume  
    'cup', 'tbsp', 'tsp',      // Cooking measurements
    'pieces', 'pcs',           // Count
    'pinch', 'dash',           // Small amounts
    'handful', 'slice',        // Descriptive
    'can', 'bottle', 'pack'    // Containers
  ];

  useEffect(() => {
    if (user?.tenantId) {
      fetchInventoryItems();
    }
  }, [user?.tenantId]);

  const fetchInventoryItems = async () => {
    if (!user?.tenantId) return;

    try {
      const data = await inventoryApi.getItems(user.tenantId, { limit: '1000' });

      if (data.success) {
        // Group inventory items by (name, category, unit) and sum quantities
        const groupedItems: { [key: string]: InventoryItem } = {};
        
        data.data.items.forEach((item: any) => {
          const key = `${item.name}|${item.category}|${item.unit}`;
          if (groupedItems[key]) {
            groupedItems[key].totalQuantity += item.quantity;
          } else {
            groupedItems[key] = {
              name: item.name,
              category: item.category,
              unit: item.unit,
              totalQuantity: item.quantity
            };
          }
        });

        const items = Object.values(groupedItems);
        setInventoryItems(items);
        console.log(`📦 Loaded ${items.length} inventory items:`, items);

        // Extract unique categories
        const categories = [...new Set(items.map(item => item.category))].sort();
        setAvailableCategories(categories);
        console.log(`🏷️ Available categories:`, categories);
      }
    } catch (error) {
      console.error('Failed to fetch inventory items:', error);
      toast.error('Failed to load inventory items');
    }
  };

  const addIngredient = () => {
    const newIngredient: IngredientRow = {
      id: Date.now().toString(),
      ingredientName: '',
      category: '',
      quantity: 0,
      unit: 'kg',
      notes: '',
      isOptional: false
    };
    setIngredients([...ingredients, newIngredient]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof IngredientRow, value: any) => {
    console.log(`📝 Updating ingredient ${id}, field: ${field}, value:`, value);
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const handleIngredientSelect = (id: string, selectedItem: InventoryItem) => {
    console.log(`🎯 Selecting ingredient for ${id}:`, selectedItem);
    console.log(`🎯 Current ingredients before update:`, ingredients);
    
    updateIngredient(id, 'ingredientName', selectedItem.name);
    updateIngredient(id, 'category', selectedItem.category);
    // Don't override unit - let user choose recipe-specific unit
    
    console.log(`🎯 Selection completed for ${id} (unit kept as-is for recipe flexibility)`);
  };

  const getFilteredInventoryItems = (searchTerm: string, selectedCategory?: string) => {
    const filtered = inventoryItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    console.log(`🔍 Filtering with searchTerm: "${searchTerm}", category: "${selectedCategory}", found: ${filtered.length} items`);
    return filtered;
  };


  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  const removeInstruction = (index: number) => {
    if (formData.instructions.length > 1) {
      setFormData(prev => ({
        ...prev,
        instructions: prev.instructions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateInstruction = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => i === index ? value : inst)
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Recipe name is required');
      return false;
    }

    if (formData.yield <= 0) {
      toast.error('Yield must be greater than 0');
      return false;
    }

    const validIngredients = ingredients.filter(ing => 
      ing.ingredientName.trim() && ing.quantity > 0
    );

    if (validIngredients.length === 0) {
      toast.error('At least one ingredient is required');
      return false;
    }

    // Check if all ingredients have required fields
    for (const ing of validIngredients) {
      if (!ing.category.trim()) {
        toast.error(`Please select a category for ingredient: ${ing.ingredientName}`);
        return false;
      }
      if (!ing.unit.trim()) {
        toast.error(`Please select a unit for ingredient: ${ing.ingredientName}`);
        return false;
      }
    }

    return true;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.tenantId) return;

    try {
      setLoading(true);

      const validIngredients = ingredients
        .filter(ing => ing.ingredientName.trim() && ing.quantity > 0)
        .map((ing, index) => ({
          ingredientName: ing.ingredientName.trim(),
          category: ing.category || 'Unknown',
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
          isOptional: ing.isOptional,
          order: index + 1
        }));

      const recipeData = {
        ...formData,
        instructions: formData.instructions.filter(inst => inst.trim()),
        ingredients: validIngredients,
        tenantId: user.tenantId,
        branchId: user.branchId,
        createdBy: user.userId
      };

      const data = await recipeApi.createRecipe(user.tenantId, recipeData);

      if (data.success) {
        toast.success('Recipe created successfully');
        router.push('/recipes');
      } else {
        toast.error(data.error || 'Failed to create recipe');
      }
    } catch (error) {
      console.error('Failed to create recipe:', error);
      toast.error('Failed to create recipe');
    } finally {
      setLoading(false);
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Create New Recipe</h1>
              <p className="text-gray-600 mt-1">
                Define ingredients, instructions, and production details
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Sourdough Bread"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {recipeCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yield *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      value={formData.yield}
                      onChange={(e) => setFormData(prev => ({ ...prev, yield: parseFloat(e.target.value) || 1 }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <Select
                      value={formData.yieldUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, yieldUnit: e.target.value }))}
                    >
                      {recipeUnits.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Prep Time (min)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.preparationTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ChefHat className="w-4 h-4 inline mr-1" />
                      Cook Time (min)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.cookingTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, cookingTime: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the recipe..."
                  />
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Ingredients</h2>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="inline-flex items-center px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Ingredient
                </button>
              </div>

              <div className="space-y-4">
                {ingredients.map((ingredient, index) => {
                  const filteredItems = getFilteredInventoryItems(ingredient.ingredientName, ingredient.category);

                  return (
                    <div key={ingredient.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category *
                          </label>
                          <Select
                            value={ingredient.category}
                            onChange={(e) => {
                              updateIngredient(ingredient.id, 'category', e.target.value);
                            }}
                            className={!ingredient.category && ingredient.ingredientName ? 'border-red-300' : ''}
                          >
                            <option value="">Select category</option>
                            {availableCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="Vegetables">Vegetables</option>
                            <option value="Fruits">Fruits</option>
                            <option value="Meat">Meat</option>
                            <option value="Dairy">Dairy</option>
                            <option value="Grains">Grains</option>
                            <option value="Spices">Spices</option>
                            <option value="Beverages">Beverages</option>
                            <option value="Condiments">Condiments</option>
                            <option value="Others">Others</option>
                          </Select>
                          {!ingredient.category && ingredient.ingredientName && (
                            <div className="text-xs text-red-600 mt-1">Category is required</div>
                          )}
                        </div>

                        <div className="col-span-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ingredient Name *
                          </label>
                          <div className="relative">
                            <Input
                              value={ingredient.ingredientName}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateIngredient(ingredient.id, 'ingredientName', value);
                              }}
                              placeholder="Type ingredient name..."
                              leftIcon={<Search className="w-4 h-4" />}
                            />
                            {ingredient.ingredientName && ingredient.ingredientName.length > 0 && filteredItems.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                {filteredItems.slice(0, 10).map((item, itemIndex) => (
                                  <div
                                    key={itemIndex}
                                    onClick={() => {
                                      console.log(`🖱️ Clicked on item:`, item);
                                      handleIngredientSelect(ingredient.id, item);
                                    }}
                                    onMouseDown={(e) => {
                                      // Prevent input blur when clicking dropdown
                                      e.preventDefault();
                                    }}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                  >
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-gray-500">
                                      {item.category}
                                    </div>
                                  </div>
                                ))}
                                {ingredient.ingredientName && !filteredItems.some(item => item.name.toLowerCase() === ingredient.ingredientName.toLowerCase()) && (
                                  <div className="px-3 py-2 border-t border-gray-200">
                                    <div className="text-sm text-blue-600">
                                      "{ingredient.ingredientName}" - New ingredient (not in inventory)
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {ingredient.ingredientName && !inventoryItems.some(item => item.name === ingredient.ingredientName) && (
                            <div className="text-sm text-blue-600 mt-1 flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              New ingredient (not in inventory yet)
                            </div>
                          )}
                          {ingredient.ingredientName && inventoryItems.some(item => item.name === ingredient.ingredientName) && (
                            <div className="text-sm text-green-600 mt-1">
                              ✓ Available in inventory
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(ingredient.id, 'quantity', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit *
                          </label>
                          <Select
                            value={ingredient.unit}
                            onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                            className={!ingredient.unit && ingredient.ingredientName ? 'border-red-300' : ''}
                          >
                            <option value="">Select unit</option>
                            {recipeUnits.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </Select>
                          {!ingredient.unit && ingredient.ingredientName && (
                            <div className="text-xs text-red-600 mt-1">Unit is required</div>
                          )}
                        </div>

                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Optional
                          </label>
                          <input
                            type="checkbox"
                            checked={ingredient.isOptional}
                            onChange={(e) => updateIngredient(ingredient.id, 'isOptional', e.target.checked)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        </div>

                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => removeIngredient(ingredient.id)}
                            disabled={ingredients.length === 1}
                            className="p-2 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Notes field for each ingredient */}
                      <div className="mt-3">
                        <Input
                          value={ingredient.notes || ''}
                          onChange={(e) => updateIngredient(ingredient.id, 'notes', e.target.value)}
                          placeholder="Notes (e.g., finely chopped, room temperature)"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Instructions</h2>
                <button
                  type="button"
                  onClick={addInstruction}
                  className="inline-flex items-center px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </button>
              </div>

              <div className="space-y-3">
                {formData.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium mt-1">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        rows={2}
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        placeholder={`Step ${index + 1} instructions...`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      disabled={formData.instructions.length === 1}
                      className="flex-shrink-0 p-1 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h2>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes, tips, or variations..."
              />
            </div>

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
                disabled={loading}
                className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Recipe
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