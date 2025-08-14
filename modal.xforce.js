/**
 * modal-xforce.js — v1.0
 * Guaranteed close for Manage Task modal (#taskModal).
 * Uses capture-phase + multiple input events so no other code can block it.
 */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  function closeTaskModal() {
    const modal = $('#taskModal');
    if (!modal) return;
    modal.classList.remove('is-active');
    document.body.style.removeProperty('overflow'); // in case any focus trap/body lock is active
  }

  // Close on Esc (capture)
  function onKeydown(e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && $('#taskModal.is-active')) {
      e.preventDefault(); e.stopPropagation();
      closeTaskModal();
    }
  }

  // Close when clicking the × or the backdrop (capture)
  function onAnyPointer(e) {
    const target = e.target;

    // 1) × button in header
    const xBtn = target?.closest?.('#taskModal .modal-header .close-button');
    if (xBtn) {
      e.preventDefault(); e.stopPropagation();
      closeTaskModal();
      return;
    }

    // 2) Backdrop (click outside .modal-content)
    const backdrop = target?.closest?.('#taskModal.modal');
    if (backdrop && target === backdrop) {
      e.preventDefault(); e.stopPropagation();
      closeTaskModal();
    }
  }

  function start() {
    // Bind in capture phase for all common input events
    ['click','mousedown','pointerdown','touchstart'].forEach(evt =>
      document.addEventListener(evt, onAnyPointer, true)
    );
    document.addEventListener('keydown', onKeydown, true);

    // Also wire the button directly as a belt-and-braces fallback
    const directBtn = $('#taskModal .modal-header .close-button');
    if (directBtn && !directBtn.__XFORCE__) {
      directBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        closeTaskModal();
      });
      directBtn.__XFORCE__ = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
