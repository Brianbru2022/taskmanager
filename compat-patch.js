/**
 * compat-patch.js — v1.4 (non-invasive, idempotent)
 * - Normalises legacy IDs expected by script.js
 * - Wires sidebar links to your switchView()
 * - Re-renders Tasks when Tasks view becomes visible
 * - NEW: Delegated modal closing (× button, backdrop, and Esc) in capture phase
 *   so it always works regardless of other handlers.
 */
(function () {
  const $  = (id) => document.getElementById(id);

  // --- A) Normalise IDs some code paths expect (safe, only if "toId" not present) ---
  (function normalizeTaskFilterIds() {
    const idPairs = [
      ['sortByDate', 'sortBy'],
      ['closedTasksFilter', 'closedFilter'],
    ];
    idPairs.forEach(([fromId, toId]) => {
      const from = $(fromId);
      if (from && !$(toId)) from.id = toId;
    });
  })();

  // --- B) Safe navigation helper: always call your app's switchView() if present ---
  function go(viewId) {
    if (typeof window.switchView === 'function') {
      window.switchView(viewId);
    } else {
      console.warn('[compat] switchView() not found for', viewId);
    }
  }

  // Wire sidebar links (idempotent)
  function wireSidebar() {
    const map = [
      ['homeLink',      'homeView'],
      ['tasksLink',     'tasksView'],
      ['notesLink',     'notesView'],
      ['manualLink',    'manualView'],
      ['sitesLink',     'sitesView'],
      ['commercialLink','commercialView'],
      ['reportsLink',   'reportsView'],
    ];
    map.forEach(([linkId, viewId]) => {
      const el = $(linkId);
      if (!el || el.__WIRED__) return;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        go(viewId);
        // If we just navigated to Tasks, nudge a render if available
        if (viewId === 'tasksView' && typeof window.renderTasks === 'function') {
          setTimeout(() => { try { window.renderTasks(); } catch (err) { console.warn('[compat] renderTasks error', err); } }, 0);
        }
        // Ensure Manual has something visible
        if (viewId === 'manualView') {
          const mc = document.getElementById('manualContent') || document.getElementById('manualBody');
          if (mc && mc.children.length === 0 && mc.textContent.trim() === '') {
            mc.innerHTML = '<p style="opacity:.8">User Manual content will appear here.</p>';
          }
        }
      });
      el.__WIRED__ = true;
      if (el.tagName === 'A' && (el.getAttribute('href') || '#') === '#') {
        el.setAttribute('href', 'javascript:void(0)');
      }
    });
  }

  // --- C) Re-render when Tasks view becomes visible (covers some nav paths) ---
  function observeTasksView() {
    const tv = $('tasksView');
    if (!tv || window.__COMPAT_TASKS_OBS__) return;
    window.__COMPAT_TASKS_OBS__ = true;
    const obs = new MutationObserver(() => {
      const visible = tv.style.display !== 'none' && !tv.classList.contains('hidden');
      if (visible && typeof window.renderTasks === 'function') {
        try { window.renderTasks(); } catch (e) { console.warn('[compat] renderTasks error', e); }
      }
    });
    obs.observe(tv, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  // --- D) Robust modal closing (capture-phase delegation) ---
  function wireModalClosing() {
    if (document.__COMPAT_MODAL_CLOSE_WIRED__) return;
    document.__COMPAT_MODAL_CLOSE_WIRED__ = true;

    // 1) Clicks on × close buttons (capture): close nearest .modal
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.modal .close-button');
      if (!btn) return;
      const modal = btn.closest('.modal');
      if (modal) {
        modal.classList.remove('is-active');
        // prevent any later bubbling listeners from re-opening / blocking
        e.stopPropagation();
        e.preventDefault();
      }
    }, true); // capture

    // 2) Clicks on modal backdrop (outside .modal-content)
    document.addEventListener('click', (e) => {
      const modal = e.target && e.target.classList && e.target.classList.contains('modal') ? e.target : null;
      if (!modal) return;
      modal.classList.remove('is-active');
    }, true); // capture

    // 3) Escape key closes the top-most open modal
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const active = document.querySelector('.modal.is-active');
      if (active) {
        active.classList.remove('is-active');
        e.stopPropagation();
        e.preventDefault();
      }
    }, true); // capture
  }

  function start() {
    wireSidebar();
    observeTasksView();
    wireModalClosing();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
