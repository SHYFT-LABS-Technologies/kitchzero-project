'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Package, DollarSign, Calendar, MapPin, BarChart3, Settings } from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SmartAutocomplete, SmartAutocompleteOption } from '@/components/ui/smart-autocomplete';
import { DEFAULT_UNITS } from '@/lib/inventory-defaults';
import { analyzeItem, AIInventorySuggestion } from '@/lib/ai-inventory-helper';

interface InventoryFormData {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  cost: string;
  supplier: string;
  purchaseDate: string;
  expiryDate: string;
  location: string;
  notes: string;
}

interface InventoryFormProps {
  initialData?: Partial<InventoryFormData>;
  isEditing?: boolean;
  itemId?: string;
  onSuccess?: () => void;
}


export function InventoryForm({ initialData, isEditing = false, itemId, onSuccess }: InventoryFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    category: '',
    quantity: '',
    unit: 'kg',
    cost: '',
    supplier: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    location: '',
    notes: '',
    ...initialData
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<InventoryFormData>>({});
  const [databaseItems, setDatabaseItems] = useState<SmartAutocompleteOption[]>([]);
  const [databaseCategories, setDatabaseCategories] = useState<SmartAutocompleteOption[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<AIInventorySuggestion | null>(null);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);

  useEffect(() => {
    fetchDatabaseOptions();
  }, []);

  // Debug: Log current state
  useEffect(() => {
    console.log('🔍 Current database items state:', databaseItems);
    console.log('🔍 Current database categories state:', databaseCategories);
  }, [databaseItems, databaseCategories]);

  const fetchDatabaseOptions = async () => {
    try {
      console.log('🔍 Fetching database options...');
      
      // Fetch existing items and categories from database
      const [itemsResponse, categoriesResponse] = await Promise.all([
        apiClient.get('/api/inventory/suggestions?limit=100').catch((error) => {
          console.error('❌ Failed to fetch inventory suggestions:', error);
          return { success: false, data: [] };
        }),
        apiClient.get('/api/inventory/categories').catch((error) => {
          console.error('❌ Failed to fetch categories:', error);
          return { success: false, data: [] };
        })
      ]);

      console.log('📦 Items response:', itemsResponse);
      console.log('🏷️ Categories response:', categoriesResponse);

      if (itemsResponse.success && itemsResponse.data) {
        const mappedItems = itemsResponse.data.map((item: any) => ({
          value: item.name,
          label: item.name,
          category: item.category,
          unit: item.unit,
          supplier: item.supplier,
          isFromDatabase: true
        }));
        console.log(`✅ Setting ${mappedItems.length} database items:`, mappedItems);
        setDatabaseItems(mappedItems);
      } else {
        console.log('ℹ️ No database items found, using empty array');
        setDatabaseItems([]);
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        const mappedCategories = categoriesResponse.data.map((category: string) => ({
          value: category,
          label: category,
          isFromDatabase: true
        }));
        console.log(`✅ Setting ${mappedCategories.length} database categories:`, mappedCategories);
        setDatabaseCategories(mappedCategories);
      } else {
        console.log('ℹ️ No database categories found, using empty array');
        setDatabaseCategories([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch database options:', error);
      // Continue with defaults only
      setDatabaseItems([]);
      setDatabaseCategories([]);
    }
  };


  const handleInputChange = (field: keyof InventoryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Trigger AI analysis when item name or purchase date changes
    if (field === 'name' && typeof value === 'string' && value.trim().length > 2) {
      const suggestion = analyzeItem(value.trim(), formData.purchaseDate);
      setAiSuggestion(suggestion);
      setShowAiSuggestions(suggestion.confidence > 0);
      console.log('🤖 AI Analysis:', suggestion);
    } else if (field === 'name') {
      setAiSuggestion(null);
      setShowAiSuggestions(false);
    } else if (field === 'purchaseDate' && typeof value === 'string' && formData.name.trim().length > 2) {
      // Re-analyze with new purchase date for better expiry prediction
      const suggestion = analyzeItem(formData.name.trim(), value);
      setAiSuggestion(suggestion);
      setShowAiSuggestions(suggestion.confidence > 0);
      console.log('🤖 AI Re-analysis with new purchase date:', suggestion);
    }
  };

  const handleItemSelect = (option: SmartAutocompleteOption) => {
    console.log('🎯 Item selected:', option);
    console.log('📋 Current form data:', formData);
    console.log('🔍 Option details:', {
      name: option.value,
      category: option.category,
      unit: option.unit,
      supplier: option.supplier,
      isFromDatabase: option.isFromDatabase
    });
    
    // Auto-fill related fields when an existing item is selected
    if (option.isFromDatabase) {
      const updates: Partial<InventoryFormData> = {};
      const autoFillNotifications: string[] = [];
      
      // Auto-fill category if empty
      if (option.category && (!formData.category || formData.category.trim() === '')) {
        updates.category = option.category;
        autoFillNotifications.push('category');
        console.log('✅ Auto-filling category:', option.category);
      } else {
        console.log('⏭️ Skipping category auto-fill:', {
          hasCategory: !!option.category,
          currentCategory: formData.category,
          reason: !option.category ? 'no category in option' : 'form already has category'
        });
      }
      
      // Auto-fill unit if empty or default
      if (option.unit && (!formData.unit || formData.unit === 'kg')) {
        updates.unit = option.unit;
        autoFillNotifications.push('unit');
        console.log('✅ Auto-filling unit:', option.unit);
      } else {
        console.log('⏭️ Skipping unit auto-fill:', {
          hasUnit: !!option.unit,
          currentUnit: formData.unit,
          reason: !option.unit ? 'no unit in option' : 'form already has non-default unit'
        });
      }
      
      if (Object.keys(updates).length > 0) {
        console.log('📝 Applying updates:', updates);
        setFormData(prev => ({ ...prev, ...updates }));
        
        // Clear any errors for auto-filled fields
        const errorUpdates: Partial<InventoryFormData> = {};
        Object.keys(updates).forEach(key => {
          if (errors[key as keyof InventoryFormData]) {
            errorUpdates[key as keyof InventoryFormData] = undefined;
          }
        });
        if (Object.keys(errorUpdates).length > 0) {
          setErrors(prev => ({ ...prev, ...errorUpdates }));
        }
        
        // Show a helpful notification
        if (autoFillNotifications.length > 0) {
          toast.success(`✅ Auto-filled: ${autoFillNotifications.join(', ')}`);
        }
      } else {
        console.log('ℹ️ No fields to auto-fill');
      }
    } else {
      console.log('ℹ️ Not a database item, skipping auto-fill');
    }
  };

  const applyAiSuggestions = () => {
    if (!aiSuggestion) return;

    const updates: Partial<InventoryFormData> = {};
    const appliedSuggestions: string[] = [];

    // Apply category suggestion if field is empty
    if (aiSuggestion.category && (!formData.category || formData.category.trim() === '')) {
      updates.category = aiSuggestion.category;
      appliedSuggestions.push('category');
    }

    // Apply unit suggestion if field is default or empty
    if (aiSuggestion.unit && (!formData.unit || formData.unit === 'kg')) {
      updates.unit = aiSuggestion.unit;
      appliedSuggestions.push('unit');
    }

    // Apply expiry date suggestion if field is empty
    if (aiSuggestion.suggestedExpiryDate && !formData.expiryDate) {
      updates.expiryDate = aiSuggestion.suggestedExpiryDate;
      appliedSuggestions.push('expiry date');
    }

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
      
      // Clear errors for auto-filled fields
      const errorUpdates: Partial<InventoryFormData> = {};
      Object.keys(updates).forEach(key => {
        if (errors[key as keyof InventoryFormData]) {
          errorUpdates[key as keyof InventoryFormData] = undefined;
        }
      });
      if (Object.keys(errorUpdates).length > 0) {
        setErrors(prev => ({ ...prev, ...errorUpdates }));
      }

      toast.success(`🤖 AI applied: ${appliedSuggestions.join(', ')}`);
      setShowAiSuggestions(false);
    }
  };

  const dismissAiSuggestions = () => {
    setShowAiSuggestions(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<InventoryFormData> = {};

    if (!formData.name.trim()) newErrors.name = 'Item name is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required';
    if (!formData.cost || parseFloat(formData.cost) <= 0) {
      newErrors.cost = 'Valid cost is required';
    }
    if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
    
    if (formData.expiryDate && new Date(formData.expiryDate) <= new Date()) {
      newErrors.expiryDate = 'Expiry date must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setLoading(true);
      
      const endpoint = isEditing ? `/api/inventory/${itemId}` : '/api/inventory';
      const method = isEditing ? 'put' : 'post';
      
      const response = await apiClient[method](endpoint, formData);
      
      if (response.success) {
        toast.success(isEditing ? 'Item updated successfully' : 'Item added successfully');
        
        // Refresh database options to include the new item
        if (!isEditing) {
          await fetchDatabaseOptions();
        }
        
        onSuccess?.();
        router.push('/inventory');
      } else {
        toast.error(response.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemId || !isEditing) return;
    
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.delete(`/api/inventory/${itemId}`);
      
      if (response.success) {
        toast.success('Item deleted successfully');
        router.push('/inventory');
      } else {
        toast.error('Failed to delete item');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete item');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing 
                ? 'Update the details for this inventory item' 
                : 'Enter details for any item - you can create new items and categories by simply typing them'
              }
            </p>
          </div>
        </div>
        
        {isEditing && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        )}
      </div>

      {!isEditing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Package className="h-5 w-5 text-blue-600 mt-0.5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Creating New Items</h3>
              <p className="text-sm text-blue-700 mt-1">
                Simply type the name of any item and category - they will be created automatically when you save. 
                No need to pre-create categories or items.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Package className="w-5 h-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <SmartAutocomplete
                label="Item Name"
                type="item"
                value={formData.name}
                onValueChange={(value) => handleInputChange('name', value)}
                onOptionSelect={handleItemSelect}
                databaseOptions={databaseItems}
                onRefreshOptions={fetchDatabaseOptions}
                error={errors.name}
                required
              />
            </div>

            <SmartAutocomplete
              label="Category"
              type="category"
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
              databaseOptions={databaseCategories}
              onRefreshOptions={fetchDatabaseOptions}
              error={errors.category}
              required
            />

            <SmartAutocomplete
              label="Supplier"
              type="supplier"
              value={formData.supplier}
              onValueChange={(value) => handleInputChange('supplier', value)}
              databaseOptions={[]}
              error={errors.supplier}
            />
          </div>
        </div>

        {/* AI Suggestions */}
        {showAiSuggestions && aiSuggestion && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">🤖</span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-purple-800">AI Suggestions</h3>
                  <p className="text-xs text-purple-600 mt-1">{aiSuggestion.reasoning}</p>
                  
                  <div className="mt-3 space-y-2">
                    {aiSuggestion.category && (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-600 w-16">Category:</span>
                        <span className="font-medium text-purple-700">{aiSuggestion.category}</span>
                      </div>
                    )}
                    {aiSuggestion.unit && (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-600 w-16">Unit:</span>
                        <span className="font-medium text-purple-700">{aiSuggestion.unit}</span>
                      </div>
                    )}
                    {aiSuggestion.suggestedExpiryDate && (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-600 w-16">Expiry:</span>
                        <span className="font-medium text-purple-700">
                          {new Date(aiSuggestion.suggestedExpiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={applyAiSuggestions}
                      className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      ✨ Apply Suggestions
                    </button>
                    <button
                      type="button"
                      onClick={dismissAiSuggestions}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Dismiss
                    </button>
                    <div className="text-xs text-purple-600">
                      Confidence: {Math.round(aiSuggestion.confidence * 10)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quantity & Pricing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <DollarSign className="w-5 h-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Quantity & Pricing</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Quantity"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              error={errors.quantity}
              required
            />

            <Select
              label="Unit"
              value={formData.unit}
              onChange={(e) => handleInputChange('unit', e.target.value)}
              error={errors.unit}
              required
            >
              {DEFAULT_UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </Select>

            <Input
              label="Total Cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.cost}
              onChange={(e) => handleInputChange('cost', e.target.value)}
              error={errors.cost}
              leftIcon={<DollarSign className="w-4 h-4" />}
              required
            />
          </div>
        </div>

        {/* Dates & Location */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Calendar className="w-5 h-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Dates & Location</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
              error={errors.purchaseDate}
            />

            <Input
              label="Expiry Date"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => handleInputChange('expiryDate', e.target.value)}
              error={errors.expiryDate}
              required
            />

            <div className="md:col-span-2">
              <Input
                label="Storage Location"
                placeholder="e.g., Cold Storage Room A, Shelf 3, Freezer Section B"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                error={errors.location}
                leftIcon={<MapPin className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Additional Information</h2>
          
          <Textarea
            label="Notes"
            placeholder="Additional notes about this item, special handling instructions, etc."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            error={errors.notes}
            rows={4}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
}