/**
 * sidebar-links-fix.js — v1.2 (SAFE)
 * ONLY calls window.switchView(viewId). No manual show/hide.
 * Keeps sidebar links working across re-renders.
 */
(function () {
  const $  = (id) => document.getElementById(id);

  function go(viewId) {
    if (typeof window.switchView === 'function') {
      window.switchView(viewId);
    } else {
      console.warn('[SidebarFix] switchView() not found; no-op for', viewId);
    }
  }

  function wireDirect() {
    const map = [
      ['homeLink',      'homeView'],
      ['tasksLink',     'tasksView'],
      ['notesLink',     'notesView'],
      ['manualLink',    'manualView'],
      ['sitesLink',     'sitesView'],
      ['commercialLink','commercialView'],
      ['reportsLink',   'reportsView'],
    ];
    for (const [linkId, viewId] of map) {
      const el = $(linkId);
      if (!el || el.__WIRED__) continue;
      el.addEventListener('click', (e) => { e.preventDefault(); go(viewId); });
      el.__WIRED__ = true;
      if (el.tagName === 'A' && (el.getAttribute('href') || '#') === '#') {
        el.setAttribute('href', 'javascript:void(0)');
      }
    }
  }

  function wireDelegated() {
    if (document.__SIDEBAR_DELEGATED_SAFE__) return;
    document.__SIDEBAR_DELEGATED_SAFE__ = true;
    document.addEventListener('click', (e) => {
      const t = e.target?.closest?.('[data-view]'); if (!t) return;
      const viewId = t.getAttribute('data-view'); if (!viewId) return;
      e.preventDefault(); go(viewId);
    });
  }

  function observeSidebar() {
    const sidebar = document.querySelector('#sidebar, .sidebar, nav[role="navigation"]') || document.body;
    new MutationObserver(wireDirect).observe(sidebar, { childList: true, subtree: true });
  }

  function start() { wireDirect(); wireDelegated(); observeSidebar(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
