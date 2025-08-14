
/**
 * sidebar-links-fix.js
 * Keeps Notes & Manual icons working across re-renders.
 * IDs supported:
 *   #notesLink  -> #notesView
 *   #manualLink -> #manualView
 * Also supports [data-view="..."] links.
 */
(function () {
  const $  = (id) => document.getElementById(id);
  const qs = (sel, el=document) => el.querySelector(sel);

  function getViewEl(viewId) { return viewId ? document.getElementById(viewId) : null; }

  function go(viewId) {
    if (typeof window.switchView === 'function') {
      try { window.switchView(viewId); return; } catch (e) {}
    }
    const targets = ['homeView','tasksView','notesView','manualView','sitesView','commercialView','reportsView'];
    targets.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (id === viewId ? '' : 'none');
    });
    const headingMap = {
      homeView:'Dashboard', tasksView:'Tasks', notesView:'My Notes',
      manualView:'Manual', sitesView:'Sites', commercialView:'Commercial', reportsView:'Reports'
    };
    const h = document.getElementById('pageTitle');
    if (h && headingMap[viewId]) h.textContent = headingMap[viewId];
  }

  function sanitizeAnchor(el) {
    if (!el) return;
    if (el.tagName === 'A' && (el.getAttribute('href') || '#') === '#') {
      el.setAttribute('href', 'javascript:void(0)');
    }
  }

  function wireDirect() {
    const notes = $('notesLink');
    const manual = $('manualLink');

    if (notes && !notes.__WIRED__) {
      notes.addEventListener('click', (e) => {
        e.preventDefault();
        if (!getViewEl('notesView')) { console.warn('[SidebarFix] #notesView not found'); return; }
        go('notesView');
      });
      notes.__WIRED__ = true;
      sanitizeAnchor(notes);
    }

    if (manual && !manual.__WIRED__) {
      manual.addEventListener('click', (e) => {
        e.preventDefault();
        if (!getViewEl('manualView')) { console.warn('[SidebarFix] #manualView not found'); return; }
        go('manualView');
      });
      manual.__WIRED__ = true;
      sanitizeAnchor(manual);
    }
  }

  function wireDelegated() {
    if (document.__SIDEBAR_DELEGATED__) return;
    document.__SIDEBAR_DELEGATED__ = true;
    document.addEventListener('click', (e) => {
      const t = e.target && e.target.closest
        ? e.target.closest('#notesLink, #manualLink, [data-view]')
        : null;
      if (!t) return;

      let viewId = null;
      if (t.id === 'notesLink')  viewId = 'notesView';
      if (t.id === 'manualLink') viewId = 'manualView';
      if (!viewId && t.hasAttribute && t.hasAttribute('data-view')) viewId = t.getAttribute('data-view');

      if (!viewId) return;
      const v = getViewEl(viewId);
      if (!v) { console.warn('[SidebarFix] view not found:', viewId); return; }

      e.preventDefault();
      go(viewId);
    });
  }

  function observeSidebar() {
    const sidebar = qs('#sidebar, .sidebar, nav[role="navigation"]') || document.body;
    const obs = new MutationObserver(() => wireDirect());
    obs.observe(sidebar, { childList: true, subtree: true });
  }

  function start() {
    wireDirect();
    wireDelegated();
    observeSidebar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();
