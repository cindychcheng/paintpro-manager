import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface StandaloneSearchProps {
  onSearch: (value: string) => void;
}

// Completely standalone search - no state sync, no re-renders from parent
const StandaloneSearch: React.FC<StandaloneSearchProps> = ({ onSearch }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = (e.target as HTMLInputElement).value;
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      console.log('🚀 StandaloneSearch calling onSearch with:', value);
      onSearch(value);
    }, 300);
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div className="relative flex-1">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search estimates..."
        onInput={handleInput}
        autoComplete="off"
        className="w-full pl-12 pr-6 py-4 bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 shadow-lg placeholder:text-slate-400 text-slate-700"
      />
    </div>
  );
};

export default StandaloneSearch;