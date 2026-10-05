import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
  description?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  required?: boolean;
  searchable?: boolean;
  direction?: 'up' | 'down' | 'auto';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  icon,
  required = false,
  searchable = false,
  direction = 'auto'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedDirection, setResolvedDirection] = useState<'up' | 'down'>(direction === 'up' ? 'up' : 'down');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Determine direction when opening
  useEffect(() => {
    if (isOpen) {
      if (direction === 'up') {
        setResolvedDirection('up');
      } else if (direction === 'down') {
        setResolvedDirection('down');
      } else {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          if (spaceBelow < 280 && spaceAbove > 180) {
            setResolvedDirection('up');
          } else {
            setResolvedDirection('down');
          }
        }
      }
    }
  }, [isOpen, direction]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset & focus search when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, searchable]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.badge && opt.badge.toLowerCase().includes(q)) ||
      (opt.description && opt.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className="block font-semibold text-neutral-700 mb-1 text-xs">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger & Popover Relative Anchor */}
      <div className="relative">
        {/* Dropdown Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`w-full px-3.5 py-2.5 bg-neutral-50 hover:bg-neutral-100/80 border text-left rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-2 shadow-2xs group cursor-pointer focus:outline-none ${
            isOpen
              ? 'border-neutral-900 ring-2 ring-neutral-900/10 bg-white'
              : 'border-neutral-200 hover:border-neutral-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center space-x-2 truncate">
            {icon && <span className="shrink-0 text-neutral-500 group-hover:text-neutral-800 transition-colors">{icon}</span>}
            {selectedOption ? (
              <div className="flex items-center space-x-2 truncate">
                {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                <span className="font-semibold text-neutral-900 truncate">{selectedOption.label}</span>
                {selectedOption.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 text-neutral-700">
                    {selectedOption.badge}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-neutral-400 font-normal">{placeholder}</span>
            )}
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-neutral-900' : ''
            }`}
          />
        </button>

        {/* Floating Popover Menu */}
        {isOpen && (
          <div className={`absolute left-0 right-0 z-50 bg-white border border-neutral-200/90 rounded-2xl shadow-xl p-1.5 space-y-1 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${
            resolvedDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}>
            {searchable && options.length > 3 && (
              <div className="p-1 pb-1.5 border-b border-neutral-100 mb-1 sticky top-0 bg-white z-10" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-colors"
                  />
                </div>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-neutral-400 text-xs italic">
                {searchQuery ? `No matches for "${searchQuery}"` : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                        : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <div className="flex items-center space-x-1.5">
                          <span className="truncate">{opt.label}</span>
                          {opt.badge && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <p
                            className={`text-[10px] mt-0.5 truncate ${
                              isSelected ? 'text-neutral-300' : 'text-neutral-400'
                            }`}
                          >
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
