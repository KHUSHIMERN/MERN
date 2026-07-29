import { useEffect, useRef } from 'react';

/**
 * Custom React hook for trapping keyboard focus inside a modal, dialog, or mobile menu container,
 * and restoring focus to the triggering opener element upon closing.
 *
 * @param {boolean} isOpen - Whether the target modal/menu container is currently open
 * @param {Function} onClose - Callback function to invoke when Escape key is pressed
 * @returns {React.RefObject} containerRef - Attach this ref to the modal/menu container div
 */
export function useFocusTrap(isOpen, onClose) {
  const containerRef = useRef(null);
  const triggerElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save active element that opened the modal or menu
    triggerElementRef.current = document.activeElement;

    // Focus the first interactive control inside container
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const focusableSelector =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const firstFocusable = containerRef.current.querySelector(focusableSelector);
        if (firstFocusable && typeof firstFocusable.focus === 'function') {
          firstFocusable.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusables = Array.from(
          containerRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to opener element upon closing
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        triggerElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return containerRef;
}

export default useFocusTrap;
