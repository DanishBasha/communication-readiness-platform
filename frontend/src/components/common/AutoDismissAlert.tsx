import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface AutoDismissAlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  durationMs?: number;
  onClose: () => void;
}

export const AutoDismissAlert: React.FC<AutoDismissAlertProps> = ({
  type,
  message,
  durationMs = 5000,
  onClose
}) => {
  const [timeLeftMs, setTimeLeftMs] = useState(durationMs);

  useEffect(() => {
    setTimeLeftMs(durationMs);
    const intervalMs = 50;
    const interval = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= intervalMs) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - intervalMs;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [message, durationMs, onClose]);

  const percentage = Math.max(0, Math.min(100, (timeLeftMs / durationMs) * 100));
  const secondsLeft = Math.max(1, Math.ceil(timeLeftMs / 1000));
  const isSuccess = type === 'success';

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-xs transition-all animate-in fade-in duration-200 ${
      isSuccess
        ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950'
        : type === 'error'
        ? 'bg-rose-50/95 border-rose-300 text-rose-950'
        : 'bg-blue-50/95 border-blue-300 text-blue-950'
    }`}>
      <div className="flex items-center justify-between gap-3 text-xs font-medium">
        <div className="flex items-center space-x-2.5">
          {isSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message}</span>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <span className="text-[11px] font-mono opacity-80 bg-white/60 px-2 py-0.5 rounded-md border border-black/5">
            Closing in {secondsLeft}s
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-black/10 rounded-lg transition-colors cursor-pointer text-inherit"
            title="Dismiss now"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Reverse loading progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
        <div
          className={`h-full transition-all duration-75 ease-linear ${
            isSuccess ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-blue-600'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
