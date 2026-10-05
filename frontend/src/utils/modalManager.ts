/**
 * Centralized modal stack manager for robust back-navigation & gesture handling.
 * 
 * Tracks all currently open modals, dialogs, drawers, and overlays in LatchUp.
 * When a back action (trackpad swipe, browser back button, Escape key, or mouse back)
 * is triggered, the topmost modal is safely dismissed first before any view navigation occurs.
 */

type ModalCloseHandler = () => void;

interface ModalEntry {
  id: string;
  onClose: ModalCloseHandler;
}

const modalStack: ModalEntry[] = [];

/**
 * Register a modal when opened. Returns an unregister cleanup function.
 */
export const registerModalHandler = (id: string, onClose: ModalCloseHandler): (() => void) => {
  const existingIdx = modalStack.findIndex((m) => m.id === id);
  if (existingIdx !== -1) {
    modalStack[existingIdx].onClose = onClose;
  } else {
    modalStack.push({ id, onClose });
  }

  return () => {
    const idx = modalStack.findIndex((m) => m.id === id);
    if (idx !== -1) {
      modalStack.splice(idx, 1);
    }
  };
};

/**
 * Check if at least one modal/overlay is currently active.
 */
export const hasOpenModals = (): boolean => modalStack.length > 0;

/**
 * Dismiss the topmost active modal.
 * Returns true if a modal was found and closed, false if the stack was empty.
 */
export const closeTopModal = (): boolean => {
  if (modalStack.length > 0) {
    const top = modalStack.pop();
    if (top) {
      try {
        top.onClose();
        return true;
      } catch (err) {
        console.warn('Error closing top modal:', err);
      }
    }
  }
  return false;
};

/**
 * Clear the modal stack (e.g., during full view resets or session terminations).
 */
export const clearAllModals = (): void => {
  modalStack.length = 0;
};
