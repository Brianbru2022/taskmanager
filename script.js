(() => {
    // --- STATE MANAGEMENT ---
    let tasks = []; let categories = {}; let people = {}; let passwords = {}; let websites = {};
    let activeAssigneeSelect = null; let expandedSubtasks = new Set();
    const KANBAN_STATUSES = ['Open', 'In Progress', 'Closed'];
    const SUBTASK_COLORS = ['subtask-color-1', 'subtask-color-2', 'subtask-color-3', 'subtask-color-4', 'subtask-color-5'];
    let currentEditingTask = null;
    let currentLinkTask = null;

    // --- UTILITY & HELPER FUNCTIONS ---
    const saveState = () => { localStorage.setItem('tasks', JSON.stringify(tasks)); localStorage.setItem('categories', JSON.stringify(categories)); localStorage.setItem('people', JSON.stringify(people)); localStorage.setItem('passwords', JSON.stringify(passwords)); localStorage.setItem('websites', JSON.stringify(websites)); renderAndPopulate(); };
    const generateRandomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
        const getInitials = (name) => (name || '').split(' ').map(n => n[0]).join('').toUpperCase();
    const getNextId = (prefix = 'TASK') => `${prefix}-${Date.now()}`;
const formatDate = (isoDate) => isoDate ? new Date(isoDate).toLocaleString('en-GB') : 'N/A';
    const formatDateForDisplay = (isoDate) => isoDate ?
        new Date(isoDate + (isoDate.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', {
            year: 'numeric', month: 'short', day: '2-digit'
        }) : '—';
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    const parseISODate = (value) => {
        if (!value) return null;
        const d = new Date(value);
        return isNaN(d) ? null : d;
    };

    const findTaskById = (taskId, list = tasks) => {
        for (const t of list) {
            if (t.id === taskId) return t;
            if (t.subtasks && t.subtasks.length) {
                const found = findTaskById(taskId, t.subtasks);
                if (found) return found;
            }
        }
        return null;
    };

    const deleteTaskById = (taskId, list = tasks) => {
        const idx = list.findIndex(t => t.id === taskId);
        if (idx !== -1) { list.splice(idx, 1); return true; }
        for (const t of list) {
            if (t.subtasks && t.subtasks.length) {
                if (deleteTaskById(taskId, t.subtasks)) return true;
            }
        }
        return false;
    };

    const copyToClipboard = async (text) => {
        try { await navigator.clipboard.writeText(text); showToast('Copied'); }
        catch { /* ignore */ }
    };

    const addBusinessDays = (startDate, days) => {
        const newDate = new Date(startDate);
        let addedDays = 0;
        while (addedDays < days) {
            newDate.setDate(newDate.getDate() + 1);
const dayOfWeek = newDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
                addedDays++;
}
        }
        return newDate;
    };
const showToast = (message) => {
        const toast = get('copy-toast');
        toast.textContent = message;
toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
        }, 2000);
};

    // --- DOM ELEMENT SELECTION ---
    const get = (id) => document.getElementById(id);
const queryAll = (selector) => document.querySelectorAll(selector);
    const kanbanBoard = get('kanbanBoard'), openNewTaskModalBtn = get('openNewTaskModalBtn'),
          taskModal = get('taskModal'), modalTitle = get('taskModalTitle'), deleteTaskBtn = get('deleteTaskBtn'),
          archiveTaskBtn = get('archiveTaskBtn'), taskForm = get('taskForm'), taskIdHidden = get('taskId'),
          taskTitleInput = get('taskTitle'), taskDescriptionInput = get('taskDescription'),
          taskCategorySelect = get('taskCategory'), taskAssigneeSelect = get('taskAssignee'),
          taskDueDateInput = get('taskDueDate'), taskUrgentInput = get('taskUrgent'),
          subTaskSection = get('subTaskSection'), mainLogControls = get('mainLogControls'),
          logSummarySection = get('logSummarySection'), subtasksListContainer = get('subtasksListContainer'),
addSubTaskFormContainer = get('addSubTaskFormContainer'), mainLinksList = get('mainTaskLinksList'), addMainLinkBtn = get('addMainLinkBtn'),
          taskProgressInput = get('taskProgress'), progressContainer = get('progressContainer'),
          personModal = get('personModal'), personForm = get('personForm'),
          categoryModal = get('categoryModal'), categoryForm = get('categoryForm'),
          linkModal = get('linkModal'), linkForm = get('linkForm'),
          filterBar = get('filterBar'), assigneeFilter = get('assigneeFilter'), categoryFilter = get('categoryFilter');

    // --- MODAL UTILITIES ---
    const openModal = (modal) => { modal.classList.add('show'); document.
