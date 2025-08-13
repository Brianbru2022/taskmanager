
/**
 * Notes Module (standalone, non-invasive) — with Archiving
 * Works with existing HTML IDs:
 *   #notesView, #notesContainer, #addNoteBtn, #saveNotesBtn, #stat-open-notes
 * Persists to localStorage key: 'notes'
 * Adds a small filter toolbar (Active / Archived / All) above the notes list.
 */
(function () {
  if (window.__NOTES_MODULE_INITIALIZED__) return;
  window.__NOTES_MODULE_INITIALIZED__ = true;

  const $ = (id) => document.getElementById(id);
  const qs = (sel, el = document) => el.querySelector(sel);

  const LS_KEY = 'notes';
  const loadNotes = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
  };
  const saveNotes = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr || []));

  let notes = loadNotes();
  let filterMode = 'active'; // 'active' | 'archived' | 'all'

  const fmtDate = (iso) => {
    try { return new Date(iso || Date.now()).toLocaleString(); }
    catch { return new Date().toLocaleString(); }
  };

  const countActive = () => (Array.isArray(notes) ? notes.filter(n => !n.archived).length : 0);
  const updateDashboardCount = () => {
    const el = $('stat-open-notes');
    if (el) el.textContent = countActive();
  };

  const ensureToolbar = () => {
    const container = $('notesContainer');
    if (!container || $('notesToolbar')) return;
    const bar = document.createElement('div');
    bar.id = 'notesToolbar';
    bar.className = 'notes-toolbar';
    bar.innerHTML = `
      <div class="notes-toolbar-inner">
        <div class="notes-filters" role="tablist" aria-label="Filter notes">
          <button id="filterActive" class="notes-filter active" role="tab" aria-selected="true">Active</button>
          <button id="filterArchived" class="notes-filter" role="tab" aria-selected="false">Archived</button>
          <button id="filterAll" class="notes-filter" role="tab" aria-selected="false">All</button>
        </div>
        <div class="notes-bulk">
          <button id="clearArchivedBtn" class="notes-clear-archived" title="Permanently delete all archived notes">Clear archive</button>
        </div>
      </div>
    `;
    container.parentElement.insertBefore(bar, container);
    // Wire filters
    const setActiveButton = (id) => {
      ['filterActive','filterArchived','filterAll'].forEach(btnId => {
        const b = $(btnId);
        if (!b) return;
        const on = btnId === id;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    };
    const applyFilter = (mode) => {
      filterMode = mode;
      setActiveButton(mode === 'active' ? 'filterActive' : mode === 'archived' ? 'filterArchived' : 'filterAll');
      renderNotes();
    };
    $('filterActive').addEventListener('click', () => applyFilter('active'));
    $('filterArchived').addEventListener('click', () => applyFilter('archived'));
    $('filterAll').addEventListener('click', () => applyFilter('all'));
    // Clear all archived
    $('clearArchivedBtn').addEventListener('click', () => {
      const before = notes.length;
      notes = notes.filter(n => !n.archived);
      if (notes.length !== before) {
        saveNotes(notes);
        renderNotes();
        updateDashboardCount();
      }
    });
  };

  const renderNotes = () => {
    const container = $('notesContainer');
    if (!container) return;
    ensureToolbar();

    // Pick list by filter
    const list = Array.isArray(notes) ? notes.filter(n => {
      if (filterMode === 'active') return !n.archived;
      if (filterMode === 'archived') return !!n.archived;
      return true;
    }) : [];

    container.innerHTML = '';
    if (list.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'empty-state';
      msg.innerHTML = `<div class="empty-message">${
        filterMode === 'archived' ? 'No archived notes.' :
        'No notes yet. Click <strong>Add New Note</strong> to create one.'
      }</div>`;
      container.appendChild(msg);
      updateDashboardCount();
      return;
    }

    list.forEach((n) => {
      const card = document.createElement('div');
      card.className = 'note-card' + (n.archived ? ' is-archived' : '');
      card.dataset.id = n.id;

      const archiveLabel = n.archived ? 'Unarchive' : 'Archive';
      const archiveTitle = n.archived ? 'Move back to active' : 'Move to archive';

      card.innerHTML = `
        <div class="note-card-header">
          <input class="note-title" ${n.archived ? 'disabled' : ''} value="${(n.title || '').replace(/"/g, '&quot;')}" placeholder="Untitled note" />
          <div class="note-card-actions">
            <button class="archive-note-btn" title="${archiveTitle}">${archiveLabel}</button>
            <button class="delete-note-btn" title="Delete">Delete</button>
          </div>
        </div>
        <textarea class="note-body" rows="8" placeholder="Write your note..." ${n.archived ? 'disabled' : ''}>${(n.body || '')}</textarea>
        <div class="note-meta">
          ${n.archived ? `Archived: ${fmtDate(n.archivedAt)}` : `Updated: ${fmtDate(n.updatedAt)}`}
        </div>
      `;

      const titleEl = qs('.note-title', card);
      const bodyEl  = qs('.note-body', card);

      const commitUpdate = () => {
        const id = card.dataset.id;
        const i = notes.findIndex(x => x.id === id);
        if (i === -1) return;
        // Skip edits if archived
        if (notes[i].archived) return;
        notes[i].title = titleEl.value;
        notes[i].body  = bodyEl.value;
        notes[i].updatedAt = new Date().toISOString();
        saveNotes(notes);
        const meta = qs('.note-meta', card);
        if (meta) meta.textContent = 'Updated: ' + fmtDate(notes[i].updatedAt);
      };

      let tTimer, bTimer;
      if (titleEl) titleEl.addEventListener('input', () => { clearTimeout(tTimer); tTimer = setTimeout(commitUpdate, 150); });
      if (bodyEl)  bodyEl.addEventListener('input',  () => { clearTimeout(bTimer); bTimer = setTimeout(commitUpdate, 200); });

      // Archive/Unarchive
      qs('.archive-note-btn', card).addEventListener('click', () => {
        const id = card.dataset.id;
        const i = notes.findIndex(x => x.id === id);
        if (i === -1) return;
        notes[i].archived = !notes[i].archived;
        if (notes[i].archived) {
          notes[i].archivedAt = new Date().toISOString();
        } else {
          delete notes[i].archivedAt;
          notes[i].updatedAt = new Date().toISOString();
        }
        saveNotes(notes);
        renderNotes();
        updateDashboardCount();
      });

      // Delete (permanent)
      qs('.delete-note-btn', card).addEventListener('click', () => {
        const id = card.dataset.id;
        const i = notes.findIndex(x => x.id === id);
        if (i === -1) return;
        notes.splice(i, 1);
        saveNotes(notes);
        renderNotes();
        updateDashboardCount();
      });

      container.appendChild(card);
    });

    updateDashboardCount();
  };

  const addNote = () => {
    const n = {
      id: 'NOTE-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
      title: 'New note',
      body: '',
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    notes.unshift(n);
    saveNotes(notes);
    // If user is viewing archived-only, switch to active so the new note shows
    if (filterMode === 'archived') filterMode = 'active';
    renderNotes();
    updateDashboardCount();
  };

  const saveAll = () => {
    // All changes are saved as-you-type; this ensures dashboard count stays fresh
    saveNotes(notes);
    updateDashboardCount();
  };

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

  const observeViewChanges = () => {
    const notesView = $('notesView');
    if (!notesView || window.__NOTES_VIEW_OBSERVED__) return;
    window.__NOTES_VIEW_OBSERVED__ = true;

    const onShow = () => {
      const style = getComputedStyle(notesView);
      const isVisible = style.display !== 'none' && notesView.offsetParent !== null;
      if (isVisible) {
        notes = loadNotes();
        renderNotes();
      }
    };
    onShow();
    const obs = new MutationObserver(onShow);
    obs.observe(notesView, { attributes: true, attributeFilter: ['style', 'class'] });
  };

  const start = () => {
    wire();
    observeViewChanges();
    const nv = $('notesView');
    if (nv && getComputedStyle(nv).display !== 'none') renderNotes();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  // Optional API for debugging
  window.NotesModule = {
    add: addNote,
    render: renderNotes,
    load: () => (notes = loadNotes(), renderNotes(), notes),
    save: saveAll,
    filter: (mode) => { filterMode = mode; renderNotes(); }
  };
})();
