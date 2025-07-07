'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

export function AutocompleteInput({
  suggestions = [],
  onSuggestionSelect,
  className,
  ...props
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    props.onChange?.(e);

    if (value.length > 0) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionSelect?.(suggestion);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.value = suggestion;
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        {...props}
        onChange={handleInputChange}
        className={className}
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-40 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-3 py-2 cursor-pointer hover:bg-gray-700 text-white text-sm"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}