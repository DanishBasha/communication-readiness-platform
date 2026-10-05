import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, Coins, X, ArrowLeft, Play } from 'lucide-react';

export const AbandonSessionModal: React.FC = () => {
  const { 
    abandonWarningOpen, 
    cancelAbandonWarning, 
    confirmAbandonSession, 
    activeView, 
    student 
  } = useApp();

  // Handle keyboard Escape only; do NOT register in modalManager back handler
  // so back gestures and back buttons do not automatically dismiss this warning.
  useEffect(() => {
    if (!abandonWarningOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelAbandonWarning();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [abandonWarningOpen, cancelAbandonWarning]);

  if (!abandonWarningOpen) return null;

  const sessionName = activeView === 'LISTENING_ROOM' 
    ? 'Listening Comprehension Lab' 
    : 'AI Mock Interview';

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={cancelAbandonWarning}
    >
      <div 
        className="bg-white dark:bg-[#171717] border border-neutral-200/90 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={cancelAbandonWarning}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Banner */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-2xs shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/70 border border-amber-200/60 dark:border-amber-900/60 px-2 py-0.5 rounded-md">
              In-Progress Assessment
            </span>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mt-0.5">
              Abandon {sessionName}?
            </h3>
          </div>
        </div>

        {/* Details Callout */}
        <div className="space-y-3">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            You are currently inside an active practice session. If you choose to exit right now, please be aware of the following consequences:
          </p>

          <div className="bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/90 dark:border-amber-900/40 rounded-2xl p-3.5 space-y-2.5 text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-start space-x-2.5">
              <span className="text-base leading-none">🪙</span>
              <div>
                <p className="font-bold text-amber-950 dark:text-amber-200">1 Practice Coin Forfeited</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  1 coin was spent to initiate this assessment. Exiting mid-session abandons the test, and your spent coin cannot be refunded or restored.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
              <span className="text-base leading-none">📉</span>
              <div>
                <p className="font-bold text-amber-950 dark:text-amber-200">Current Progress &amp; Scores Discarded</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  Your spoken audio turns, speech clarity analytics, and partial responses will be discarded without generating a diagnostic report.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <p className="font-bold text-amber-950 dark:text-amber-200">
                  Current Balance: {student?.coins ?? 5} Coins
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  If your coins drop to 0, you must wait for the recharge cooldown or have your institution admin grant credit restoration.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
          Do you really want to exit and abandon this session?
        </p>

        {/* Action Buttons */}
        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={cancelAbandonWarning}
            className="order-2 sm:order-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>No, Stay &amp; Continue Session</span>
          </button>
          
          <button
            type="button"
            onClick={confirmAbandonSession}
            className="order-1 sm:order-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Yes, Exit &amp; Forfeit Coin</span>
          </button>
        </div>

      </div>
    </div>
  );
};
