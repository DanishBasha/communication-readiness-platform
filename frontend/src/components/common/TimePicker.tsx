import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Clock, Check, ChevronUp, ChevronDown, Sparkles, X } from 'lucide-react';

export interface TimePickerProps {
  value: string; // HH:mm in 24-hour format e.g. "09:00", "17:30"
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  required?: boolean;
  disabled?: boolean;
}

const COMMON_PRESETS = [
  { label: '09:00 AM', time: '09:00' },
  { label: '10:00 AM', time: '10:00' },
  { label: '11:30 AM', time: '11:30' },
  { label: '02:00 PM', time: '14:00' },
  { label: '04:00 PM', time: '16:00' },
  { label: '05:00 PM', time: '17:00' },
  { label: '06:30 PM', time: '18:30' },
  { label: '11:59 PM (EOD)', time: '23:59' },
];

const MINUTE_STEPS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select time',
  className = '',
  align = 'left',
  required = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse HH:mm to 12-hour components
  const parseTime = (valStr: string) => {
    if (!valStr || !valStr.includes(':')) {
      return { hour12: 9, minutes: 0, period: 'AM' as 'AM' | 'PM', rawHour: 9 };
    }
    const [hStr, mStr] = valStr.split(':');
    const rawH = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const validH = isNaN(rawH) ? 9 : Math.min(23, Math.max(0, rawH));
    const validM = isNaN(m) ? 0 : Math.min(59, Math.max(0, m));

    const period: 'AM' | 'PM' = validH >= 12 ? 'PM' : 'AM';
    let hour12 = validH % 12;
    if (hour12 === 0) hour12 = 12;

    return { hour12, minutes: validM, period, rawHour: validH };
  };

  const { hour12, minutes, period } = parseTime(value || '09:00');

  // Convert 12-hour components back to HH:mm (24-hour)
  const format24 = (h12: number, min: number, prd: 'AM' | 'PM') => {
    let h24 = h12;
    if (prd === 'PM' && h12 < 12) h24 += 12;
    if (prd === 'AM' && h12 === 12) h24 = 0;
    const hh = String(h24).padStart(2, '0');
    const mm = String(min).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Human-readable 12-hour format: e.g. "09:30 AM"
  const format12Display = (valStr: string) => {
    if (!valStr) return placeholder;
    const { hour12: h, minutes: m, period: p } = parseTime(valStr);
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm} ${p}`;
  };

  // Auto-flip popover if near viewport bottom
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
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleHourSelect = (newH12: number) => {
    const nextVal = format24(newH12, minutes, period);
    onChange(nextVal);
  };

  const handleMinuteSelect = (newMin: number) => {
    const nextVal = format24(hour12, newMin, period);
    onChange(nextVal);
  };

  const handlePeriodToggle = (newPrd: 'AM' | 'PM') => {
    if (newPrd === period) return;
    const nextVal = format24(hour12, minutes, newPrd);
    onChange(nextVal);
  };

  const handlePresetSelect = (presetTime: string) => {
    onChange(presetTime);
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const curH = now.getHours();
    const curM = Math.floor(now.getMinutes() / 5) * 5;
    const hh = String(curH).padStart(2, '0');
    const mm = String(curM).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  const handleIncrementMinutes = (delta: number) => {
    let totalM = hour12 * 60 + minutes + delta;
    if (period === 'PM' && hour12 < 12) totalM += 12 * 60;
    if (period === 'AM' && hour12 === 12) totalM -= 12 * 60;

    // Wrap around 24 hours (1440 mins)
    totalM = (totalM + 1440) % 1440;
    const newH24 = Math.floor(totalM / 60);
    const newM = totalM % 60;
    const hh = String(newH24).padStart(2, '0');
    const mm = String(newM).padStart(2, '0');
    onChange(`${hh}:${mm}`);
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

      {/* Styled Trigger Button */}
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
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              value
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'bg-neutral-100 text-neutral-500 group-hover:text-neutral-900 group-hover:bg-neutral-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span
              className={`block truncate font-semibold text-xs ${
                value ? 'text-neutral-900' : 'text-neutral-400 font-normal'
              }`}
            >
              {format12Display(value)}
            </span>
            {value && (
              <span className="text-[10px] text-neutral-400 font-mono block">
                {value} hrs (24h)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          {value && (
            <span
              role="button"
              title="Clear time"
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
            {isOpen ? 'Close' : 'Set'}
          </span>
        </div>
      </button>

      {/* Time Picker Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-[100] w-84 bg-white border border-neutral-200/90 rounded-2xl shadow-2xl p-4 animate-in fade-in duration-150 backdrop-blur-md ${
            openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ maxWidth: 'calc(100vw - 32px)' }}
        >
          {/* Header Time Display with AM/PM toggle */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold font-mono text-neutral-900 tracking-tight">
                {String(hour12).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
              </span>
              <span className="text-xs font-bold text-neutral-500 uppercase">
                {period}
              </span>
            </div>

            {/* AM / PM Segmented Switch */}
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handlePeriodToggle('AM')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  period === 'AM'
                    ? 'bg-neutral-900 text-white shadow-2xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => handlePeriodToggle('PM')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  period === 'PM'
                    ? 'bg-neutral-900 text-white shadow-2xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="py-2.5 border-b border-neutral-100">
            <span className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Popular Times
            </span>
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
              {COMMON_PRESETS.map((preset) => {
                const isSelected = value === preset.time;
                return (
                  <button
                    key={preset.time}
                    type="button"
                    onClick={() => handlePresetSelect(preset.time)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                      isSelected
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hours Grid (1 to 12) */}
          <div className="py-2.5 border-b border-neutral-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Select Hour
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                {String(hour12).padStart(2, '0')} {period}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5 text-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                const isSelected = hour12 === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHourSelect(h)}
                    className={`py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white font-bold shadow-xs scale-105 ring-1 ring-neutral-900'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minutes Grid (in 5-min intervals) */}
          <div className="py-2.5 border-b border-neutral-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Select Minutes
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handleIncrementMinutes(-1)}
                  className="px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[10px] font-mono font-semibold cursor-pointer"
                  title="Minus 1 minute"
                >
                  -1m
                </button>
                <button
                  type="button"
                  onClick={() => handleIncrementMinutes(1)}
                  className="px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[10px] font-mono font-semibold cursor-pointer"
                  title="Plus 1 minute"
                >
                  +1m
                </button>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-1.5 text-center">
              {MINUTE_STEPS.map((mStr) => {
                const mNum = parseInt(mStr, 10);
                const isSelected = minutes === mNum;
                return (
                  <button
                    key={mStr}
                    type="button"
                    onClick={() => handleMinuteSelect(mNum)}
                    className={`py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white font-bold shadow-xs scale-105 ring-1 ring-neutral-900'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    :{mStr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer with Now & Done */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
            <button
              type="button"
              onClick={handleSetCurrentTime}
              className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium cursor-pointer transition-colors flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3 text-neutral-600" />
              <span>Set to Now</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
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
