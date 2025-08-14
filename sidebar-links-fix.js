/**
 * sidebar-links-fix.js — v1.1 (SAFE)
 * Keeps sidebar links working without interfering with rendering.
 * This ONLY calls window.switchView(viewId). No manual DOM show/hide.
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

  // Wire known links once (idempotent)
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

      // Avoid hash-jumps if these are <a href="#">
      if (el.tagName === 'A' && (el.getAttribute('href') || '#') === '#') {
        el.setAttribute('href', 'javascript:void(0)');
      }
    }
  }

  // Delegated support for any element using data-view="..."
  function wireDelegated() {
    if (document.__SIDEBAR_DELEGATED_SAFE__) return;
    document.__SIDEBAR_DELEGATED_SAFE__ = true;

    document.addEventListener('click', (e) => {
      const t = e.target && e.target.closest ? e.target.closest('[data-view]') : null;
      if (!t) return;
      const viewId = t.getAttribute('data-view');
      if (!viewId) return;
      e.preventDefault();
      go(viewId);
    });
  }

  // If your sidebar gets re-rendered, re-wire the direct listeners
  function observeSidebar() {
    const sidebar = document.querySelector('#sidebar, .sidebar, nav[role="navigation"]') || document.body;
    const obs = new MutationObserver(wireDirect);
    obs.observe(sidebar, { childList: true, subtree: true });
  }

  function start() {
    wireDirect();
    wireDelegated();
    observeSidebar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
