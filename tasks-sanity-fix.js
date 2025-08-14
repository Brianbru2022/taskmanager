/**
 * tasks-sanity-fix.js — v2.0
 * Non-invasive wiring for Task filters/sort/search + modal closing UX.
 * - Assumes script.js defines renderKanbanBoard() and uses .modal/.close-button pattern.
 * - Safe to include multiple times; handlers are idempotent.
 * - Requires being loaded AFTER script.js.
 */
(() => {
  const $  = (id) => document.getElementById(id);
  const qa = (sel) => Array.from(document.querySelectorAll(sel));

  // Debounce helper
  const debounce = (fn, ms = 150) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  function safeRender() {
    try {
      if (typeof window.renderKanbanBoard === 'function') {
        window.renderKanbanBoard();
      } else if (typeof window.renderTasks === 'function') {
        window.renderTasks();
      }
    } catch (err) {
      console.warn('[tasks-sanity-fix] render error:', err);
    }
  }

  // Expose a stable entry point for other helpers (sidebar, compat files, etc.)
  if (!window.renderTasks && typeof window.renderKanbanBoard === 'function') {
    window.renderTasks = window.renderKanbanBoard;
  }

  function wireFilters() {
    const assigneeFilter = $('assigneeFilter');
    const categoryFilter = $('categoryFilter');
    const sortBy         = $('sortBy') || $('sortByDate');          // tolerate older id
    const closedFilter   = $('closedFilter') || $('closedTasksFilter');
    const searchInput    = $('globalSearchInput');

    // Avoid double-wiring
    const mark = (el, prop='__WIRED__') => (el && !el[prop] && (el[prop] = true));

    if (assigneeFilter && mark(assigneeFilter)) assigneeFilter.addEventListener('change', safeRender);
    if (categoryFilter && mark(categoryFilter)) categoryFilter.addEventListener('change', safeRender);
    if (sortBy && mark(sortBy))                 sortBy.addEventListener('change', safeRender);
    if (closedFilter && mark(closedFilter))     closedFilter.addEventListener('change', safeRender);
    if (searchInput && mark(searchInput))       searchInput.addEventListener('input', debounce(safeRender, 150));
  }

  function wireModalClose() {
    // Close on ×
    qa('.modal .close-button').forEach(btn => {
      if (btn.__WIRED__) return;
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) modal.classList.remove('is-active');
      });
      btn.__WIRED__ = true;
    });

    // Close on backdrop click
    qa('.modal').forEach(modal => {
      if (modal.__BACKDROP_WIRED__) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('is-active');
      });
      modal.__BACKDROP_WIRED__ = true;
    });

    // Close top-most modal on Esc
    if (!document.__ESC_WIRED__) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const active = document.querySelector('.modal.is-active');
          if (active) active.classList.remove('is-active');
        }
      });
      document.__ESC_WIRED__ = true;
    }
  }

  function reRenderWhenTasksShown() {
    const tv = $('tasksView');
    if (!tv || tv.__VIS_OBS__) return;
    tv.__VIS_OBS__ = true;

    const obs = new MutationObserver(() => {
      const visible = tv.style.display !== 'none' && !tv.classList.contains('hidden');
      if (visible) safeRender();
    });
    obs.observe(tv, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  function start() {
    wireFilters();
    wireModalClose();
    reRenderWhenTasksShown();

    // First pass render if Tasks is already visible
    const tv = $('tasksView');
    if (tv && tv.style.display !== 'none' && !tv.classList.contains('hidden')) {
      safeRender();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
