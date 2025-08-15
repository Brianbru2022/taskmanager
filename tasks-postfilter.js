/**
 * tasks-postfilter.js — v1.1
 * DOM-level filtering & sorting that runs AFTER your renderer, without loops.
 * - Prevents MutationObserver self-trigger loops via a reentrancy lock.
 * - Applies Assignee + Category + Search together (cumulative).
 * - Re-sorts visible cards by Due Date per the Sort select.
 * - Idempotent wiring. Load AFTER script.js (+ any sanity/compat files).
 */
(() => {
  const $  = (id) => document.getElementById(id);
  const qa = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));

  // ---- Helpers ----
  function parseUKDate(text) {
    if (!text) return null;
    const m = String(text).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [, dd, mm, yyyy] = m;
    const d = new Date(+yyyy, +mm - 1, +dd);
    return isNaN(d) ? null : d;
  }

  function getControls() {
    const assignee = $('assigneeFilter')?.value || 'all';
    const category = $('categoryFilter')?.value || 'all';
    const sortBy   = $('sortBy')?.value || 'oldest';
    const q        = ($('globalSearchInput')?.value || '').trim().toLowerCase();
    return { assignee, category, sortBy, q };
  }

  function cardMatchesFilters(card, { assignee, category, q }) {
    // Category
    if (category && category !== 'all') {
      const tagText = card.querySelector('.task-card-category-tag')?.textContent?.trim() || '';
      if (tagText !== category) return false;
    }
    // Assignee (any icon title)
    if (assignee && assignee !== 'all') {
      const titles = qa('.card-assignee-icon', card).map(i => i.getAttribute('title') || '');
      if (!titles.includes(assignee)) return false;
    }
    // Search (title + description)
    if (q) {
      const title = card.querySelector('.task-card-title span')?.textContent?.toLowerCase() || '';
      const desc  = card.querySelector('.task-card-description')?.textContent?.toLowerCase() || '';
      if (!title.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  }

  function sortVisibleCardsByDueDate(container, dir) {
    const cards = qa('.task-card', container).filter(c => c.style.display !== 'none');
    if (cards.length < 2) return;

    // Build array with dates to avoid repeated DOM reads
    const items = cards.map(c => {
      const txt = c.querySelector('.task-card-due-date')?.textContent || '';
      const dateStr = txt.replace(/[^\d/]/g, ''); // keep DD/MM/YYYY
      const d = parseUKDate(dateStr);
      return { node: c, ts: d ? d.getTime() : 0 };
    });

    items.sort((a, b) => (dir === 'oldest' ? a.ts - b.ts : b.ts - a.ts));

    // Re-append only if order changed
    let changed = false;
    items.forEach(({ node }, idx) => {
      if (container.children[idx] !== node) {
        changed = true;
        container.appendChild(node);
      }
    });
    return changed;
  }

  // ---- Core Post-Filter ----
  let LOCK = false;

  function applyPostFilters() {
    if (LOCK) return;

    const board = $('kanbanBoard');
    if (!board) return;

    const controls = getControls();
    const anyFilterActive =
      controls.assignee !== 'all' ||
      controls.category !== 'all' ||
      !!controls.q;

    // Nothing to do? Still ensure counts match current visibility.
    if (!anyFilterActive && controls.sortBy === 'oldest') {
      updateCounts(board);
      return;
    }

    LOCK = true; // prevent our own DOM edits from re-triggering loop
    try {
      qa('.kanban-column', board).forEach(col => {
        const list = col.querySelector('.tasks-container');
        if (!list) return;

        // Filter visibility
        qa('.task-card', list).forEach(card => {
          const show = anyFilterActive ? cardMatchesFilters(card, controls) : true;
          const cur  = card.style.display !== 'none';
          if (show !== cur) card.style.display = show ? '' : 'none';
        });

        // Sort visible cards
        sortVisibleCardsByDueDate(list, controls.sortBy);
      });

      updateCounts(board);
    } finally {
      // Release on next tick to coalesce micro-mutations (icons, widths)
      setTimeout(() => { LOCK = false; }, 0);
    }
  }

  function updateCounts(board) {
    qa('.kanban-column', board).forEach(col => {
      const countEl = col.querySelector('.column-header .task-count');
      if (!countEl) return;
      const visible = qa('.task-card', col).filter(c => c.style.display !== 'none').length;
      if (countEl.textContent !== String(visible)) countEl.textContent = visible;
    });
  }

  // ---- Wiring ----
  const debounce = (fn, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const applyDebounced = debounce(applyPostFilters, 80);

  function wireControls() {
    const ids = ['assigneeFilter', 'categoryFilter', 'sortBy', 'closedFilter'];
    ids.forEach(id => {
      const el = $(id);
      if (el && !el.__POSTFILTER__) {
        el.addEventListener('change', applyDebounced);
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

    const obs = new MutationObserver(() => {
      if (!LOCK) applyDebounced();
    });
    // Listen to structure changes; our LOCK prevents feedback loops
    obs.observe(board, { childList: true, subtree: true });
  }

  function start() {
    wireControls();
    observeBoard();
    // First pass once your renderer paints the board
    setTimeout(applyPostFilters, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
