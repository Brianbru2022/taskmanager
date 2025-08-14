/**
 * compat-patch.js — non-invasive fixes
 * - Normalises element IDs so existing JS stops crashing
 * - Ensures Tasks renders after switching to Tasks
 * - Keeps Manual showing content
 * - Does NOT override your app logic; it only helps where needed
 */
(function () {
  const $ = (id) => document.getElementById(id);

  // --- A) Normalise IDs expected by your JS ---
  // Tasks filters: your HTML uses sortByDate / closedTasksFilter in places;
  // many code paths expect sortBy / closedFilter. Map them safely.
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

  // --- B) Safe navigation helpers (always call your switchView) ---
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
      ['homeLink', 'homeView'],
      ['tasksLink', 'tasksView'],
      ['notesLink', 'notesView'],
      ['manualLink', 'manualView'],
      ['sitesLink', 'sitesView'],
      ['commercialLink', 'commercialView'],
      ['reportsLink', 'reportsView'],
    ];
    map.forEach(([linkId, viewId]) => {
      const el = $(linkId);
      if (!el || el.__WIRED__) return;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        go(viewId);
        // Nudge renders that some code paths skip
        if (viewId === 'tasksView' && typeof window.renderTasks === 'function') {
          setTimeout(() => { try { window.renderTasks(); } catch (err) { console.warn('[compat] renderTasks error', err); } }, 0);
        }
        if (viewId === 'manualView') {
          // If manual content is empty, ensure there's at least a heading
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

  // Also render Tasks when the view becomes visible by external code
  function observeTasksView() {
    const tv = $('tasksView');
    if (!tv || window.__COMPAT_TASKS_OBS__) return;
    window.__COMPAT_TASKS_OBS__ = true;
    const obs = new MutationObserver(() => {
      const visible = tv.style.display !== 'none';
      if (visible && typeof window.renderTasks === 'function') {
        try { window.renderTasks(); } catch (e) { console.warn('[compat] renderTasks error', e); }
      }
    });
    obs.observe(tv, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  function start() {
    wireSidebar();
    observeTasksView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
