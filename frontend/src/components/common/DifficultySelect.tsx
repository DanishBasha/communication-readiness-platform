import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'ADVANCED' | 'FAANG';

export interface DifficultyOption {
  id: DifficultyLevel;
  lvl: string;
  title: string;
  badge: string;
  subtitle: string;
  dotColor: string;
  activeColor: string;
  tagBg: string;
  tagText: string;
  tagBorder: string;
}

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    id: 'EASY',
    lvl: 'LVL 1',
    title: 'Entry / Foundation',
    badge: 'Fundamentals',
    subtitle: 'Core syntax, data types & basic algorithms',
    dotColor: 'bg-emerald-500',
    activeColor: 'text-emerald-400',
    tagBg: 'bg-emerald-50',
    tagText: 'text-emerald-700',
    tagBorder: 'border-emerald-200/80'
  },
  {
    id: 'MEDIUM',
    lvl: 'LVL 2',
    title: 'Intermediate',
    badge: 'Architecture',
    subtitle: 'Practical systems, RESTful APIs & design trade-offs',
    dotColor: 'bg-sky-500',
    activeColor: 'text-sky-400',
    tagBg: 'bg-sky-50',
    tagText: 'text-sky-700',
    tagBorder: 'border-sky-200/80'
  },
  {
    id: 'ADVANCED',
    lvl: 'LVL 3',
    title: 'Advanced',
    badge: 'Concurrency & Scale',
    subtitle: 'Concurrency, distributed scale, edge cases & memory',
    dotColor: 'bg-purple-500',
    activeColor: 'text-purple-400',
    tagBg: 'bg-purple-50',
    tagText: 'text-purple-700',
    tagBorder: 'border-purple-200/80'
  },
  {
    id: 'FAANG',
    lvl: 'LVL 4',
    title: 'Product Tier / FAANG Bar',
    badge: 'Strict Rubric',
    subtitle: 'Algorithmic depth, rigorous trade-offs & FAANG bar',
    dotColor: 'bg-amber-500',
    activeColor: 'text-amber-400',
    tagBg: 'bg-amber-50',
    tagText: 'text-amber-700',
    tagBorder: 'border-amber-200/80'
  }
];

export interface DifficultySelectProps {
  value: DifficultyLevel;
  onChange: (val: DifficultyLevel) => void;
  label?: string;
  required?: boolean;
  className?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}

export const DifficultySelect: React.FC<DifficultySelectProps> = ({
  value,
  onChange,
  label,
  required = false,
  className = '',
  align = 'right',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedOpt = DIFFICULTY_OPTIONS.find((opt) => opt.id === value) || DIFFICULTY_OPTIONS[1];

  // Auto-flip if near viewport bottom
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 290 && spaceAbove > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  // Click outside and Escape key to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!popoverRef.current || !popoverRef.current.contains(e.target as Node))
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (id: DifficultyLevel) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block font-semibold text-neutral-800 text-[11px] mb-1.5">
          <span>{label}</span>
          {required && !label.includes('*') && (
            <span className="text-amber-600 ml-0.5 font-bold">*</span>
          )}
        </label>
      )}

      {/* Styled Trigger Button Matching Platform UI */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-xs transition-all cursor-pointer shadow-2xs group text-left ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-neutral-100 border-neutral-200'
            : isOpen
            ? 'border-neutral-900 ring-2 ring-neutral-900/10 bg-neutral-50/50'
            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/30'
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${selectedOpt.dotColor}`} />
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${selectedOpt.tagBg} ${selectedOpt.tagText} ${selectedOpt.tagBorder}`}
            >
              {selectedOpt.lvl}
            </span>
          </div>
          <div className="truncate">
            <span className="font-semibold text-xs text-neutral-900 truncate block">
              {selectedOpt.title}
            </span>
            <span className="text-[10px] text-neutral-400 font-normal truncate block">
              {selectedOpt.badge}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0 ml-2">
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 group-hover:text-neutral-700 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-neutral-900' : ''
            }`}
          />
        </div>
      </button>

      {/* Custom Dropdown Menu Popover Matching Platform UI */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-[100] w-full min-w-[300px] sm:min-w-[340px] max-w-[calc(100vw-32px)] bg-white border border-neutral-200/90 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md ${
            openUpwards ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <div className="px-2.5 py-1.5 border-b border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
            <span>Select Evaluation Bar</span>
            <span className="font-mono lowercase text-neutral-400">4 difficulty levels</span>
          </div>

          <div className="py-1 space-y-1">
            {DIFFICULTY_OPTIONS.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'hover:bg-neutral-100/80 text-neutral-900'
                  }`}
                >
                  <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                    <div className="pt-0.5 shrink-0 flex items-center space-x-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? opt.activeColor.replace('text-', 'bg-') : opt.dotColor
                        }`}
                      />
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors ${
                          isSelected
                            ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
                            : `${opt.tagBg} ${opt.tagText} ${opt.tagBorder}`
                        }`}
                      >
                        {opt.lvl}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`font-semibold text-xs truncate ${
                            isSelected ? 'text-white' : 'text-neutral-900'
                          }`}
                        >
                          {opt.title}
                        </span>
                        <span
                          className={`text-[10px] font-normal truncate ${
                            isSelected ? 'text-neutral-300' : 'text-neutral-500'
                          }`}
                        >
                          ({opt.badge})
                        </span>
                      </div>
                      <p
                        className={`text-[10px] leading-tight mt-0.5 ${
                          isSelected ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        {opt.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5 pl-1">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="w-4 h-4 block" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
