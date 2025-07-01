'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Suggestion {
  model: string;
  trim: string; // Keep for interface compatibility but won't use it
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (model: string, trim: string) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  className,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (!value.trim()) {
      setFilteredSuggestions([]);
      return;
    }

    const query = value.toLowerCase();
    const filtered = suggestions.filter(suggestion => 
      suggestion.model.toLowerCase().includes(query)
    );

    // Sort by relevance
    filtered.sort((a, b) => {
      const aModel = a.model.toLowerCase();
      const bModel = b.model.toLowerCase();
      
      // Exact matches first
      if (aModel === query) return -1;
      if (bModel === query) return 1;
      
      // Then starts with query
      if (aModel.startsWith(query)) return -1;
      if (bModel.startsWith(query)) return 1;
      
      return 0;
    });

    setFilteredSuggestions(filtered);
  }, [value, suggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={cn(
          'flex h-10 w-full rounded-md border border-stone bg-transparent px-3 py-2 text-sm ring-offset-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          className
        )}
      />

      {isOpen && filteredSuggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border border-stone bg-white shadow-lg">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.model}-${index}`}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 focus:bg-primary-50"
              onClick={() => {
                onSelect(suggestion.model, ''); // Pass empty string for trim
                setIsOpen(false);
              }}
            >
              {suggestion.model}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 