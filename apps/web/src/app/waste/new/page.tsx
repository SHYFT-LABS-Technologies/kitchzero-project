'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search,
  AlertTriangle,
  Package,
  Save,
  Info
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { wasteApi, inventoryApi, recipeApi, productionApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Recipe {
  id: string;
  name: string;
  category?: string;
  yield: number;
  yieldUnit: string;
}

interface InventoryItem {
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
}

interface Production {
  id: string;
  batchNumber?: string;
  quantityProduced: number;
  recipe: {
    name: string;
    yieldUnit: string;
  };
}

interface Branch {
  id: string;
  name: string;
  address: string;
}

export default function NewWastePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [productionSearch, setProductionSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    quantity: 0,
    unit: 'kg',
    wasteType: 'RAW',
    reason: '',
    recipeId: '',
    productionId: '',
    branchId: '',
    preventable: true,
    severity: 'MEDIUM',
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

  const commonUnits = ['kg', 'pieces', 'liters', 'cans'];

  useEffect(() => {
    if (user?.tenantId) {
      fetchBranches();
      fetchInventoryItems();
      if (formData.wasteType === 'PRODUCT') {
        fetchRecipes();
        fetchProductions();
      }
    }
  }, [user?.tenantId, formData.wasteType, recipeSearch, productionSearch]);

  useEffect(() => {
    // Set default branch based on user role
    if (user?.role === 'BRANCH_ADMIN' && user?.branchId) {
      setFormData(prev => ({ ...prev, branchId: user.branchId }));
    }
  }, [user?.role, user?.branchId]);

  const fetchBranches = async () => {
    if (!user?.tenantId) return;

    try {
      // For now, use a simple API call to get branches
      // We'll need to add this endpoint to the backend
      const response = await fetch(`/api/tenants/${user.tenantId}/branches`, {
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
      // Fallback: create a default branch structure
      setBranches([{ id: user.branchId || 'default', name: 'Main Branch', address: 'Default Location' }]);
    }
  };

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

        // Extract unique categories
        const categories = [...new Set(items.map(item => item.category))].sort();
        setAvailableCategories(categories);
      }
    } catch (error) {
      console.error('Failed to fetch inventory items:', error);
      toast.error('Failed to load inventory items');
    }
  };

  const fetchRecipes = async () => {
    if (!user?.tenantId) return;

    try {
      const params: Record<string, string> = {
        isActive: 'true',
        limit: '50'
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
    }
  };

  const fetchProductions = async () => {
    if (!user?.tenantId) return;

    try {
      const params: Record<string, string> = {
        status: 'COMPLETED',
        limit: '50'
      };

      const data = await productionApi.getProductions(user.tenantId, params);

      if (data.success) {
        setProductions(data.data.productions);
      }
    } catch (error) {
      console.error('Failed to fetch productions:', error);
    }
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    setFormData(prev => ({
      ...prev,
      recipeId: recipe.id,
      itemName: recipe.name,
      category: recipe.category || 'Prepared Foods',
      unit: recipe.yieldUnit
    }));
  };

  const handleProductionSelect = (production: Production) => {
    setFormData(prev => ({
      ...prev,
      productionId: production.id,
      itemName: production.recipe.name,
      category: 'Prepared Foods',
      unit: production.recipe.yieldUnit
    }));
  };

  const handleInventoryItemSelect = (selectedItem: InventoryItem) => {
    setFormData(prev => ({
      ...prev,
      itemName: selectedItem.name,
      category: selectedItem.category,
      unit: selectedItem.unit
    }));
    setItemSearch(selectedItem.name);
  };

  const getFilteredInventoryItems = (searchTerm: string, selectedCategory?: string) => {
    return inventoryItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const getAvailableUnitsForItem = (itemName: string, category: string) => {
    const units = inventoryItems
      .filter(item => item.name === itemName && item.category === category)
      .map(item => item.unit);
    return units.length > 0 ? units : commonUnits;
  };

  const addTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const generateTags = (reason: string) => {
    const tags: string[] = [];
    const reasonLower = reason.toLowerCase();

    if (reasonLower.includes('expired') || reasonLower.includes('spoiled')) {
      tags.push('expiry', 'storage_issue');
    }
    if (reasonLower.includes('overcooked') || reasonLower.includes('burnt')) {
      tags.push('cooking_error');
    }
    if (reasonLower.includes('contaminated')) {
      tags.push('contamination');
    }
    if (reasonLower.includes('over-ordered')) {
      tags.push('over_ordering');
    }
    if (reasonLower.includes('damaged')) {
      tags.push('damage');
    }

    return tags;
  };

  const handleReasonChange = (reason: string) => {
    setFormData(prev => ({ ...prev, reason }));
    
    // Auto-generate tags
    const autoTags = generateTags(reason);
    autoTags.forEach(tag => addTag(tag));
  };

  const validateForm = () => {
    if (!formData.itemName.trim()) {
      toast.error('Item name is required');
      return false;
    }

    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return false;
    }

    if (!formData.reason.trim()) {
      toast.error('Waste reason is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.tenantId || !formData.branchId) {
      if (!formData.branchId) {
        toast.error('Please select a branch');
      }
      return;
    }

    try {
      setLoading(true);

      const wasteData = {
        ...formData,
        loggedBy: user.userId
      };

      const data = await wasteApi.createLog(user.tenantId, formData.branchId, wasteData);

      if (data.success) {
        if (formData.wasteType === 'RAW') {
          toast.success('Waste logged successfully! Inventory automatically updated.');
        } else {
          toast.success('Product waste logged successfully!');
        }
        router.push('/waste');
      } else {
        toast.error(data.error || 'Failed to log waste');
      }
    } catch (error) {
      console.error('Failed to log waste:', error);
      toast.error('Failed to log waste');
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
              <h1 className="text-3xl font-bold text-gray-900">Log Waste</h1>
              <p className="text-gray-600 mt-1">
                Track and analyze waste to improve sustainability
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Waste Type Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Waste Type</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setFormData(prev => ({ ...prev, wasteType: 'RAW', recipeId: '', productionId: '' }))}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.wasteType === 'RAW'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Package className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Raw Materials</h3>
                      <p className="text-sm text-gray-600">
                        Ingredients, supplies, and raw materials
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setFormData(prev => ({ ...prev, wasteType: 'PRODUCT', itemName: '', category: '' }))}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.wasteType === 'PRODUCT'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <AlertTriangle className="w-6 h-6 text-purple-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Finished Products</h3>
                      <p className="text-sm text-gray-600">
                        Prepared food items from recipes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Selection for Finished Products */}
            {formData.wasteType === 'PRODUCT' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Select Product</h2>
                
                <div className="space-y-4">
                  {/* Recipe Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Recipe
                    </label>
                    <div className="mb-3">
                      <Input
                        placeholder="Search recipes..."
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                        leftIcon={<Search className="w-4 h-4" />}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                      {recipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          onClick={() => handleRecipeSelect(recipe)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            formData.recipeId === recipe.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{recipe.name}</div>
                          <div className="text-sm text-gray-500">
                            {recipe.category} • {recipe.yield} {recipe.yieldUnit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center text-gray-500">or</div>

                  {/* Production Batch Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Production Batch
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                      {productions.map((production) => (
                        <div
                          key={production.id}
                          onClick={() => handleProductionSelect(production)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            formData.productionId === production.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{production.recipe.name}</div>
                          <div className="text-sm text-gray-500">
                            Batch: {production.batchNumber || 'N/A'} • {production.quantityProduced} {production.recipe.yieldUnit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Item Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Item Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formData.wasteType === 'RAW' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <Select
                        value={formData.category}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, category: e.target.value, itemName: '', unit: 'kg' }));
                          setItemSearch('');
                        }}
                      >
                        <option value="">Select category first</option>
                        {availableCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Name *
                      </label>
                      <div className="relative">
                        <Input
                          value={itemSearch}
                          onChange={(e) => setItemSearch(e.target.value)}
                          placeholder="Search inventory items..."
                          leftIcon={<Search className="w-4 h-4" />}
                          required
                        />
                        {itemSearch && formData.category && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {getFilteredInventoryItems(itemSearch, formData.category).slice(0, 10).map((item, index) => (
                              <div
                                key={index}
                                onClick={() => handleInventoryItemSelect(item)}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                              >
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-500">
                                  {item.category} • {item.totalQuantity} {item.unit} available
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {formData.itemName && (
                        <div className="text-sm text-green-600 mt-1">
                          Selected: {formData.itemName}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <Select
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    >
                      {(formData.itemName && formData.category ? 
                        getAvailableUnitsForItem(formData.itemName, formData.category) : 
                        commonUnits
                      ).map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Branch Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch {user?.role === 'RESTAURANT_ADMIN' ? '*' : ''}
                  </label>
                  {user?.role === 'BRANCH_ADMIN' ? (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
                      {branches.find(b => b.id === formData.branchId)?.name || 'Your Branch'}
                    </div>
                  ) : (
                    <Select
                      value={formData.branchId}
                      onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                      required={user?.role === 'RESTAURANT_ADMIN'}
                    >
                      <option value="">Select branch</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} - {branch.address}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            </div>

            {/* Waste Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Waste Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Waste *
                  </label>
                  <Select
                    value={formData.reason}
                    onChange={(e) => handleReasonChange(e.target.value)}
                    required
                  >
                    <option value="">Select reason</option>
                    {wasteReasons.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity
                  </label>
                  <Select
                    value={formData.severity}
                    onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preventable
                  </label>
                  <Select
                    value={formData.preventable.toString()}
                    onChange={(e) => setFormData(prev => ({ ...prev, preventable: e.target.value === 'true' }))}
                  >
                    <option value="true">Yes - Could have been prevented</option>
                    <option value="false">No - Not preventable</option>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              {formData.tags.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-generated Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-primary-600 hover:text-primary-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Inventory Impact</p>
                  <p>
                    {formData.wasteType === 'RAW' 
                      ? 'This waste will automatically deduct the specified quantity from your inventory using FIFO (First In, First Out) logic.'
                      : 'This finished product waste will automatically deduct the recipe ingredients from your raw material inventory based on the recipe formula. For example, if 5 loaves of bread are wasted, it will deduct the flour, sugar, and other ingredients needed for 5 loaves from your inventory.'
                    }
                  </p>
                </div>
              </div>
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
                    Logging Waste...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Log Waste
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