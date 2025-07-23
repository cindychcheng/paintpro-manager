import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface PureSearchProps {
  onResults: (results: any[]) => void;
}

// Pure search that doesn't update any React state - just fetches and passes results
const PureSearch: React.FC<PureSearchProps> = ({ onResults }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const performSearch = async (searchValue: string) => {
    try {
      const url = searchValue 
        ? `/api/estimates?page=1&limit=20&search=${encodeURIComponent(searchValue)}`
        : '/api/estimates?page=1&limit=20';
        
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.data) {
        onResults(data.data.data);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };
  
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = (e.target as HTMLInputElement).value;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };
  
  useEffect(() => {
    // Initial load
    performSearch('');
    
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

export default PureSearch;