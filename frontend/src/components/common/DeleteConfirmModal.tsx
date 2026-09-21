import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  title: string;
  userName: string;
  userRole: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  title,
  userName,
  userRole,
  onConfirm,
  onCancel,
  isDeleting = false
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-neutral-200">
        
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button 
            onClick={onCancel}
            disabled={isDeleting}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold text-neutral-900">{title}</h3>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Are you sure you want to permanently remove <strong className="text-neutral-900">{userName}</strong> ({userRole})?
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
            <p className="font-semibold">⚠️ Irreversible Institutional Action</p>
            <p className="text-rose-700">
              All linked credentials, criteria checklists, interview session audio turns, and diagnostic scorecards will be permanently erased.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 pt-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-xl transition-colors shadow-xs flex items-center justify-center space-x-1.5"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Removal</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
