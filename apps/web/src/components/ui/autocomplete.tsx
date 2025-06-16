'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Plus } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
  category?: string;
}

export interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: Option[];
  onCreateNew?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  allowCreate?: boolean;
  createLabel?: string;
}

export function Autocomplete({
  label,
  placeholder = 'Search or select...',
  value = '',
  onValueChange,
  options,
  onCreateNew,
  error,
  required,
  disabled,
  allowCreate = false,
  createLabel = 'Create',
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const [filteredOptions, setFilteredOptions] = React.useState<Option[]>(options);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  React.useEffect(() => {
    const filtered = options.filter(option =>
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.value.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [options, inputValue]);

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

  const handleSelectOption = (option: Option) => {
    setInputValue(option.label);
    onValueChange?.(option.value);
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      // For autocomplete, we just accept the new value
      onValueChange?.(inputValue.trim());
      if (onCreateNew) {
        onCreateNew(inputValue.trim());
      }
      setOpen(false);
    }
  };

  const showCreateOption = allowCreate && inputValue.trim() && 
    !filteredOptions.some(option => 
      option.label.toLowerCase() === inputValue.toLowerCase()
    );

  const inputId = React.useId();

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm ring-offset-white',
            'placeholder:text-gray-500',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500'
          )}
        />
        <ChevronDown 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
        />
        
        {open && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {allowCreate ? 'Type to create a new item' : 'No options found'}
              </div>
            ) : (
              <>
                {filteredOptions.map((option, index) => (
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
                    </div>
                    {value === option.value && (
                      <Check className="h-4 w-4 text-primary-600" />
                    )}
                  </div>
                ))}
                {showCreateOption && (
                  <div
                    onClick={handleCreateNew}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-t border-gray-100 flex items-center text-primary-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createLabel} "{inputValue}"
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
    </div>
  );
}