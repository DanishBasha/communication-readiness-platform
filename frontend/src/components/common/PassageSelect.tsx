import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, Check, Headphones, Clock } from 'lucide-react';
import { LISTENING_PASSAGES } from '../../data/mockData';

export interface PassageSelectProps {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export const PassageSelect: React.FC<PassageSelectProps> = ({
  value,
  onChange,
  label,
  required = false,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedPassage =
    LISTENING_PASSAGES.find((p) => p.id === value) || LISTENING_PASSAGES[0];

  // Auto-flip if near viewport bottom
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
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

  const handleSelect = (id: string) => {
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

      {/* Trigger Button Matching Platform UI */}
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
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
            <Headphones className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="font-semibold text-xs text-neutral-900 truncate block">
              {selectedPassage.title}
            </span>
            <div className="flex items-center space-x-2 text-[10px] text-neutral-500 mt-0.5">
              <span>{selectedPassage.domain}</span>
              <span>·</span>
              <span className="font-mono">{selectedPassage.durationSeconds}s audio</span>
            </div>
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
          className={`absolute z-[100] left-0 right-0 w-full bg-white border border-neutral-200/90 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md ${
            openUpwards ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          <div className="px-2.5 py-1.5 border-b border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
            <span>Select Briefing Audio Passage</span>
            <span className="font-mono lowercase text-neutral-400">
              {LISTENING_PASSAGES.length} passages
            </span>
          </div>

          <div className="py-1 space-y-1">
            {LISTENING_PASSAGES.map((p) => {
              const isSelected = p.id === value;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'hover:bg-neutral-100/80 text-neutral-900'
                  }`}
                >
                  <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                    <div
                      className={`pt-1 shrink-0 ${
                        isSelected ? 'text-purple-300' : 'text-purple-600'
                      }`}
                    >
                      <Headphones className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div
                        className={`font-semibold text-xs truncate ${
                          isSelected ? 'text-white' : 'text-neutral-900'
                        }`}
                      >
                        {p.title}
                      </div>
                      <div
                        className={`text-[10px] flex items-center space-x-2 mt-0.5 ${
                          isSelected ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        <span className="truncate">{p.domain}</span>
                        <span>·</span>
                        <span className="font-mono shrink-0">{p.durationSeconds}s duration</span>
                      </div>
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
