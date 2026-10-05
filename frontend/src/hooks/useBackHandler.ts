import { useEffect, useRef, useId } from 'react';
import { registerModalHandler } from '../utils/modalManager';

/**
 * Hook to handle back navigation (trackpad swipe gesture, browser back button, Escape key, or back clicks)
 * to safely close open modals/dialogs instead of navigating away or disrupting the user.
 *
 * Automatically registers the modal into the centralized modalManager stack while `isOpen` is true.
 * Fully compatible with React 18 StrictMode, fast unmounts, and nested modal trees.
 *
 * @param isOpen Whether the modal/overlay is currently active.
 * @param onClose Callback to close the modal.
 */
export const useBackHandler = (isOpen: boolean, onClose: () => void) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const modalId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const unregister = registerModalHandler(modalId, () => {
      onCloseRef.current();
    });

    return () => {
      unregister();
    };
  }, [isOpen, modalId]);
};
