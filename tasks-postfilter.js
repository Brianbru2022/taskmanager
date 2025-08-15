/**
 * tasks-postfilter.js — v1.0
 * Non-invasive, DOM-level filtering & sorting that works alongside your current renderer.
 * - Applies Assignee + Category + Search together (cumulative) after each render.
 * - Re-sorts cards by Due Date based on the Sort select.
 * - Safe to include multiple times; idempotent wiring.
 * - Load AFTER script.js and any sanity/compat helpers.
 */
(() => {
  const $  = (id) => document.getElementById(id);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Parse DD/MM/YYYY into a Date (returns null if invalid)
  function parseUKDate(text) {
    if (!text) return null;
    const m = String(text).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [_, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }

  // Decide if a task card matches the active filters
  function cardMatchesFilters(card, filters) {
    const { assignee, category, q } = filters;

    // Category (label text inside .task-card-category-tag)
    if (category && category !== 'all') {
      const tag = card.querySelector('.task-card-category-tag');
      const tagText = tag?.textContent?.trim() || '';
      if (tagText !== category) return false;
    }

    // Assignee (any .card-assignee-icon title must match)
    if (assignee && assignee !== 'all') {
      const icons = qa('.card-assignee-icon', card);
      const titles = icons.map(i => i.getAttribute('title') || '');
      if (!titles.includes(assignee)) return false;
    }

    // Search (title + description text)
    if (q) {
      const title = card.querySelector('.task-card-title span')?.textContent?.toLowerCase() || '';
      const desc  = card.querySelector('.task-card-description')?.textContent?.toLowerCase() || '';
      if (!title.includes(q) && !desc.includes(q)) return false;
    }

    return true;
  }

  // Sort all task cards within a container by due date
  function sortCardsByDueDate(container, dir = 'newest') {
    const cards = qa('.task-card', container);
    cards.sort((a, b) => {
      const da = parseUKDate(a.querySelector('.task-card-due-date')?.textContent?.replace(/[^\d/]/g, ''));
      const db = parseUKDate(b.querySelector('.task-card-due-date')?.textContent?.replace(/[^\d/]/g, ''));
      const va = da ? da.getTime() : 0;
      const vb = db ? db.getTime() : 0;
      return dir === 'oldest' ? (va - vb) : (vb - va);
    }).forEach(c => container.appendChild(c));
  }

  function applyPostFilters() {
    const board = $('kanbanBoard');
    if (!board) return;

    // Read current UI controls (IDs from your index.html)
    const assignee = $('assigneeFilter')?.value || 'all';
    const category = $('categoryFilter')?.value || 'all';
    const sortBy   = $('sortBy')?.value || 'oldest';
    const q        = ($('globalSearchInput')?.value || '').toLowerCase().trim();

    const filters = { assignee, category, q };

    // For each column, filter and sort its cards
    qa('.kanban-column', board).forEach(col => {
      const list = col.querySelector('.tasks-container');
      if (!list) return;

      // Hide/show by filters (assignee/category/search)
      qa('.task-card', list).forEach(card => {
        card.style.display = cardMatchesFilters(card, filters) ? '' : 'none';
      });

      // Re-sort only the visible ones
      sortCardsByDueDate(list, sortBy);
    });

    // Optional: update the counts in headers to reflect visible cards
    qa('.kanban-column', board).forEach(col => {
      const countEl = col.querySelector('.column-header .task-count');
      if (!countEl) return;
      const visible = qa('.task-card', col).filter(c => c.style.display !== 'none').length;
      countEl.textContent = visible;
    });
  }

  // Debounce small bursts of updates
  const debounce = (fn, ms = 80) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const applyDebounced = debounce(applyPostFilters, 50);

  function wireControls() {
    [
      'assigneeFilter',
      'categoryFilter',
      'sortBy',
      'closedFilter',         // not reimplemented here, but re-render triggers a refresh
    ].forEach(id => {
      const el = $(id);
      if (el && !el.__POSTFILTER__) {
        el.addEventListener('change', () => {
          // If upstream re-render runs, MutationObserver below will re-apply.
          // Apply immediately as well for snappy UX.
          applyDebounced();
        });
        el.__POSTFILTER__ = true;
      }
    });

    const search = $('globalSearchInput');
    if (search && !search.__POSTFILTER__) {
      search.addEventListener('input', applyDebounced);
      search.__POSTFILTER__ = true;
    }
  }

  function observeBoard() {
    const board = $('kanbanBoard');
    if (!board || board.__POSTFILTER_OBS__) return;
    board.__POSTFILTER_OBS__ = true;

    const obs = new MutationObserver(applyDebounced);
    obs.observe(board, { childList: true, subtree: true });
  }

  function start() {
    wireControls();
    observeBoard();
    // First pass
    applyPostFilters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
