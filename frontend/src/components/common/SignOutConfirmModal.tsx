import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { LogOut, X } from 'lucide-react';

export const SignOutConfirmModal: React.FC = () => {
  const { confirmSignOutOpen, cancelSignOut, confirmSignOut } = useApp();

  // Handle keyboard Escape only; do NOT register in modalManager back handler
  // so back gestures and back buttons do not automatically dismiss this prompt.
  useEffect(() => {
    if (!confirmSignOutOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelSignOut();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmSignOutOpen, cancelSignOut]);

  if (!confirmSignOutOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={cancelSignOut}
    >
      <div 
        className="bg-white border border-neutral-200/90 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={cancelSignOut}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-2xs">
          <LogOut className="w-5 h-5" />
        </div>

        <div>
          <h3 className="text-base font-bold text-neutral-900 tracking-tight">
            Are you sure you want to sign out?
          </h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Your active session will be ended and you will be returned to the LatchUp landing screen.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={cancelSignOut}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
          >
            No, Stay Signed In
          </button>
          <button
            type="button"
            onClick={confirmSignOut}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Yes, Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
