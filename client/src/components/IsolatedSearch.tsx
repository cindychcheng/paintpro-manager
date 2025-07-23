import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface IsolatedSearchProps {
  onSearchChange: (value: string) => void;
}

// Completely isolated search component in separate file
const IsolatedSearch: React.FC<IsolatedSearchProps> = ({ onSearchChange }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debounce and send to parent
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearchChange(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [value, onSearchChange]);
  
  return (
    <div className="relative flex-1">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search estimates..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full pl-12 pr-6 py-4 bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 shadow-lg placeholder:text-slate-400 text-slate-700"
      />
    </div>
  );
};

export default IsolatedSearch;