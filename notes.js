
/**
 * Notes Module (standalone, non-invasive)
 * - Works with existing HTML IDs:
 *   #notesView, #notesContainer, #addNoteBtn, #saveNotesBtn, #stat-open-notes
 * - Uses localStorage key: 'notes'
 * - No dependency on other app code; safely coexists if other listeners exist.
 */
(function () {
  // Guard: init once
  if (window.__NOTES_MODULE_INITIALIZED__) return;
  window.__NOTES_MODULE_INITIALIZED__ = true;

  const $ = (id) => document.getElementById(id);
  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // Storage helpers
  const LS_KEY = 'notes';
  const loadNotes = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
  };
  const saveNotes = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr || []));

  // State (kept in-memory but always saved after edits)
  let notes = loadNotes();

  const fmtDate = (iso) => {
    try {
      const d = new Date(iso || Date.now());
      return d.toLocaleString();
    } catch {
      return new Date().toLocaleString();
    }
  };

  const updateDashboardCount = () => {
    const el = $('stat-open-notes');
    if (el) el.textContent = Array.isArray(notes) ? notes.length : 0;
  };

  // Render all notes
  const renderNotes = () => {
    const container = $('notesContainer');
    if (!container) return;

    container.innerHTML = '';
    if (!Array.isArray(notes) || notes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<div class="empty-message">No notes yet. Click <strong>Add New Note</strong> to create one.</div>`;
      container.appendChild(empty);
      updateDashboardCount();
      return;
    }

    notes.forEach((n, idx) => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.dataset.idx = String(idx);
      card.innerHTML = `
        <div class="note-card-header">
          <input class="note-title" value="${(n.title || '').replace(/"/g, '&quot;')}" placeholder="Untitled note" />
          <div class="note-card-actions">
            <button class="archive-note-btn" title="Archive (not implemented)">⧉</button>
            <button class="delete-note-btn" title="Delete">✖</button>
          </div>
        </div>
        <textarea class="note-body" rows="8" placeholder="Write your note...">${(n.body || '')}</textarea>
        <div class="note-meta">Updated: ${fmtDate(n.updatedAt)}</div>
      `;

      // Title/body debounced updates
      const titleEl = qs('.note-title', card);
      const bodyEl  = qs('.note-body', card);

      const commitUpdate = () => {
        const i = parseInt(card.dataset.idx, 10);
        if (Number.isNaN(i) || !notes[i]) return;
        notes[i].title = titleEl.value;
        notes[i].body  = bodyEl.value;
        notes[i].updatedAt = new Date().toISOString();
        saveNotes(notes);
        // Update timestamp text
        const meta = qs('.note-meta', card);
        if (meta) meta.textContent = 'Updated: ' + fmtDate(notes[i].updatedAt);
      };

      let tTimer, bTimer;
      titleEl.addEventListener('input', () => {
        clearTimeout(tTimer);
        tTimer = setTimeout(commitUpdate, 150);
      });
      bodyEl.addEventListener('input', () => {
        clearTimeout(bTimer);
        bTimer = setTimeout(commitUpdate, 200);
      });

      // Delete
      qs('.delete-note-btn', card).addEventListener('click', () => {
        const i = parseInt(card.dataset.idx, 10);
        if (!Number.isInteger(i)) return;
        notes.splice(i, 1);
        saveNotes(notes);
        renderNotes();
        updateDashboardCount();
      });

      container.appendChild(card);
    });

    updateDashboardCount();
  };

  // Public add function
  const addNote = () => {
    notes.unshift({
      id: 'NOTE-' + Date.now(),
      title: 'New note',
      body: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    saveNotes(notes);
    renderNotes();
    updateDashboardCount();
  };

  const saveAll = () => {
    // Inputs already persisted via debounced commit; still trigger save+count
    saveNotes(notes);
    updateDashboardCount();
  };

  // Wire buttons (idempotent)
  const wire = () => {
    const addBtn = $('addNoteBtn');
    const saveBtn = $('saveNotesBtn');
    if (addBtn && !addBtn.__NOTES_WIRED__) {
      addBtn.addEventListener('click', addNote);
      addBtn.__NOTES_WIRED__ = true;
    }
    if (saveBtn && !saveBtn.__NOTES_WIRED__) {
      saveBtn.addEventListener('click', saveAll);
      saveBtn.__NOTES_WIRED__ = true;
    }
  };

  // Re-render when entering the Notes view (works even if another module controls view switching)
  const observeViewChanges = () => {
    const notesView = $('notesView');
    if (!notesView || window.__NOTES_VIEW_OBSERVED__) return;
    window.__NOTES_VIEW_OBSERVED__ = true;

    const onShow = () => {
      const style = getComputedStyle(notesView);
      const isVisible = style.display !== 'none' && notesView.offsetParent !== null;
      if (isVisible) {
        // Ensure we have the latest from storage in case other code saved
        notes = loadNotes();
        renderNotes();
      }
    };

    // Call on load and whenever any attribute changes that might affect display
    onShow();
    const obs = new MutationObserver(onShow);
    obs.observe(notesView, { attributes: true, attributeFilter: ['style', 'class'] });
  };

  // Initialize after DOM is ready
  const start = () => {
    // Ensure container exists before wiring
    wire();
    observeViewChanges();
    // If Notes view is the initial view, render immediately
    const nv = $('notesView');
    if (nv && getComputedStyle(nv).display !== 'none') renderNotes();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  // Expose minimal API for debugging if needed
  window.NotesModule = {
    add: addNote,
    render: renderNotes,
    load: () => (notes = loadNotes(), renderNotes(), notes),
    save: saveAll
  };
})();
