import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check, X, Sparkles } from 'lucide-react';

export interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  label?: string;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  required?: boolean;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  label,
  placeholder = 'Select date',
  className = '',
  align = 'left',
  required = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'DAYS' | 'MONTHS' | 'YEARS'>('DAYS');
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Helper to parse YYYY-MM-DD avoiding UTC date shifts
  const parseDate = (dStr: string): Date => {
    if (!dStr) return new Date();
    const parts = dStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  };

  const selectedDate = value ? parseDate(value) : null;
  const [viewYear, setViewYear] = useState(() => (selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (selectedDate ? selectedDate.getMonth() : new Date().getMonth()));

  // Auto-flip popover if too close to viewport bottom
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 380 && spaceAbove > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!popoverRef.current || !popoverRef.current.contains(e.target as Node))
      ) {
        setIsOpen(false);
        setViewMode('DAYS');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keep viewYear and viewMonth synchronized with value
  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    onChange(dateStr);
    setIsOpen(false);
    setViewMode('DAYS');
  };

  const handleSelectShortcut = (daysToAdd: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const dStr = `${yyyy}-${mm}-${dd}`;
    onChange(dStr);
    setViewYear(yyyy);
    setViewMonth(target.getMonth());
    setIsOpen(false);
    setViewMode('DAYS');
  };

  const formatDisplay = (dStr: string) => {
    if (!dStr) return placeholder;
    const d = parseDate(dStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getShortcutDateStr = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getShortcutDateStr(0);

  // Calendar calculations
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Year range for year picker (current year - 2 to current year + 6)
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 9 }, (_, i) => currentYear - 1 + i);

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

      {/* Styled Trigger Input */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          setViewMode('DAYS');
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-xs transition-all cursor-pointer shadow-2xs group text-left ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-neutral-100 border-neutral-200'
            : isOpen
            ? 'border-neutral-900 ring-2 ring-neutral-900/10 bg-neutral-50/50'
            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/30'
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              value
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'bg-neutral-100 text-neutral-500 group-hover:text-neutral-900 group-hover:bg-neutral-200'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span
              className={`block truncate font-semibold text-xs ${
                value ? 'text-neutral-900' : 'text-neutral-400 font-normal'
              }`}
            >
              {formatDisplay(value)}
            </span>
            {value && (
              <span className="text-[10px] text-neutral-400 font-mono block">
                {value}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          {value && (
            <span
              role="button"
              title="Clear date"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <span className="text-[10px] font-medium text-neutral-500 group-hover:text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200/80">
            {isOpen ? 'Close' : 'Pick'}
          </span>
        </div>
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-[100] w-80 bg-white border border-neutral-200/90 rounded-2xl shadow-2xl p-4 animate-in fade-in duration-150 backdrop-blur-md ${
            openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ maxWidth: 'calc(100vw - 32px)' }}
        >
          {/* Header: Month/Year navigation & Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'MONTHS' ? 'DAYS' : 'MONTHS')}
                className="px-2.5 py-1 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 text-xs font-bold text-neutral-900 transition-all flex items-center space-x-1 cursor-pointer"
                title="Click to choose month"
              >
                <span>{MONTH_NAMES[viewMonth]}</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'YEARS' ? 'DAYS' : 'YEARS')}
                className="px-2 py-1 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 font-mono text-xs font-semibold text-neutral-700 transition-all flex items-center space-x-1 cursor-pointer"
                title="Click to choose year"
              >
                <span>{viewYear}</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>
            </div>

            {viewMode === 'DAYS' && (
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Shortcuts Bar (Only in DAYS view) */}
          {viewMode === 'DAYS' && (
            <div className="flex items-center space-x-1.5 py-2.5 border-b border-neutral-100 overflow-x-auto no-scrollbar">
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: '+3 Days', days: 3 },
                { label: '+1 Wk', days: 7 },
                { label: '+2 Wks', days: 14 }
              ].map((sc) => {
                const scDate = getShortcutDateStr(sc.days);
                const isSelected = value === scDate;
                return (
                  <button
                    key={sc.label}
                    type="button"
                    onClick={(e) => handleSelectShortcut(sc.days, e)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                      isSelected
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW: Month Picker Modal */}
          {viewMode === 'MONTHS' && (
            <div className="grid grid-cols-3 gap-2 py-3">
              {MONTH_SHORT.map((m, idx) => {
                const isCurrent = viewMonth === idx;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setViewMonth(idx);
                      setViewMode('DAYS');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-neutral-900 text-white shadow-xs font-bold'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW: Year Picker Modal */}
          {viewMode === 'YEARS' && (
            <div className="grid grid-cols-3 gap-2 py-3">
              {yearsList.map((y) => {
                const isCurrent = viewYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setViewYear(y);
                      setViewMode('DAYS');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-neutral-900 text-white shadow-xs font-bold'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW: Normal Day Grid */}
          {viewMode === 'DAYS' && (
            <>
              {/* Day of Week Header */}
              <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center">
                {DAYS_OF_WEEK.map((w, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-bold text-neutral-400 font-mono uppercase tracking-wider"
                  >
                    {w}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Filler days from previous month */}
                {Array.from({ length: firstDayOfMonth }).map((_, idx) => {
                  const dayNum = daysInPrevMonth - firstDayOfMonth + idx + 1;
                  return (
                    <div
                      key={`prev-${idx}`}
                      className="h-8 flex items-center justify-center text-[11px] text-neutral-300 font-mono select-none"
                    >
                      {dayNum}
                    </div>
                  );
                })}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
                    day
                  ).padStart(2, '0')}`;
                  const isSelected = value === dateStr;
                  const isToday = todayStr === dateStr;
                  const isPast = minDate ? dateStr < minDate : false;
                  const isFuture = maxDate ? dateStr > maxDate : false;
                  const isDisabled = isPast || isFuture;

                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      disabled={isDisabled}
                      onClick={(e) => handleSelectDay(day, e)}
                      className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-mono transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-neutral-900 text-white font-bold shadow-md scale-105 ring-1 ring-neutral-900'
                          : isDisabled
                          ? 'text-neutral-300 cursor-not-allowed hover:bg-transparent'
                          : 'hover:bg-neutral-100 text-neutral-800 font-medium active:scale-95'
                      } ${isToday && !isSelected ? 'ring-1.5 ring-neutral-900/30 font-bold text-neutral-900 bg-neutral-50' : ''}`}
                    >
                      <span>{day}</span>
                      {isToday && !isSelected && (
                        <span className="w-1 h-1 bg-emerald-500 rounded-full absolute bottom-1"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer note */}
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <button
              type="button"
              onClick={(e) => handleSelectShortcut(0, e)}
              className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-semibold cursor-pointer transition-colors flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3 text-neutral-500" />
              <span>Jump to Today</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setViewMode('DAYS');
              }}
              className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
