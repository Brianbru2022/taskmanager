/**
 * task-modal-close-hardfix.js — v1.0
 * Guaranteed close for the Manage Task modal (#taskModal).
 * Uses capture-phase listeners and targets the known markup from index.html.
 */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  function closeTaskModal() {
    const modal = $('#taskModal');
    if (!modal) return;
    modal.classList.remove('is-active');
    // in case any inline styles or focus traps were applied elsewhere:
    document.body.style.removeProperty('overflow');
  }

  function onDocClickCapture(e) {
    // If the click is on the × in the task modal header, close it.
    const closeBtn = e.target?.closest?.('#taskModal .close-button');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      closeTaskModal();
      return;
    }
    // If the click is on the backdrop (outside modal-content), close it.
    const modal = e.target?.closest?.('#taskModal.modal');
    if (modal && e.target === modal) {
      e.preventDefault();
      e.stopPropagation();
      closeTaskModal();
    }
  }

  function onKeydownCapture(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      // Only act if the task modal is open
      const open = $('#taskModal.is-active');
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        closeTaskModal();
      }
    }
  }

  function start() {
    // Wire capture-phase so nothing can block it.
    document.addEventListener('click', onDocClickCapture, true);
    document.addEventListener('keydown', onKeydownCapture, true);

    // Also wire the button directly (idempotent)
    const directBtn = $('#taskModal .close-button');
    if (directBtn && !directBtn.__WIRED_TASK_CLOSE__) {
      directBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeTaskModal();
      });
      directBtn.__WIRED_TASK_CLOSE__ = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
