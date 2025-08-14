/**
 * tasks-sanity-fix.js — calls renderTasks() when Tasks is opened.
 * Non-invasive: prefers your own switchView(); does nothing if renderTasks isn't defined.
 */
(function () {
  const $ = (id) => document.getElementById(id);

  function openTasks() {
    if (typeof window.switchView === 'function') {
      window.switchView('tasksView');
    }
    // Nudge a render after the view switch
    setTimeout(() => {
      if (typeof window.renderTasks === 'function') {
        try { window.renderTasks(); } catch (e) { console.warn('[TasksFix] renderTasks error:', e); }
      } else {
        // Optional: try your dashboard/refresh function if you use one
        if (typeof window.renderDashboard === 'function') {
          try { window.renderDashboard(); } catch {}
        }
      }
    }, 0);
  }

  function wire() {
    const btn = $('tasksLink');
    if (btn && !btn.__TASKS_FIX__) {
      btn.addEventListener('click', (e) => { e.preventDefault(); openTasks(); });
      btn.__TASKS_FIX__ = true;
      if (btn.tagName === 'A' && (btn.getAttribute('href') || '#') === '#') {
        btn.setAttribute('href', 'javascript:void(0)');
      }
    }
  }

  function start() {
    wire();
    // If the app programmatically selects tasks on load, ensure it renders
    if (location.hash === '#tasks' || document.body.dataset.initialView === 'tasks') {
      openTasks();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
