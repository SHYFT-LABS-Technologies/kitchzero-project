'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { DEFAULT_CATEGORIES, COMMON_SUPPLIERS, searchCommonItems } from '@/lib/inventory-defaults';

export interface SmartAutocompleteOption {
  value: string;
  label: string;
  category?: string;
  unit?: string;
  supplier?: string;
  isFromDatabase?: boolean;
}

export interface SmartAutocompleteProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onOptionSelect?: (option: SmartAutocompleteOption) => void;
  type: 'item' | 'category' | 'supplier';
  databaseOptions?: SmartAutocompleteOption[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
  onRefreshOptions?: () => void;
}

export function SmartAutocomplete({
  label,
  placeholder = 'Search or type new...',
  value = '',
  onValueChange,
  onOptionSelect,
  type,
  databaseOptions = [],
  error,
  required,
  disabled,
  onRefreshOptions,
}: SmartAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const [filteredOptions, setFilteredOptions] = React.useState<SmartAutocompleteOption[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Get default options based on type
  const getDefaultOptions = React.useCallback((): SmartAutocompleteOption[] => {
    switch (type) {
      case 'category':
        return DEFAULT_CATEGORIES.map(cat => ({ value: cat, label: cat }));
      case 'supplier':
        return COMMON_SUPPLIERS.map(sup => ({ value: sup, label: sup }));
      case 'item':
        // Always provide a comprehensive list of popular items for better UX
        const popularItems = [
          // Vegetables
          { value: 'Tomatoes', label: 'Tomatoes', category: 'Vegetables' },
          { value: 'Onions', label: 'Onions', category: 'Vegetables' },
          { value: 'Carrots', label: 'Carrots', category: 'Vegetables' },
          { value: 'Potatoes', label: 'Potatoes', category: 'Vegetables' },
          { value: 'Lettuce', label: 'Lettuce', category: 'Vegetables' },
          { value: 'Spinach', label: 'Spinach', category: 'Vegetables' },
          { value: 'Bell Peppers', label: 'Bell Peppers', category: 'Vegetables' },
          { value: 'Cucumber', label: 'Cucumber', category: 'Vegetables' },
          { value: 'Broccoli', label: 'Broccoli', category: 'Vegetables' },
          { value: 'Garlic', label: 'Garlic', category: 'Vegetables' },
          { value: 'Pumpkin', label: 'Pumpkin', category: 'Vegetables' },
          { value: 'Sweet Potato', label: 'Sweet Potato', category: 'Vegetables' },
          { value: 'Ginger', label: 'Ginger', category: 'Vegetables' },
          { value: 'Mushrooms', label: 'Mushrooms', category: 'Vegetables' },
          { value: 'Celery', label: 'Celery', category: 'Vegetables' },
          
          // Fruits
          { value: 'Apples', label: 'Apples', category: 'Fruits' },
          { value: 'Bananas', label: 'Bananas', category: 'Fruits' },
          { value: 'Lemons', label: 'Lemons', category: 'Fruits' },
          { value: 'Limes', label: 'Limes', category: 'Fruits' },
          { value: 'Oranges', label: 'Oranges', category: 'Fruits' },
          { value: 'Avocados', label: 'Avocados', category: 'Fruits' },
          { value: 'Strawberries', label: 'Strawberries', category: 'Fruits' },
          { value: 'Blueberries', label: 'Blueberries', category: 'Fruits' },
          { value: 'Mango', label: 'Mango', category: 'Fruits' },
          { value: 'Pineapple', label: 'Pineapple', category: 'Fruits' },
          
          // Meat & Poultry
          { value: 'Chicken Breast', label: 'Chicken Breast', category: 'Meat & Poultry' },
          { value: 'Ground Beef', label: 'Ground Beef', category: 'Meat & Poultry' },
          { value: 'Chicken Thighs', label: 'Chicken Thighs', category: 'Meat & Poultry' },
          { value: 'Pork Chops', label: 'Pork Chops', category: 'Meat & Poultry' },
          { value: 'Bacon', label: 'Bacon', category: 'Meat & Poultry' },
          
          // Seafood
          { value: 'Salmon', label: 'Salmon', category: 'Seafood' },
          { value: 'Shrimp', label: 'Shrimp', category: 'Seafood' },
          { value: 'Tuna', label: 'Tuna', category: 'Seafood' },
          
          // Dairy & Eggs
          { value: 'Milk', label: 'Milk', category: 'Dairy & Eggs' },
          { value: 'Eggs', label: 'Eggs', category: 'Dairy & Eggs' },
          { value: 'Cheese', label: 'Cheese', category: 'Dairy & Eggs' },
          { value: 'Butter', label: 'Butter', category: 'Dairy & Eggs' },
          { value: 'Heavy Cream', label: 'Heavy Cream', category: 'Dairy & Eggs' },
          { value: 'Yogurt', label: 'Yogurt', category: 'Dairy & Eggs' },
          
          // Pantry Staples
          { value: 'Olive Oil', label: 'Olive Oil', category: 'Pantry Staples' },
          { value: 'Salt', label: 'Salt', category: 'Spices & Seasonings' },
          { value: 'Black Pepper', label: 'Black Pepper', category: 'Spices & Seasonings' },
          { value: 'Garlic Powder', label: 'Garlic Powder', category: 'Spices & Seasonings' },
          
          // Grains & Cereals
          { value: 'Rice', label: 'Rice', category: 'Grains & Cereals' },
          { value: 'Pasta', label: 'Pasta', category: 'Grains & Cereals' },
          { value: 'Bread', label: 'Bread', category: 'Grains & Cereals' },
          { value: 'Flour', label: 'Flour', category: 'Grains & Cereals' }
        ];
        
        // Also try to get items from searchCommonItems and merge
        try {
          const commonItems = searchCommonItems('');
          const mappedCommonItems = commonItems.map(item => ({ 
            value: item.name, 
            label: item.name, 
            category: item.category 
          }));
          
          // Merge and deduplicate
          const allItems = [...popularItems];
          mappedCommonItems.forEach(item => {
            if (!allItems.some(existing => existing.value.toLowerCase() === item.value.toLowerCase())) {
              allItems.push(item);
            }
          });
          
          return allItems;
        } catch (error) {
          console.warn('Failed to get common items, using popular items only:', error);
          return popularItems;
        }
      default:
        return [];
    }
  }, [type]);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  React.useEffect(() => {
    const defaultOptions = getDefaultOptions();
    
    // Prioritize database options - show them first
    const databaseOptionsFirst = [...databaseOptions];
    
    // Only add default options that don't exist in database
    const defaultsToAdd = defaultOptions.filter(defaultOption => 
      !databaseOptions.some(dbOption => 
        dbOption.value.toLowerCase() === defaultOption.value.toLowerCase()
      )
    );
    
    const allOptions = [...databaseOptionsFirst, ...defaultsToAdd];

    if (inputValue.trim()) {
      const searchTerm = inputValue.toLowerCase();
      const filtered = allOptions.filter(option =>
        option.label.toLowerCase().includes(searchTerm) ||
        option.category?.toLowerCase().includes(searchTerm)
      );
      
      // Sort filtered results: database items first, then defaults
      filtered.sort((a, b) => {
        if (a.isFromDatabase && !b.isFromDatabase) return -1;
        if (!a.isFromDatabase && b.isFromDatabase) return 1;
        return a.label.localeCompare(b.label);
      });
      
      console.log(`🔍 SmartAutocomplete filtering "${searchTerm}":`, {
        totalOptions: allOptions.length,
        filteredCount: filtered.length,
        sampleFiltered: filtered.slice(0, 3),
        databaseCount: allOptions.filter(o => o.isFromDatabase).length,
        defaultCount: allOptions.filter(o => !o.isFromDatabase).length
      });
      
      setFilteredOptions(filtered);
    } else {
      // When no search, show database options first (up to 10), then defaults
      const databaseFirst = allOptions.filter(opt => opt.isFromDatabase).slice(0, 10);
      const defaultsAfter = allOptions.filter(opt => !opt.isFromDatabase).slice(0, 10);
      const initialOptions = [...databaseFirst, ...defaultsAfter];
      
      console.log(`📋 SmartAutocomplete initial options:`, {
        totalOptions: allOptions.length,
        databaseFirst: databaseFirst.length,
        defaultsAfter: defaultsAfter.length,
        showing: initialOptions.length,
        sampleOptions: initialOptions.slice(0, 5)
      });
      
      setFilteredOptions(initialOptions);
    }
  }, [inputValue, databaseOptions, getDefaultOptions]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onValueChange?.(newValue);
    setOpen(true);
  };

  const handleFocus = () => {
    // Refresh options when user focuses on the input
    if (onRefreshOptions) {
      onRefreshOptions();
    }
    setOpen(true);
  };

  const handleSelectOption = (option: SmartAutocompleteOption) => {
    setInputValue(option.label);
    onValueChange?.(option.value);
    onOptionSelect?.(option);
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      onValueChange?.(inputValue.trim());
      setOpen(false);
    }
  };

  const showCreateOption = inputValue.trim() && 
    !filteredOptions.some(option => 
      option.label.toLowerCase() === inputValue.toLowerCase()
    );

  const inputId = React.useId();

  const getTypeLabels = () => {
    switch (type) {
      case 'item':
        return { create: 'Create new item', placeholder: 'Search items or type new item name...' };
      case 'category':
        return { create: 'Create new category', placeholder: 'Search categories or type new category...' };
      case 'supplier':
        return { create: 'Add new supplier', placeholder: 'Search suppliers or type new supplier...' };
      default:
        return { create: 'Create new', placeholder: 'Search or type new...' };
    }
  };

  const labels = getTypeLabels();

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder || labels.placeholder}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-8 py-2 text-sm ring-offset-white',
              'placeholder:text-gray-500',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
          />
          <ChevronDown 
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
          />
        </div>
        
        {open && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="px-3 py-1 text-xs bg-yellow-50 border-b text-yellow-700">
                Debug: {filteredOptions.length} options, open: {open.toString()}, input: "{inputValue}"
              </div>
            )}
            
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No options found - type to create new
              </div>
            ) : (
              <>
                {filteredOptions.slice(0, 10).map((option, index) => (
                  <div
                    key={`${option.value}-${index}`}
                    onClick={() => handleSelectOption(option)}
                    className={cn(
                      'px-3 py-2 text-sm cursor-pointer hover:bg-gray-50',
                      'flex items-center justify-between',
                      value === option.value && 'bg-primary-50 text-primary-700'
                    )}
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      {option.category && (
                        <div className="text-xs text-gray-500">{option.category}</div>
                      )}
                      {option.isFromDatabase && (
                        <div className="text-xs text-green-600">• In your inventory</div>
                      )}
                    </div>
                    {value === option.value && (
                      <Check className="h-4 w-4 text-primary-600" />
                    )}
                  </div>
                ))}
                {showCreateOption && (
                  <div
                    onClick={handleCreateNew}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-t border-gray-100 flex items-center text-primary-600 font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {labels.create} "{inputValue}"
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500">
        💡 Choose from suggestions or type to create new
      </p>
    </div>
  );
}