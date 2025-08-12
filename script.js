(() => {
    // --- STATE MANAGEMENT ---
    let tasks = []; let categories = {}; let people = {}; let passwords = []; let websites = []; let activeAssigneeSelect = null; let expandedSubtasks = new Set();
    const KANBAN_STATUSES = ['Open', 'In Progress', 'Closed'];
    const SUBTASK_COLORS = ['subtask-color-1', 'subtask-color-2', 'subtask-color-3', 'subtask-color-4', 'subtask-color-5'];
    let currentEditingTask = null;
    let currentLinkTask = null;
    let notes = [];

    // --- UTILITY & HELPER FUNCTIONS ---
    const saveState = () => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('categories', JSON.stringify(categories));
        localStorage.setItem('people', JSON.stringify(people));
        localStorage.setItem('passwords', JSON.stringify(passwords));
        localStorage.setItem('websites', JSON.stringify(websites));
        localStorage.setItem('notes', JSON.stringify(notes));
        renderAndPopulate();
    };
    const generateRandomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
    const getInitials = (name) => (name || '').split(' ').map(n => n[0]).join('').toUpperCase();
    const getNextId = (prefix = 'TASK') => `${prefix}-${Date.now()}`;
    const formatDate = (isoDate) => isoDate ? new Date(isoDate).toLocaleString('en-GB') : 'N/A';
    const formatDateForDisplay = (isoDate) => isoDate ?
new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
    const renderAndPopulate = () => { renderKanbanBoard(); populateAllDropdowns(); };
    const addWeekdays = (date, days) => {
        let newDate = new Date(date);
        let addedDays = 0;
        while (addedDays < days) {
            newDate.setDate(newDate.getDate() + 1);
            const dayOfWeek = newDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
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
    const showInAppNotification = (message, type = 'info', parentElement) => {
        // Remove existing notifications from the same parent to prevent stacking
        parentElement.querySelectorAll('.in-app-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `in-app-notification in-app-notification-${type}`;
        notification.innerHTML = `<span>${message}</span><button class="close-notification-btn">&times;</button>`;
        parentElement.prepend(notification);
        notification.querySelector('.close-notification-btn').addEventListener('click', () => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        });
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    };
    const showInAppConfirmation = (message, onConfirm) => {
        const modal = document.createElement('div');
        modal.className = 'modal is-active';
        modal.innerHTML = `
            <div class="modal-content modal-sm">
                <header class="modal-header">
                    <h2>Confirm Action</h2>
                    <button class="close-button">&times;</button>
                </header>
                <div class="form-body">
                    <p>${message}</p>
                </div>
                <footer class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                    <button class="btn btn-danger confirm-btn">Confirm</button>
                </footer>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.close-button').addEventListener('click', () => modal.remove());
        modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.confirm-btn').addEventListener('click', () => {
            onConfirm();
            modal.remove();
        });
    };

    // --- DOM ELEMENT SELECTION ---
    const get = (id) => document.getElementById(id);
    const queryAll = (selector) => document.querySelectorAll(selector);
    const kanbanBoard = get('kanbanBoard'), openNewTaskModalBtn = get('openNewTaskModalBtn'), assigneeFilter = get('assigneeFilter'), categoryFilter = get('categoryFilter'), sortByDate = get('sortByDate'), closedTasksFilter = get('closedTasksFilter'), taskModal = get('taskModal'), taskForm = get('taskForm'), modalTitle = get('modalTitle'), manageTaskHeader = get('manageTaskHeader'), taskNameInput = get('taskName'), taskDescriptionInput = get('taskDescription'), dueDateInput = get('dueDate'), taskUrgentInput = get('taskUrgent'), taskAssigneeSelect = get('taskAssignee'), categorySelect = get('categorySelect'), taskStatusSelect = get('taskStatus'), taskProgressInput = get('taskProgress'), progressContainer = get('progress-container'), deleteTaskBtn = get('deleteTaskBtn'), archiveTaskBtn = get('archiveTaskBtn'), addNewCategoryBtn = get('addNewCategoryBtn'), categoryModal = get('categoryModal'), categoryForm = get('categoryForm'), newCategoryNameInput = get('newCategoryName'), addNewPersonBtn = get('addNewPersonBtn'), personModal = get('personModal'), personForm = get('personForm'), newPersonNameInput = get('newPersonName'), subTaskSection = get('subTaskSection'), subtasksListContainer = get('subtasksListContainer'),
    addSubTaskFormContainer = get('addSubTaskFormContainer'), mainLogControls = get('mainLogControls'), logSummarySection = get('logSummarySection'), logSummaryContainer = get('logSummaryContainer'), reportsLink = get('reportsLink'), settingsBtn = get('settingsBtn'), settingsModal = get('settingsModal'), peopleList = get('peopleList'), categoryList = get('categoryList'), settingsPersonForm = get('settingsPersonForm'), settingsCategoryForm = get('settingsCategoryForm'), settingsPersonNameInput = get('settingsPersonName'), settingsCategoryNameInput = get('settingsCategoryName'), passwordList = get('passwordList'), settingsPasswordForm = get('settingsPasswordForm'), settingsPasswordServiceInput = get('settingsPasswordService'), settingsPasswordUsernameInput = get('settingsPasswordUsername'), settingsPasswordValueInput = get('settingsPasswordValue'), openPasswordModalBtn = get('openPasswordModalBtn'), passwordModal = get('passwordModal'), passwordModalTitle = get('passwordModalTitle'), passwordIdInput = get('passwordId'), settingsPasswordLinkInput = get('settingsPasswordLink'), linkModal = get('linkModal'), linkForm = get('linkForm'), linkNameInput = get('linkName'), linkUrlInput
    = get('linkUrl'), existingLinksList = get('existingLinksList'), websiteList = get('websiteList'), openWebsiteModalBtn = get('openWebsiteModalBtn'), websiteModal = get('websiteModal'), globalSearchInput = get('globalSearchInput'),
    notesLink = get('notesLink'), notesContainer = get('notesContainer'), addNoteBtn = get('addNoteBtn'), saveNotesBtn = get('saveNotesBtn'),
    archivedNotesList = get('archivedNotesList'), manualLink = get('manualLink'), manualContent = get('manualContent');

    // --- DATA SANITIZATION & INITIAL LOAD ---
    const sanitizeTask = (task) => { const defaults = { name: 'Untitled', description: '', dueDate: new Date().toISOString().split('T')[0], assignee: null, category: 'Uncategorized', status: 'Open', subtasks: [], log: [], isArchived: false, isUrgent: false, closedDate: null, progress: null, links: [], archivedDate: null };
    const sanitized = { ...defaults, ...task }; sanitized.subtasks = (sanitized.subtasks || []).map(sub => ({...defaults, ...sub})); return sanitized; };
    const sanitizePassword = (p) => ({ id: getNextId('PWD'), service: 'Untitled', username: '', value: '', link: '', ...p });
    const sanitizeWebsite = (w) => ({ id: getNextId('WEB'), service: 'Untitled', username: '', value: '', link: '', ...w });
    const sanitizeNote = (n) => ({id: getNextId('NOTE'), title: '', body: '', isArchived: false, ...n});
    const loadData = () => { try { tasks = (JSON.parse(localStorage.getItem('tasks')) || []).map(sanitizeTask); categories = JSON.parse(localStorage.getItem('categories')) || {};
    people = JSON.parse(localStorage.getItem('people')) || {}; passwords = (JSON.parse(localStorage.getItem('passwords')) || []).map(sanitizePassword);
        websites = (JSON.parse(localStorage.getItem('websites')) || []).map(sanitizeWebsite);
        notes = (JSON.parse(localStorage.getItem('notes')) || []).map(sanitizeNote);
    } catch (error) { console.error("Failed to load data, starting fresh.", error); localStorage.clear(); } };
    const addSampleData = () => { if (tasks.length > 0 || Object.keys(people).length > 0) return;
    people = { 'Alice Johnson': '#0d6efd', 'Bob Smith': '#dc3545', 'Charlie Brown': '#ffc107', 'Diana Prince': '#6f42c1' };
    categories = { 'Design': '#20c997', 'Backend': '#fd7e14', 'DevOps': '#6610f2', 'Frontend': '#0dcaf0' };
    const sampleTasks = [ { id: 'TASK-1', name: 'Design Homepage Mockups', description: 'Create high-fidelity mockups for the new homepage in Figma.', dueDate: '2025-08-20', assignee: 'Alice Johnson', category: 'Design', status: 'In Progress', isUrgent: true, progress: 75, links: [{name: "Figma Mockup", url: "https://figma.com"}] }, { id: 'TASK-2', name: 'Setup Production Server', description: 'Configure AWS EC2 instance and RDS for production deployment.', dueDate: new Date().toISOString().split('T')[0], assignee: 'Diana Prince', category: 'DevOps', status: 'Open', subtasks: [ { id: 'SUB-1', name: 'Install Nginx', description: 'Set up the web server.', assignee: 'Diana Prince', dueDate: new Date().toISOString().split('T')[0], status: 'Open', links: [] } ], links: [] }, { id:
    'TASK-3', name: 'Fix Login Bug', description: 'Users are redirected to the wrong page after login.', dueDate: '2025-07-20', assignee: 'Charlie Brown', category: 'Frontend', status: 'Open', links: [] } ];
    tasks = sampleTasks.map(sanitizeTask); saveState(); };

    // --- DRAG AND DROP HANDLERS ---
    const handleDragStart = (e) => { e.dataTransfer.setData('text/plain', e.target.dataset.id);
    setTimeout(() => e.target.classList.add('dragging'), 0); };
    const handleDragEnd = (e) => e.target.classList.remove('dragging');
    const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
    const handleDragLeave = (e) => e.currentTarget.classList.remove('drag-over');
    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = e.currentTarget.dataset.status;
        const task = findTaskById(taskId);
        if (task && task.status !== newStatus) {
            task.status = newStatus;
            if (newStatus === 'Closed') {
                task.closedDate = new Date().toISOString();
                logAction(task, `Task status changed to Closed.`);
            } else {
                task.closedDate = null;
            }
            saveState();
        }
    };
    
    // --- CORE RENDERING ---
    const renderKanbanBoard = () => {
        const searchTerm = globalSearchInput.value.toLowerCase();
        const activeTasks = tasks.filter(t => !t.isArchived);
        let filteredTasks = activeTasks;
        
        if (searchTerm) {
            filteredTasks = activeTasks.filter(t => t.name.toLowerCase().includes(searchTerm) || t.description.toLowerCase().includes(searchTerm));
        } else {
            if (assigneeFilter.value !== 'all') filteredTasks = filteredTasks.filter(t => getAllAssignees(t).has(assigneeFilter.value));
            if (categoryFilter.value !== 'all') filteredTasks = filteredTasks.filter(t => t.category === categoryFilter.value);
        
            const showAllClosed = closedTasksFilter.value === 'all';
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            filteredTasks = filteredTasks.filter(task => {
                if (task.status !== 'Closed') return true;
                if (showAllClosed) return true;
                return task.closedDate && new Date(task.closedDate) > sevenDaysAgo;
            });
        }
        // Sort tasks: urgent tasks first, then by the selected date sorting
        filteredTasks.sort((a, b) => {
            if (a.isUrgent && !b.isUrgent) return -1;
            if (!a.isUrgent && b.isUrgent) return 1;
            const dateA = new Date(a.dueDate);
            const dateB = new Date(b.dueDate);
            
            return sortByDate.value === 'oldest' ? dateA - dateB : dateB - dateA;
        });
        const groupedTasks = KANBAN_STATUSES.reduce((acc, status) => ({ ...acc, [status]: [] }), {});
        filteredTasks.forEach(task => { 
    if (groupedTasks[task.status]) { 
        groupedTasks[task.status].push(task); 
    } 
});
        kanbanBoard.innerHTML = '';
        const headerColors = { 'Open': '#6c757d', 'In Progress': '#B4975A', 'Closed': '#1E4D2B' };
        const emptyStateMessages = { 'Open': "No open tasks. Let's add one!", 'In Progress': "Nothing in progress. Time to start a task!", 'Closed': "No tasks closed recently." };

        // Render status columns
        KANBAN_STATUSES.forEach(status => {
            const column = document.createElement('div');
            column.className = 'kanban-column';
            column.dataset.status = status;
            const tasksForStatus = groupedTasks[status] || [];
            column.innerHTML = `<div class="column-header"><span>${status}</span><span class="task-count" style="background-color: ${headerColors[status]}">${tasksForStatus.length}</span></div><div class="tasks-container"></div>`;
            const tasksContainer = column.querySelector('.tasks-container');
            
            if (tasksForStatus.length === 0) {
                tasksContainer.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i> <p>${emptyStateMessages[status]}</p></div>`;
            } else {
                tasksForStatus.forEach(task => tasksContainer.appendChild(createTaskCard(task)));
            }

            column.addEventListener('dragover', handleDragOver);
            column.addEventListener('dragleave', handleDragLeave);
            column.addEventListener('drop', handleDrop);
            kanbanBoard.appendChild(column);
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const todaysTaskIds = new Set();
        const thisWeeksTaskIds = new Set();
        const tasksWithDueSubtasksToday = new Set();
        const tasksWithDueSubtasksThisWeek = new Set();

        function checkSubtasks(task, parentTask) {
            for (const subtask of task.subtasks || []) {
                const subtaskDueDate = new Date(subtask.dueDate);
                subtaskDueDate.setHours(0, 0, 0, 0);

                if (subtask.status !== 'Closed') {
                    if (subtaskDueDate.getTime() === today.getTime()) {
                        todaysTaskIds.add(parentTask.id);
                        tasksWithDueSubtasksToday.add(parentTask.id);
                    } else if (subtaskDueDate > today && subtaskDueDate <= nextWeek) {
                        thisWeeksTaskIds.add(parentTask.id);
                        tasksWithDueSubtasksThisWeek.add(parentTask.id);
                    }
                }
                if (subtask.subtasks && subtask.subtasks.length > 0) {
                    checkSubtasks(subtask, parentTask);
                }
            }
        }

        activeTasks.forEach(task => {
            const taskDueDate = new Date(task.dueDate);
            taskDueDate.setHours(0, 0, 0, 0);

            if (task.status !== 'Closed') {
                if (taskDueDate.getTime() === today.getTime()) {
                    todaysTaskIds.add(task.id);
                } else if (taskDueDate > today && taskDueDate <= nextWeek) {
                    thisWeeksTaskIds.add(task.id);
                }
            }
            checkSubtasks(task, task);
        });

        // Render "Today's Tasks" column
        const todaysTasks = Array.from(todaysTaskIds).map(id => findTaskById(id));
        const todaysColumn = document.createElement('div');
        todaysColumn.className = 'kanban-column todays-tasks';
        todaysColumn.innerHTML = `<div class="column-header"><span>Today's Tasks</span><span class="task-count" style="background-color: var(--color-accent-warning)">${todaysTasks.length}</span></div><div class="tasks-container"></div>`;
        const tasksContainerToday = todaysColumn.querySelector('.tasks-container');
        if (todaysTasks.length === 0) {
            tasksContainerToday.innerHTML = `<div class="empty-state"><i class="fas fa-coffee"></i> <p>No tasks due today. Enjoy the break!</p></div>`;
        } else {
            todaysTasks.forEach(task => {
                const hasDueSubtask = tasksWithDueSubtasksToday.has(task.id);
                tasksContainerToday.appendChild(createTaskCard(task, false, hasDueSubtask));
            });
        }
        kanbanBoard.appendChild(todaysColumn);


        // Render "This Week's Tasks" column
        const thisWeeksTasks = Array.from(thisWeeksTaskIds)
            .filter(id => !todaysTaskIds.has(id))
            .map(id => findTaskById(id));
        const weekColumn = document.createElement('div');
        weekColumn.className = 'kanban-column this-week-tasks';
        weekColumn.innerHTML = `<div class="column-header"><span>This Week's Tasks</span><span class="task-count" style="background-color: #1890ff">${thisWeeksTasks.length}</span></div><div class="tasks-container"></div>`;
        const weekTasksContainer = weekColumn.querySelector('.tasks-container');
        if (thisWeeksTasks.length === 0) {
            weekTasksContainer.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i> <p>No tasks due this week.</p></div>`;
        } else {
            thisWeeksTasks.forEach(task => {
                const hasDueSubtask = tasksWithDueSubtasksThisWeek.has(task.id);
                weekTasksContainer.appendChild(createTaskCard(task, false, hasDueSubtask));
            });
        }
        kanbanBoard.appendChild(weekColumn);
    };

    const createTaskCard = (task, isDraggable = true, hasDueSubtask = false) => {
        const card = document.createElement('div');
        const today = new Date();
        today.setHours(0,0,0,0);
        const isLate = new Date(task.dueDate) < today && !['Closed'].includes(task.status);
        card.className = `task-card ${isLate ? 'late' : ''}`;
        card.dataset.id = task.id;
        card.draggable = isDraggable;
        card.style.setProperty('--card-category-color', categories[task.category] || 'transparent');
        
        const allAssignees = Array.from(getAllAssignees(task));
        const assigneeStackHTML = allAssignees.map(p => `<div class="card-assignee-icon" style="background-color: ${people[p] || '#ccc'}" title="${p}">${getInitials(p)}</div>`).join('');
        const urgentIconHTML = task.isUrgent ? '<i class="fas fa-exclamation-circle urgent-icon" title="Urgent"></i>' : '';
        const quickCloseBtnHTML = task.status !== 'Closed' ? `<button class="task-card-quick-close" data-task-id="${task.id}" title="Mark as Closed"><i class="fas fa-check-circle"></i></button>` : '';
        const subtaskIndicatorHTML = hasDueSubtask ? '<div class="subtask-due-indicator" title="Sub-task due this period"><i class="fas fa-sitemap"></i></div>' : '';

        let displayProgress = 0;
        if (task.status === 'Closed') {
            displayProgress = 100;
        } else if (typeof task.progress === 'number' && task.progress >= 0) {
            displayProgress = task.progress;
        } else if (task.status === 'In Progress') {
            displayProgress = 50;
        }

        const progressBarHTML = `
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${displayProgress}%;"></div>
            </div>
        `;

        card.innerHTML = `
            <div class="card-top-indicators">
                ${isLate ? '<div class="overdue-label">Overdue</div>' : ''}
                <div class="top-right-indicators">
                    ${subtaskIndicatorHTML}
                    ${urgentIconHTML}
                    ${quickCloseBtnHTML}
                </div>
            </div>
            <h4 class="task-card-title">
                <span>${task.name}</span>
                <div class="title-assignee-stack">${assigneeStackHTML}</div>
            </h4>
            <p class="task-card-description">${task.description || ''}</p>
            <div class="task-card-footer">
                <span class="task-card-due-date"><i class="far fa-calendar-alt"></i>&nbsp;${formatDateForDisplay(task.dueDate)}</span>
                <span class="task-card-category-tag" style="background-color: ${categories[task.category] || '#ccc'}">${task.category}</span>
            </div>
            ${progressBarHTML}
        `;
        card.addEventListener('click', (e) => {
            if (e.target.closest('.task-card-quick-close')) return;
            openTaskModal(task.id)
        });
        if (isDraggable) {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
        }

        const quickCloseBtn = card.querySelector('.task-card-quick-close');
        if (quickCloseBtn) {
            quickCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskToClose = findTaskById(e.currentTarget.dataset.taskId);
                if (taskToClose && taskToClose.status !== 'Closed') {
                    taskToClose.status = 'Closed';
                    taskToClose.closedDate = new Date().toISOString();
                    logAction(taskToClose, `Task status changed to Closed.`);
                    saveState();
                }
            });
        }
        return card;
    };
    
    // --- replace the start of renderSubTask with this ---
const renderSubTask = (taskObject, level = 0) => {
  const container = document.createElement('div');
  const colorClass = SUBTASK_COLORS[level % SUBTASK_COLORS.length];
  const isClosed = taskObject.status === 'Closed';
  container.className = `sub-task-container ${colorClass} ${isClosed ? 'is-closed' : ''}`;

  const header = document.createElement('div');
  const isExpanded = expandedSubtasks.has(taskObject.id);
  header.className = `sub-task-header ${isExpanded ? '' : 'collapsed'} ${isClosed ? 'is-closed' : ''}`;

  const assigneeIcon = `<div class="card-assignee-icon sub-task-assignee-icon" style="background-color: ${people[taskObject.assignee] || '#ccc'}" title="${taskObject.assignee}">${getInitials(taskObject.assignee)}</div>`;
  const statusDropdownHTML = `<select class="sub-task-status" data-task-id="${taskObject.id}">${KANBAN_STATUSES.map(s => `<option value="${s}" ${taskObject.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
  const quickCloseBtnHTML = isClosed ? '' : `<button class="sub-task-quick-close" data-task-id="${taskObject.id}" title="Mark as Closed"><i class="fas fa-check-circle"></i></button>`;

  header.innerHTML = `<span class="sub-task-toggle"><i class="fas fa-chevron-down"></i></span><span class="sub-task-title">${taskObject.name}</span>${assigneeIcon}<span><strong>Due:</strong> ${formatDateForDisplay(taskObject.dueDate)}</span>${statusDropdownHTML}${quickCloseBtnHTML}`;

  const body = document.createElement('div');
  body.className = `sub-task-body ${isExpanded ? '' : 'collapsed'}`;

  const linksSection = document.createElement('div');
  linksSection.className = 'links-section';
  linksSection.innerHTML = `<h4>Links <button type="button" class="add-link-btn-header" data-task-id="${taskObject.id}" title="Add Link"><i class="fas fa-link"></i></button></h4>`;
  const linksList = document.createElement('ul');
  linksList.className = 'links-list';
  (taskObject.links || []).forEach(link => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${link.url}" target="_blank">${link.name}</a>`;
    linksList.appendChild(li);
  });
  linksSection.appendChild(linksList);

  body.innerHTML = `<p class="sub-task-description">${taskObject.description || 'No description.'}</p>`;
  body.appendChild(linksSection);
  body.appendChild(createLogControls(taskObject));

  const nestedSubtasksContainer = document.createElement('div');
  nestedSubtasksContainer.className = 'sub-tasks-nested';
  (taskObject.subtasks || []).forEach((sub, index) => nestedSubtasksContainer.appendChild(renderSubTask(sub, level + 1 + index)));
  body.appendChild(nestedSubtasksContainer);
  body.appendChild(createSubtaskForm(taskObject));
  container.append(header, body);

  // expand/collapse
  header.addEventListener('click', (e) => {
    if (e.target.closest('button,select,input')) return;
    isExpanded ? expandedSubtasks.delete(taskObject.id) : expandedSubtasks.add(taskObject.id);
    header.classList.toggle('collapsed');
    body.classList.toggle('collapsed');
  });

  const handleSubtaskClose = (subTaskId) => {
    const subTask = findTaskById(subTaskId);
    if (subTask && subTask.status !== 'Closed') {
      subTask.status = 'Closed';
      subTask.closedDate = new Date().toISOString();
      logAction(currentEditingTask, `Sub-task "${subTask.name}" marked as completed.`, subTask.assignee);
      updateMainTaskDueDate(currentEditingTask);
      saveState();
      openTaskModal(currentEditingTask.id);
    }
  };

  // handle status changes (close OR re-open)
  header.querySelector('.sub-task-status').addEventListener('change', (e) => {
    const subTask = findTaskById(e.target.dataset.taskId);
    if (!subTask) return;
    subTask.status = e.target.value;
    if (subTask.status === 'Closed') {
      handleSubtaskClose(subTask.id);
    } else {
      subTask.closedDate = null;
      saveState();
      openTaskModal(currentEditingTask.id);
    }
  });

  const quickBtn = header.querySelector('.sub-task-quick-close');
  if (quickBtn) {
    quickBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSubtaskClose(e.currentTarget.dataset.taskId);
    });
  }

  body.querySelector('.add-link-btn-header').addEventListener('click', (e) => {
    openLinkModal(e.currentTarget.dataset.taskId);
  });

  return container;
};

    const createLogControls = (taskObject) => {
        const div = document.createElement('div');
        div.className = 'log-controls';
        div.innerHTML = `<h4>Action Log</h4><div class="log-controls-wrapper"><div class="update-controls"><input type="text" placeholder="Add manual update..." class="manual-update-input"><button type="button" class="btn btn-primary add-update-btn"><i class="fas fa-comment-dots"></i> Log</button></div><div class="chaser-controls"><small>Log Chaser:</small><button type="button" class="btn btn-chaser" data-log="Email chaser sent">Email</button><button type="button" class="btn btn-chaser" data-log="Letter chaser sent">Letter</button><button type="button" class="btn btn-chaser" data-log="Chased at meeting">Meeting</button></div></div>`;
        div.querySelector('.add-update-btn').addEventListener('click', () => { const input = div.querySelector('.manual-update-input'); if (input.value.trim()) { logAction(taskObject, input.value.trim(), taskObject.assignee); input.value = ''; openTaskModal(currentEditingTask.id); } });
        div.querySelectorAll('.btn-chaser').forEach(btn => btn.addEventListener('click', (e) => {logAction(taskObject, e.target.dataset.log, taskObject.assignee); openTaskModal(currentEditingTask.id);}));
        return div;
    };
    const createSubtaskForm = (parentTask) => {
        const form = document.createElement('div');
        form.className = 'add-subtask-form';
        form.innerHTML = `<h4>Add New Sub-Task</h4><input type="text" placeholder="Sub-task title..." class="new-subtask-name"><textarea placeholder="Sub-task description..." rows="2" class="new-subtask-description"></textarea><div class="input-with-button"><select class="new-subtask-assignee"><option value="" disabled selected>Select Assignee...</option></select><button type="button" class="add-icon-btn add-person-btn-subtask" title="Add New Person"><i class="fas fa-user-plus"></i></button></div><input type="date" class="new-subtask-due-date"><button type="button" class="btn btn-primary add-subtask-btn"><i class="fas fa-plus"></i> Add Sub-Task</button>`;
        const select = form.querySelector('.new-subtask-assignee');
        select.innerHTML += Object.keys(people).sort().map(p => `<option value="${p}">${p}</option>`).join('');
        form.querySelector('.add-person-btn-subtask').addEventListener('click', () => { activeAssigneeSelect = select; openModal(personModal); });
        form.querySelector('.add-subtask-btn').addEventListener('click', () => handleAddSubTask(form, parentTask));
        return form;
    };

    const renderLogSummary = (task) => {
        let allLogs = [];
        (function collectLogs(t) {
            if (t.log) allLogs.push(...t.log.map(l => ({ ...l, taskName: t.name })));
            if (t.subtasks) t.subtasks.forEach(collectLogs);
        })(task);
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        logSummaryContainer.innerHTML = '';
        if (allLogs.length === 0) { logSummaryContainer.innerHTML = 'No actions logged.'; return;
        }
        allLogs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            const assigneeIcon = `<div class="card-assignee-icon" style="background-color: ${people[log.assignee] || '#ccc'}" title="${log.assignee}">${getInitials(log.assignee)}</div>`;
            entry.innerHTML = `<div>${assigneeIcon}</div><div><span class="timestamp">[${formatDate(log.timestamp)}]</span><span class="log-task-tag">${log.taskName}</span> ${log.message}</div>`;
            logSummaryContainer.appendChild(entry);
        });
    };

    const findTaskById = (id, taskArray = tasks) => { for (const task of taskArray) { if (task.id === id) return task;
    if (task.subtasks) { const found = findTaskById(id, task.subtasks); if (found) return found; } } return null; };
    const getAllAssignees = (task) => { const assignees = new Set(); if (task.assignee) assignees.add(task.assignee);
    (function traverse(subtasks) { (subtasks || []).forEach(st => { if (st.assignee) assignees.add(st.assignee); traverse(st.subtasks); }); })(task.subtasks); return assignees; };
    const handleAddSubTask = (form, parentTask) => {
        const name = form.querySelector('.new-subtask-name').value.trim(), description = form.querySelector('.new-subtask-description').value.trim(), assignee = form.querySelector('.new-subtask-assignee').value, dueDate = form.querySelector('.new-subtask-due-date').value;
        if (!name || !assignee || !dueDate) return showInAppNotification('Please provide a title, assignee, and due date for the sub-task.', 'error', get('taskModal').querySelector('.form-body'));
        if (!parentTask.subtasks) parentTask.subtasks = [];
        const newSubtask = { id: getNextId('SUB'), name, description, assignee, dueDate, status: 'Open', subtasks: [], log: [], closedDate: null, progress: null, links: [] };
        parentTask.subtasks.push(newSubtask);
        logAction(parentTask, `Sub-task "${name}" was added.`, assignee);
        updateMainTaskDueDate(parentTask);
        expandedSubtasks.add(parentTask.id);
        saveState();
        openTaskModal(currentEditingTask.id);
    };
    const logAction = (taskObject, message, assignee) => {
        if (!taskObject.log) taskObject.log = [];
        const logAssignee = assignee || taskObject.assignee;
        taskObject.log.unshift({ timestamp: new Date().toISOString(), message, assignee: logAssignee });
    };
    const openTaskModal = (taskId = null) => {
        taskForm.reset();
        currentEditingTask = null;
        if (!taskId) expandedSubtasks.clear();
        [subTaskSection, mainLogControls, logSummarySection, deleteTaskBtn, archiveTaskBtn, manageTaskHeader, progressContainer].forEach(el => el.style.display = 'none');
        populateAllDropdowns();
        if (taskId) {
            const task = findTaskById(taskId);
            if (!task) return;
            currentEditingTask = task;
            if(!expandedSubtasks.has(task.id)) expandedSubtasks.add(task.id);
            modalTitle.textContent = 'Manage Task';
            manageTaskHeader.style.display = 'flex';
            manageTaskHeader.innerHTML = `<h4>${task.name}</h4><div class="header-assignee"><div class="card-assignee-icon" style="background-color: ${people[task.assignee] || '#ccc'}" title="${task.assignee}">${getInitials(task.assignee)}</div><span>${task.assignee || 'Unassigned'}</span></div>`;
            taskNameInput.value = task.name;
            taskDescriptionInput.value = task.description;
            dueDateInput.value = task.dueDate;
            taskUrgentInput.checked = task.isUrgent;
            taskAssigneeSelect.value = task.assignee;
            categorySelect.value = task.category;
            taskStatusSelect.value = task.status;
            
            get('mainTaskLinksList').innerHTML = '';
            (task.links || []).forEach(link => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${link.url}" target="_blank">${link.name}</a>`;
                get('mainTaskLinksList').appendChild(li);
            });
            if (task.status === 'In Progress') {
                progressContainer.style.display = 'block';
                taskProgressInput.value = task.progress || '';
            }

            [deleteTaskBtn, archiveTaskBtn, subTaskSection, mainLogControls, logSummarySection].forEach(el => el.style.display = 'block');
            subtasksListContainer.innerHTML = '';
            (task.subtasks || []).forEach((sub, index) => subtasksListContainer.appendChild(renderSubTask(sub, index)));
            addSubTaskFormContainer.innerHTML = '';
            addSubTaskFormContainer.appendChild(createSubtaskForm(task));
            mainLogControls.innerHTML = '';
            mainLogControls.appendChild(createLogControls(task));
            renderLogSummary(task);
        } else {
            modalTitle.textContent = 'New Task';
            taskUrgentInput.checked = false;
        }
        setTimeout(() => taskDescriptionInput.dispatchEvent(new Event('input')), 50);
        openModal(taskModal);
    };
    
    const updateMainTaskDueDate = (task) => {
        if (task.isUrgent) {
            return;
        }

        let allSubtasks = [];
        (function collectSubtasks(subtasks) {
            for (const sub of subtasks) {
                if (sub.status !== 'Closed') {
                    allSubtasks.push(sub);
                }
                if (sub.subtasks && sub.subtasks.length > 0) {
                    collectSubtasks(sub.subtasks);
                }
            }
        })(task.subtasks);

        if (allSubtasks.length === 0) {
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const hasOverdueSubtask = allSubtasks.some(st => new Date(st.dueDate + 'T00:00:00') < today);

        if (hasOverdueSubtask) {
            const newDueDate = new Date();
            newDueDate.setDate(newDueDate.getDate() + 7);
            task.dueDate = newDueDate.toISOString().split('T')[0];
            return;
        }

        const latestSubtaskDueDate = new Date(Math.max(...allSubtasks.map(st => new Date(st.dueDate + 'T00:00:00'))));
        const currentMainDueDate = new Date(task.dueDate + 'T00:00:00');

        if (latestSubtaskDueDate > currentMainDueDate) {
            const newMainDueDate = new Date(latestSubtaskDueDate);
            newMainDueDate.setDate(newMainDueDate.getDate() + 7);
            task.dueDate = newMainDueDate.toISOString().split('T')[0];
        }
    };

    const populateAllDropdowns = () => {
        const sortedPeople = Object.keys(people).sort(), sortedCategories = Object.keys(categories).sort();
        const peopleOptions = sortedPeople.map(p => `<option value="${p}">${p}</option>`).join('');
        const categoryOptions = sortedCategories.map(c => `<option value="${c}">${c}</option>`).join('');
        assigneeFilter.innerHTML = '<option value="all">All Assignees</option>' + peopleOptions;
        categoryFilter.innerHTML = '<option value="all">All Categories</option>' + categoryOptions;
        const currentAssignee = taskAssigneeSelect.value, currentCategory = categorySelect.value;
        taskAssigneeSelect.innerHTML = '<option value="" disabled selected>Select...</option>' + peopleOptions;
        categorySelect.innerHTML = '<option value="" disabled selected>Select...</option>' + categoryOptions;
        if(currentAssignee) taskAssigneeSelect.value = currentAssignee;
        if(currentCategory) categorySelect.value = currentCategory;
        queryAll('.new-subtask-assignee').forEach(select => { const currentSubAssignee = select.value; select.innerHTML = '<option value="" disabled selected>Select...</option>' + peopleOptions; if(currentSubAssignee) select.value = currentSubAssignee; });
    };

    const openModal = (modal) => modal.classList.add('is-active');
    const closeModal = (modal) => modal.classList.remove('is-active');
    const generateReportHTML = (title, tasksToReport) => { let tableHTML = `<table class="report-table"><thead><tr><th>Category</th><th>Status</th><th>Task</th><th>Description</th><th>Assignee</th><th>Due Date</th><th>Sub-tasks</th></tr></thead><tbody>`;
    tasksToReport.forEach(task => { let subtaskHTML = ''; if (task.subtasks?.length > 0) { subtaskHTML += '<ul>'; (function r(s) { s.forEach(st => { subtaskHTML += `<li>${st.name} (Assignee: ${st.assignee})</li>`; if (st.subtasks?.length > 0) { subtaskHTML += '<ul>'; r(st.subtasks); subtaskHTML += '</ul>'; } }); })(task.subtasks); subtaskHTML += '</ul>'; } tableHTML += `<tr><td>${task.category}</td><td>${task.status}</td><td>${task.name}</td><td>${task.description || ''}</td><td>${task.assignee}</td><td>${formatDateForDisplay(task.dueDate)}</td><td>${subtaskHTML || 'None'}</td></tr>`; });
    tableHTML += `</tbody></table>`; return `<div class="print-report"><h1>${title}</h1><p>Generated on: ${new Date().toLocaleDateString('en-GB')}</p>${tableHTML}</div>`; };
    const triggerPrint = (reportHTML) => { get('print-container').innerHTML = reportHTML; window.print();
    };
    const generateAssigneeReport = () => { const selectedUsers = Array.from(queryAll('#reportUserSelectionContainer .report-user-checkbox:checked')).map(cb => cb.value);
    if (selectedUsers.length === 0) return showInAppNotification('Please select at least one user.', 'error', get('reportConfigModal').querySelector('.form-body'));
    const reportTasks = tasks.filter(task => !task.isArchived && selectedUsers.some(user => getAllAssignees(task).has(user))); 
        triggerPrint(generateReportHTML('Task Report by Assignee', reportTasks)); 
        closeModal(get('reportConfigModal'));
    };
    const generateOverdueReport = () => { const overdueTasks = tasks.filter(task => !task.isArchived && new Date(task.dueDate) < new Date() && !['Closed'].includes(task.status));
    if (overdueTasks.length === 0) { showInAppNotification('No overdue tasks found.', 'info', get('reportsView')); return; } triggerPrint(generateReportHTML('Overdue Tasks Report', overdueTasks)); };
    // --- SETTINGS MODAL ---
    const isPersonInUse = (personName) => {
        const checkTasks = (taskList) => {
            for (const task of taskList) {
                if (task.assignee === personName) return true;
                if (task.subtasks && task.subtasks.length > 0) {
                    if (checkTasks(task.subtasks)) return true;
                }
            }
            return false;
        };
        return checkTasks(tasks);
    };

    // ---- Tasks by Category Report ----
const generateCategoryReport = () => {
    // Only include main tasks that are Open or In Progress (not archived)
    const mainTasks = tasks.filter(
        t => !t.isArchived && (t.status === 'Open' || t.status === 'In Progress')
    );

    // Group tasks by category
    const categoryMap = {};
    mainTasks.forEach(task => {
        const cat = task.category || 'Uncategorized';
        if (!categoryMap[cat]) categoryMap[cat] = [];
        categoryMap[cat].push(task);
    });

    // Generate the HTML for the report
    let reportHTML = `<div class="print-report">
        <h1>Tasks by Category (Open & In Progress)</h1>
        <p>Generated on: ${new Date().toLocaleDateString('en-GB')}</p>`;

    Object.entries(categoryMap).forEach(([cat, catTasks]) => {
        reportHTML += `<h2 style="margin-top:2em;">${cat}</h2>`;
        reportHTML += `<table class="report-table">
            <thead>
                <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                    <th>Description</th>
                    <th>Subtasks</th>
                </tr>
            </thead>
            <tbody>`;

        catTasks.forEach(task => {
            // Recursively list all subtasks
            const renderSubtasks = (subs, indent = 0) => {
                if (!subs || !subs.length) return '';
                return '<ul>' + subs.map(sub => {
                    return `<li>
                        <strong>${'&nbsp;'.repeat(indent * 2)}${sub.name}</strong>
                        (Status: ${sub.status}, Assignee: ${sub.assignee}, Due: ${formatDateForDisplay(sub.dueDate)}) 
                        ${sub.description ? `<br><span class="desc">${sub.description}</span>` : ''}
                        ${sub.subtasks && sub.subtasks.length ? renderSubtasks(sub.subtasks, indent + 1) : ''}
                    </li>`;
                }).join('') + '</ul>';
            };

            reportHTML += `<tr>
                <td>${task.name}</td>
                <td>${task.status}</td>
                <td>${task.assignee}</td>
                <td>${formatDateForDisplay(task.dueDate)}</td>
                <td>${task.description || ''}</td>
                <td>${task.subtasks && task.subtasks.length ? renderSubtasks(task.subtasks) : 'None'}</td>
            </tr>`;
        });

        reportHTML += `</tbody></table>`;
    });

    reportHTML += `</div>`;

    triggerPrint(reportHTML);
};

    const isCategoryInUse = (categoryName) => {
        return tasks.some(task => task.category === categoryName && !task.isArchived);
    };

    const openSettingsModal = () => {
        peopleList.innerHTML = '';
        const sortedPeople = Object.keys(people).sort((a, b) => a.localeCompare(b));
        if (sortedPeople.length === 0) {
            peopleList.innerHTML = `<div class="empty-state"><i class="fas fa-user-plus"></i><p>No people added yet.</p></div>`;
        } else {
            sortedPeople.forEach(person => {
                const li = document.createElement('li');
                const colorInputId = `person-color-${person.replace(/\s+/g, '-')}`;
                li.innerHTML = `
                    <div class="settings-list-item">
                        <label for="${colorInputId}" class="settings-color-swatch" style="background-color: ${people[person]}"></label>
                
                        <input type="color" id="${colorInputId}" class="color-input" value="${people[person]}">
                        <span>${person}</span>
                    </div>
                    <button class="settings-delete-btn" data-name="${person}">&times;</button>
                `;
                li.querySelector('.color-input').addEventListener('change', (e) => {
                    people[person] = e.target.value;
                    saveState();
                    openSettingsModal();
                });
                li.querySelector('.settings-delete-btn').addEventListener('click', (e) => {
                    const name = e.target.dataset.name;
                    if (isPersonInUse(name)) {
                        showInAppNotification(`Cannot delete "${name}" as they are currently assigned to one or more tasks.`, 'error', get('peopleTab'));
                        return;
                    }
                    showInAppConfirmation(`Are you sure you want to delete "${name}"?`, () => {
                        delete people[name];
                        saveState();
                        openSettingsModal();
                        showInAppNotification(`"${name}" has been deleted.`, 'success', get('peopleTab'));
                    });
                });
                peopleList.appendChild(li);
            });
        }
        categoryList.innerHTML = '';
        const sortedCategories = Object.keys(categories).sort((a, b) => a.localeCompare(b));
        if (sortedCategories.length === 0) {
            categoryList.innerHTML = `<div class="empty-state"><i class="fas fa-tags"></i><p>No categories added yet.</p></div>`;
        } else {
            sortedCategories.forEach(cat => {
                const li = document.createElement('li');
                const colorInputId = `cat-color-${cat.replace(/\s+/g, '-')}`;
                li.innerHTML = `
                    <div class="settings-list-item">
                        <label for="${colorInputId}" class="settings-color-swatch" style="background-color: ${categories[cat]}"></label>
                
                        <input type="color" id="${colorInputId}" class="color-input" value="${categories[cat]}">
                        <span>${cat}</span>
                    </div>
                    <button class="settings-delete-btn" data-name="${cat}">&times;</button>
                `;
                li.querySelector('.color-input').addEventListener('change', (e) => {
                    categories[cat] = e.target.value;
                    saveState();
                    openSettingsModal();
                });
                li.querySelector('.settings-delete-btn').addEventListener('click', (e) => {
                    const name = e.target.dataset.name;
                    if (isCategoryInUse(name)) {
                        showInAppNotification(`Cannot delete "${name}" as it is currently used by one or more tasks.`, 'error', get('categoriesTab'));
                        return;
                    }
                     showInAppConfirmation(`Are you sure you want to delete the category "${name}"?`, () => {
                        delete categories[name];
                        saveState();
                        openSettingsModal();
                        showInAppNotification(`Category "${name}" has been deleted.`, 'success', get('categoriesTab'));
                    });
                });
                categoryList.appendChild(li);
            });
        }
        passwordList.innerHTML = '';
        const sortedPasswords = [...passwords].sort((a, b) => a.service.localeCompare(b.service));
        if (sortedPasswords.length === 0) {
            passwordList.innerHTML = `<div class="empty-state"><i class="fas fa-key"></i><p>No passwords saved.</p></div>`;
        } else {
            sortedPasswords.forEach(p => {
                const li = document.createElement('li');
                const linkHTML = p.link ? `<small><a href="${p.link}" target="_blank">${p.link}</a></small>` : '';
                li.innerHTML = `
                    <div class="password-item-details">
                        <strong>${p.service}</strong>
                        <small>${p.username}</small>
                        ${linkHTML}
                    </div>
                    <div class="password-field-container">
                        <input type="password" value="${p.value}" readonly>
                        <button class="password-action-btn toggle-vis" title="Show/Hide Password"><i class="fas fa-eye"></i></button>
                        <button class="password-action-btn copy-pass" title="Copy Password"><i class="fas fa-copy"></i></button>
        
                        <button class="password-action-btn edit-pass" title="Edit Password"><i class="fas fa-edit"></i></button>
                    </div>
                    <button class="settings-delete-btn" data-id="${p.id}">&times;</button>
                `;
                
                const passInput = li.querySelector('input');
                const toggleBtn = li.querySelector('.toggle-vis');
                const toggleIcon = toggleBtn.querySelector('i');
                toggleBtn.addEventListener('click', () => {
                    if (passInput.type === 'password') {
                        passInput.type = 'text';
                        toggleIcon.classList.remove('fa-eye');
                        toggleIcon.classList.add('fa-eye-slash');
                    } else {
                        passInput.type = 'password';
                        toggleIcon.classList.remove('fa-eye-slash');
                        toggleIcon.classList.add('fa-eye');
                    }
                });
                li.querySelector('.copy-pass').addEventListener('click', () => {
                    const originalType = passInput.type;
                    passInput.type = 'text';
                    passInput.select();
                    document.execCommand('copy');
                    passInput.type = originalType;
                    window.getSelection().removeAllRanges();
                    showToast('Password copied!');
                });
                li.querySelector('.edit-pass').addEventListener('click', () => {
                    openPasswordModal(p.id);
                });
                li.querySelector('.settings-delete-btn').addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    showInAppConfirmation(`Are you sure you want to delete the password for "${p.service}"?`, () => {
                        passwords = passwords.filter(pwd => pwd.id !== id);
                        saveState();
                        openSettingsModal();
                        showInAppNotification(`Password for "${p.service}" has been deleted.`, 'success', get('passwordsTab'));
                    });
                });
                passwordList.appendChild(li);
            });
        }
        websiteList.innerHTML = '';
        const sortedWebsites = [...websites].sort((a,b) => a.service.localeCompare(b.service));
        if (sortedWebsites.length === 0) {
            websiteList.innerHTML = `<div class="empty-state"><i class="fas fa-globe"></i><p>No websites saved.</p></div>`;
        } else {
            sortedWebsites.forEach(w => {
                const li = document.createElement('li');
                const linkHTML = w.link ? `<small><a href="${w.link}" target="_blank">${w.link}</a></small>` : '';
                li.innerHTML = `
                    <div class="password-item-details">
                        <strong>${w.service}</strong>
                        <small>${w.username}</small>
                        ${linkHTML}
                    </div>
                    <div class="password-field-container">
                        <input type="password" value="${w.value}" readonly>
                        <button class="password-action-btn toggle-vis" title="Show/Hide Password"><i class="fas fa-eye"></i></button>
                        <button class="password-action-btn copy-pass" title="Copy Password"><i class="fas fa-copy"></i></button>
                        <button class="password-action-btn edit-pass" title="Edit Website"><i class="fas fa-edit"></i></button>
                    </div>
                    <button class="settings-delete-btn" data-id="${w.id}">&times;</button>
                `;
                
                const passInput = li.querySelector('input');
                const toggleBtn = li.querySelector('.toggle-vis');
                const toggleIcon = toggleBtn.querySelector('i');
                toggleBtn.addEventListener('click', () => {
                    if (passInput.type === 'password') {
                        passInput.type = 'text';
                        toggleIcon.classList.remove('fa-eye');
                        toggleIcon.classList.add('fa-eye-slash');
                    } else {
                        passInput.type = 'password';
                        toggleIcon.classList.remove('fa-eye-slash');
                        toggleIcon.classList.add('fa-eye');
                    }
                });
                li.querySelector('.copy-pass').addEventListener('click', () => {
                    const originalType = passInput.type;
                    passInput.type = 'text';
                    passInput.select();
                    document.execCommand('copy');
                    passInput.type = originalType;
                    window.getSelection().removeAllRanges();
                    showToast('Password copied!');
                });
                li.querySelector('.edit-pass').addEventListener('click', () => {
                    openWebsiteModal(w.id);
                });
                li.querySelector('.settings-delete-btn').addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    showInAppConfirmation(`Are you sure you want to delete the website credentials for "${w.service}"?`, () => {
                        websites = websites.filter(web => web.id !== id);
                        saveState();
                        openSettingsModal();
                        showInAppNotification(`Website "${w.service}" has been deleted.`, 'success', get('websitesTab'));
                    });
                });
                websiteList.appendChild(li);
            });
        }
        openModal(settingsModal);
    };

    // --- PASSWORD MODAL ---
    const openPasswordModal = (passwordId = null) => {
        settingsPasswordForm.reset();
        passwordIdInput.value = '';
        if (passwordId) {
            const password = passwords.find(p => p.id === passwordId);
            if (password) {
                passwordModalTitle.textContent = 'Edit Password';
                passwordIdInput.value = password.id;
                settingsPasswordServiceInput.value = password.service;
                settingsPasswordUsernameInput.value = password.username;
                settingsPasswordValueInput.value = password.value;
                settingsPasswordLinkInput.value = password.link || '';
            }
        } else {
            passwordModalTitle.textContent = 'Add New Password';
        }
        openModal(passwordModal);
    };

    // --- WEBSITE MODAL ---
    const openWebsiteModal = (websiteId = null) => {
        get('settingsWebsiteForm').reset();
        get('websiteId').value = '';
        if (websiteId) {
            const website = websites.find(w => w.id === websiteId);
            if (website) {
                get('websiteModalTitle').textContent = 'Edit Website';
                get('websiteId').value = website.id;
                get('settingsWebsiteService').value = website.service;
                get('settingsWebsiteUsername').value = website.username;
                get('settingsWebsiteValue').value = website.value;
                get('settingsWebsiteLink').value = website.link || '';
            }
        } else {
            get('websiteModalTitle').textContent = 'Add New Website';
        }
        openModal(get('websiteModal'));
    };

    // --- LINK MODAL ---
    const openLinkModal = (taskId) => {
        currentLinkTask = findTaskById(taskId);
        if (!currentLinkTask) return;

        existingLinksList.innerHTML = '';
        (currentLinkTask.links || []).forEach((link, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="${link.url}" target="_blank">${link.name}</a>
                <button class="settings-delete-btn" data-index="${index}">&times;</button>
            `;
            
            li.querySelector('.settings-delete-btn').addEventListener('click', (e) => {
                const linkIndex = parseInt(e.currentTarget.dataset.index, 10);
                currentLinkTask.links.splice(linkIndex, 1);
                saveState();
                openLinkModal(taskId);
                openTaskModal(currentEditingTask.id);
            });
            existingLinksList.appendChild(li);
        });
        openModal(linkModal);
    };

    const openArchiveModal = () => {
        const archivedTasksList = get('archivedTasksList');
        const archivedNotesList = get('archivedNotesList');
        archivedTasksList.innerHTML = '';
        archivedNotesList.innerHTML = '';
        const archivedTasks = tasks.filter(t => t.isArchived);
        const archivedNotes = notes.filter(n => n.isArchived);

        if (archivedTasks.length === 0) {
            archivedTasksList.innerHTML = `<div class="empty-state"><i class="fas fa-archive"></i> <p>No tasks have been archived.</p></div>`;
        } else {
            archivedTasks.forEach(task => {
                const li = document.createElement('li');
                li.dataset.id = task.id;
                li.innerHTML = `
                    <div class="password-item-details">
                        <strong>${task.name}</strong>
                        <small>Archived on: ${formatDateForDisplay(task.archivedDate)}</small>
                    </div>
                    <div>
                        <button class="btn btn-secondary btn-sm restore-btn" data-type="task"><i class="fas fa-undo"></i> Restore</button>
                        <button class="btn btn-danger btn-sm delete-perm-btn" data-type="task"><i class="fas fa-trash-alt"></i> Delete Permanently</button>
                    </div>
                `;
                archivedTasksList.appendChild(li);
            });
        }
        if (archivedNotes.length === 0) {
            archivedNotesList.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard"></i> <p>No notes have been archived.</p></div>`;
        } else {
            archivedNotes.forEach(note => {
                 const li = document.createElement('li');
                li.dataset.id = note.id;
                li.innerHTML = `
                    <div class="password-item-details">
                        <strong>${note.title || 'Untitled Note'}</strong>
                        <small>Archived on: ${formatDateForDisplay(note.archivedDate)}</small>
                    </div>
                    <div>
                        <button class="btn btn-secondary btn-sm restore-btn" data-type="note"><i class="fas fa-undo"></i> Restore</button>
                        <button class="btn btn-danger btn-sm delete-perm-btn" data-type="note"><i class="fas fa-trash-alt"></i> Delete Permanently</button>
                    </div>
                `;
                archivedNotesList.appendChild(li);
            });
        }
        openModal(get('archiveModal'));
    };

    const renderDashboard = () => {
        const activeTasks = tasks.filter(t => !t.isArchived);
        const today = new Date();
        
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayLocalISO = `${year}-${month}-${day}`;
        
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const openCount = activeTasks.filter(t => t.status === 'Open').length;
        const inProgressCount = activeTasks.filter(t => t.status === 'In Progress').length;
        const closedCount = tasks.filter(t => t.status === 'Closed').length;
        const overdueCount = activeTasks.filter(t => new Date(t.dueDate) < today && t.status !== 'Closed').length;
        const dueTodayCount = activeTasks.filter(t => t.dueDate === todayLocalISO && t.status !== 'Closed').length;
        const dueThisWeekCount = activeTasks.filter(t => {
            const dueDate = new Date(t.dueDate);
            return dueDate > today && dueDate <= nextWeek && t.status !== 'Closed';
        }).length;
        const openNotesCount = notes.filter(n => !n.isArchived).length;
        
        get('stat-open').textContent = openCount;
        get('stat-in-progress').textContent = inProgressCount;
        get('stat-overdue').textContent = overdueCount;
        get('stat-due-today').textContent = dueTodayCount;
        get('stat-due-this-week').textContent = dueThisWeekCount;
        get('stat-closed').textContent = closedCount;
        get('stat-open-notes').textContent = openNotesCount;

        const urgentTasks = activeTasks.filter(t => t.isUrgent && t.status !== 'Closed').sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
        const upcomingTasks = activeTasks.filter(t => t.status !== 'Closed' && new Date(t.dueDate) >= today).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5);
        
        const urgentList = get('dashboard-urgent-tasks');
        urgentList.innerHTML = '';
        if (urgentTasks.length === 0) {
            urgentList.innerHTML = `<li class="empty-state" style="padding:1rem;"><p>No urgent tasks.</p></li>`;
        } else {
            urgentTasks.forEach(task => {
                const li = document.createElement('li');
                li.dataset.taskId = task.id;
                li.innerHTML = `
                    <div>
                        <div class="dashboard-task-item-title">${task.name}</div>
                        <div class="dashboard-task-item-due">Due: ${formatDateForDisplay(task.dueDate)}</div>
                    </div>
                    <span class="task-card-category-tag" style="background-color: ${categories[task.category] || '#ccc'}">${task.category}</span>
                `;
                urgentList.appendChild(li);
            });
        }

        const upcomingList = get('dashboard-upcoming-tasks');
        upcomingList.innerHTML = '';
        if (upcomingTasks.length === 0) {
            upcomingList.innerHTML = `<li class="empty-state" style="padding:1rem;"><p>No upcoming tasks.</p></li>`;
        } else {
            upcomingTasks.forEach(task => {
                const li = document.createElement('li');
                li.dataset.taskId = task.id;
                li.innerHTML = `
                    <div>
                        <div class="dashboard-task-item-title">${task.name}</div>
                        <div class="dashboard-task-item-due">Due: ${formatDateForDisplay(task.dueDate)}</div>
                    </div>
                    <span class="task-card-category-tag" style="background-color: ${categories[task.category] || '#ccc'}">${task.category}</span>
                `;
                upcomingList.appendChild(li);
            });
        }
    };

    // --- VIEW SWITCHING ---
    const switchView = (targetViewId) => {
        queryAll('.view-container').forEach(view => view.style.display = 'none');
        get(targetViewId).style.display = 'flex';
        
        const heading = get('main-app-heading');
        queryAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        
        const activeLink = get(targetViewId.replace('View', 'Link'));
        if(activeLink) {
            activeLink.parentElement.classList.add('active');
            heading.textContent = activeLink.querySelector('span').textContent;
        }

        if (targetViewId === 'homeView') {
            renderDashboard();
        } else if (targetViewId === 'tasksView') {
            renderAndPopulate();
        } else if (targetViewId === 'notesView') {
            renderNotes();
        } else if (targetViewId === 'manualView') {
            renderManual();
        }
        
        const isTaskView = targetViewId === 'tasksView';
        openNewTaskModalBtn.style.display = isTaskView ? 'flex' : 'none';
        get('search-container').style.display = isTaskView ? 'flex' : 'none';
    };

    // --- NOTES LOGIC ---
    const renderNotes = () => {
        notesContainer.innerHTML = '';
        const activeNotes = notes.filter(n => !n.isArchived);
        if (activeNotes.length === 0) {
            notesContainer.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard"></i> <p>You have no notes. Click 'Add New Note' to get started.</p></div>`;
        } else {
            activeNotes.forEach(note => {
                const noteCard = document.createElement('div');
                noteCard.className = 'note-card';
                noteCard.dataset.id = note.id;
                noteCard.innerHTML = `
                    <div class="note-card-header">
                        <input type="text" class="note-title" value="${note.title}" placeholder="Note Title...">
                        <div class="note-card-actions">
                            <button class="archive-note-btn" title="Archive Note"><i class="fas fa-archive"></i></button>
                            <button class="delete-note-btn" title="Delete Note"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                    <textarea class="note-body" placeholder="Write your note here...">${note.body}</textarea>
                `;
                notesContainer.appendChild(noteCard);
            });
        }
    };
    
    const addNote = () => {
        const newNote = {
            id: getNextId('NOTE'),
            title: '',
            body: '',
            isArchived: false,
        };
        notes.push(newNote);
        renderNotes();
    };

    const saveNotes = () => {
        const noteCards = queryAll('.note-card');
        const activeNotes = notes.filter(n => !n.isArchived);
        
        activeNotes.forEach(note => {
            const card = document.querySelector(`.note-card[data-id="${note.id}"]`);
            if (card) {
                note.title = card.querySelector('.note-title').value;
                note.body = card.querySelector('.note-body').value;
            }
        });
        
        saveState();
        showToast('Notes saved successfully!');
    };

    const deleteNote = (noteId) => {
        showInAppConfirmation('Are you sure you want to permanently delete this note?', () => {
            notes = notes.filter(note => note.id !== noteId);
            saveState();
            renderNotes();
            showInAppNotification('Note deleted permanently.', 'success', get('notesView'));
        });
    };

    const archiveNote = (noteId) => {
        const note = notes.find(n => n.id === noteId);
        showInAppConfirmation(`Are you sure you want to archive the note "${note.title || 'Untitled Note'}"?`, () => {
            if (note) {
                note.isArchived = true;
                note.archivedDate = new Date().toISOString();
                saveState();
                renderNotes();
                showToast('Note archived!');
            }
        });
    };

    const restoreArchivedItem = (itemId, itemType) => {
        if (itemType === 'task') {
            const task = tasks.find(t => t.id === itemId);
            if (task) {
                task.isArchived = false;
                task.archivedDate = null;
            }
        } else if (itemType === 'note') {
             const note = notes.find(n => n.id === itemId);
            if (note) {
                note.isArchived = false;
                note.archivedDate = null;
            }
        }
        saveState();
        openArchiveModal();
    };

    const deleteArchivedItem = (itemId, itemType) => {
        showInAppConfirmation('Are you sure you want to permanently delete this item? This action cannot be undone.', () => {
            if (itemType === 'task') {
                tasks = tasks.filter(t => t.id !== itemId);
                showInAppNotification('Task deleted permanently.', 'success', get('archiveModal').querySelector('.modal-content'));
            } else if (itemType === 'note') {
                notes = notes.filter(n => n.id !== itemId);
                showInAppNotification('Note deleted permanently.', 'success', get('archiveModal').querySelector('.modal-content'));
            }
            saveState();
            openArchiveModal();
        });
    };

    const renderManual = () => {
        const manualHtml = `
            <h3>1. The Dashboard (Home View)</h3>
            <p>The Home view serves as your main command center, offering a real-time overview of your workload.</p>
            <h4>Stats Grid</h4>
            <ul>
                <li><strong>Open</strong>: Number of tasks with a status of "Open".</li>
                <li><strong>In Progress</strong>: Number of tasks with a status of "In Progress".</li>
                <li><strong>Overdue</strong>: Number of active tasks whose due date has passed.</li>
                <li><strong>Due Today</strong>: Number of active tasks due on the current day.</li>
                <li><strong>Due This Week</strong>: Number of active tasks with a due date within the next seven days, excluding those due today.</li>
                <li><strong>Closed</strong>: Total count of all tasks that have been completed.</li>
                <li><strong>Open Notes</strong>: The count of your active notes that have not been archived.</li>
            </ul>

            <h3>2. Task Management (Tasks View)</h3>
            <p>The Tasks view is where you manage individual work items using a Kanban board.</p>
            <h4>Kanban Board Navigation</h4>
            <p>The board organizes tasks into columns by their status. You can change a task's status by simply dragging and dropping its card into a different column.</p>
            <h4>Filters and Sorting</h4>
            <p>Use the controls at the top of the page to customize your view.</p>
            <ul>
                <li><strong>Filter by Assignee/Category</strong>: Narrow down tasks by who is responsible or what type of work it is.</li>
                <li><strong>Sort by Due Date</strong>: Arrange tasks by oldest or newest due date.</li>
                <li><strong>Closed Tasks</strong>: Toggle between showing only tasks closed in the last 7 days or showing all closed tasks.</li>
            </ul>
            <h4>Task Creation</h4>
            <p>Click the "Add Task" button in the top-right to create a new task. The modal allows you to define a task name, description, due date, assignee, and category.</p>
            <h4>Task Details (Modal)</h4>
            <p>Clicking a task card opens a detailed modal with comprehensive management options.</p>
            <ul>
                <li><strong>Main Details</strong>: Edit the core information, including a progress slider for "In Progress" tasks.</li>
                <li><strong>Sub-Tasks</strong>: Add nested sub-tasks with their own assignees and due dates to break down complex work.</li>
                <li><strong>Action Log</strong>: The log automatically records changes and allows you to manually add notes or "chasers" (e.g., "Email sent").</li>
                <li><strong>Links</strong>: Add and manage external URLs relevant to the task.</li>
                <li><strong>Action Buttons</strong>: Use the buttons to save, archive, or permanently delete the task.</li>
            </ul>

            <h3>3. Notes Management (Notes View)</h3>
            <p>The Notes view is a space for capturing quick thoughts and reference information.</p>
            <h4>Notes Creation</h4>
            <p>Click the "Add New Note" button to create a new, empty note card.</p>
            <h4>Saving Notes</h4>
            <p>All notes are saved to local storage when you click the "Save All Notes" button. This action saves the current state of all notes, including any changes to their content.</p>
            <h4>Managing Notes</h4>
            <p>Each note card is an editable text area. Use the buttons in the top-right of each note card to manage it.</p>
            <ul>
                <li><strong>Archive</strong>: The archive icon moves a note out of the main view and into the archive. This is the recommended action for notes that are no longer needed but may be useful in the future.</li>
                <li><strong>Delete</strong>: The trash icon will permanently delete the note. A confirmation prompt will appear before deletion.</li>
            </ul>

            <h3>4. Reports</h3>
            <p>The Reports view provides functionality to generate printable reports from your task data.</p>
            <ul>
                <li><strong>Report by Assignee</strong>: Generates a detailed report of all active tasks, grouped by the selected users.</li>
                <li><strong>Overdue Tasks Report</strong>: Creates a clear report of all tasks that are past their due date and have not been closed.</li>
            </ul>

            <h3>5. Settings</h3>
            <p>The Settings modal, accessible via the gear icon, provides global configuration options.</p>
            <h4>General Settings</h4>
            <ul>
                <li><strong>Appearance</strong>: A toggle switch to change the application's theme between Light and Dark Mode.</li>
                <li><strong>Data Management</strong>: Export all application data to a JSON file or import a backup file.</li>
                <li><strong>Archived Items</strong>: A dedicated section to view and manage your archived tasks and notes.</li>
            </ul>
            <h4>Archived Items Management</h4>
            <p>The archive modal is split into two lists: one for archived tasks and one for archived notes.</p>
            <ul>
                <li><strong>Restore</strong>: Moves the item back to its original view.</li>
                <li><strong>Delete Permanently</strong>: Deletes the item permanently from the application. This action cannot be undone.</li>
            </ul>
            <h4>Other Settings</h4>
            <ul>
                <li><strong>People & Categories</strong>: Manage the names and colors for your team and task types. An in-app notification will warn you if you cannot delete an item because it is in use.</li>
                <li><strong>Passwords & Websites</strong>: Manage basic credentials. This is **NOT** a secure password vault; data is stored unencrypted.</li>
            </ul>
        `;
        manualContent.innerHTML = manualHtml;
    };
    

    // --- INITIALIZATION ---
    const initialize = () => {
        // Theme initialization
        const themeToggle = get('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.dataset.theme = savedTheme;
        themeToggle.checked = savedTheme === 'dark';

        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            document.body.dataset.theme = newTheme;
            localStorage.setItem('theme', newTheme);
        });

        loadData();
        addSampleData();
        switchView('homeView');

        // Sidebar navigation
        get('homeLink').addEventListener('click', (e) => { e.preventDefault(); switchView('homeView'); });
        get('tasksLink').addEventListener('click', (e) => { e.preventDefault(); switchView('tasksView'); });
        get('notesLink').addEventListener('click', (e) => { e.preventDefault(); switchView('notesView'); });
        get('manualLink').addEventListener('click', (e) => { e.preventDefault(); switchView('manualView'); });
        get('sitesLink').addEventListener('click', (e) => { e.preventDefault(); switchView('sitesView'); });
        get('commercialLink').addEventListener('click', (e) => { e.preventDefault(); switchView('commercialView'); });
        reportsLink.addEventListener('click', (e) => { e.preventDefault(); switchView('reportsView'); });
        taskStatusSelect.addEventListener('change', (e) => {
            if (e.target.value === 'In Progress') {
                progressContainer.style.display = 'block';
            } else {
                progressContainer.style.display = 'none';
            }
        });
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const assignee = taskAssigneeSelect.value, category = categorySelect.value;
            if (!assignee || !category) {
                showInAppNotification('Main task must have an assignee and category.', 'error', get('taskModal').querySelector('.form-body'));
                return;
            }
            
            const oldStatus = currentEditingTask ? currentEditingTask.status : null;
            
            const newStatus = taskStatusSelect.value;

            let progress = null;
            if (newStatus === 'In Progress') {
                const progressVal = parseInt(taskProgressInput.value, 10);
                if (!isNaN(progressVal) && progressVal >= 0 && progressVal <= 100) {
                   
                    progress = progressVal;
                }
            }

            const taskData = {
                name: taskNameInput.value,
                description: taskDescriptionInput.value,
                dueDate: dueDateInput.value,
   
                assignee,
                category,
                status: newStatus,
                isUrgent: taskUrgentInput.checked,
                progress: progress,
                closedDate: newStatus === 'Closed' 
                    ? (currentEditingTask?.closedDate || new Date().toISOString()) : null
            };
            if (currentEditingTask) {
                Object.assign(currentEditingTask, taskData);
                if (newStatus === 'Closed' && oldStatus !== 'Closed') {
                    logAction(currentEditingTask, `Task status changed to Closed.`, currentEditingTask.assignee);
                }
            } else {
                const newTask = { id: getNextId(), ...sanitizeTask({}), ...taskData };
                updateMainTaskDueDate(newTask);
                tasks.push(newTask);
            }
            saveState();
            closeModal(taskModal);
        });
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openSettingsModal();
        });
        queryAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                queryAll('.settings-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                queryAll('.settings-tab-content').forEach(content => content.classList.remove('active'));
            
                get(`${targetTab}Tab`).classList.add('active');
            });
        });
        openPasswordModalBtn.addEventListener('click', () => {
            openPasswordModal();
        });

        openWebsiteModalBtn.addEventListener('click', () => {
            openWebsiteModal();
        });
        settingsPersonForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = settingsPersonNameInput.value.trim();
            if (newName && !people[newName]) {
                people[newName] = generateRandomColor();
                saveState();
                openSettingsModal();
                showInAppNotification(`New person "${newName}" added.`, 'success', get('peopleTab'));
                settingsPersonNameInput.value = '';
            } else if (people[newName]) {
                showInAppNotification(`A person named "${newName}" already exists.`, 'error', get('peopleTab'));
            }
        });
        settingsCategoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newCat = settingsCategoryNameInput.value.trim();
            if (newCat && !categories[newCat]) {
                categories[newCat] = generateRandomColor();
                saveState();
                openSettingsModal();
                showInAppNotification(`New category "${newCat}" added.`, 'success', get('categoriesTab'));
                settingsCategoryNameInput.value = '';
            } else if (categories[newCat]) {
                showInAppNotification(`A category named "${newCat}" already exists.`, 'error', get('categoriesTab'));
            }
        });
        settingsPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = passwordIdInput.value;
            const service = settingsPasswordServiceInput.value.trim();
            const username = settingsPasswordUsernameInput.value.trim();
            const value = settingsPasswordValueInput.value.trim();
            const link = settingsPasswordLinkInput.value.trim();
          
            if (service && username && value) {
                if (id) {
                    const password = passwords.find(p => p.id === id);
                    if (password) {
                      
                        Object.assign(password, { service, username, value, link });
                        showInAppNotification(`Password for "${service}" updated.`, 'success', get('passwordsTab'));
                    }
                } else {
                    passwords.push(sanitizePassword({ service, username, value, link }));
                    showInAppNotification(`Password for "${service}" added.`, 'success', get('passwordsTab'));
                }
          
                saveState();
                closeModal(passwordModal);
                openSettingsModal();
            }
        });

        get('settingsWebsiteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = get('websiteId').value;
            const service = get('settingsWebsiteService').value.trim();
            const username = get('settingsWebsiteUsername').value.trim();
            const value = get('settingsWebsiteValue').value.trim();
            const link = get('settingsWebsiteLink').value.trim();
            if (service && username && value) {
                if (id) {
                    const website = websites.find(w => w.id === id);
                    if (website) {
                        Object.assign(website, { service, username, value, link });
                        showInAppNotification(`Website "${service}" updated.`, 'success', get('websitesTab'));
                    }
                } else {
                    websites.push(sanitizeWebsite({ service, username, value, link }));
                    showInAppNotification(`Website "${service}" added.`, 'success', get('websitesTab'));
                }
                saveState();
                closeModal(get('websiteModal'));
                openSettingsModal();
            }
        });
        linkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentLinkTask) return;
            const name = linkNameInput.value.trim();
            const url = linkUrlInput.value.trim();
            if (name && url) {
                if (!currentLinkTask.links) currentLinkTask.links = [];
     
                currentLinkTask.links.push({ name, url });
                saveState();
                openLinkModal(currentLinkTask.id);
                openTaskModal(currentEditingTask.id);
                linkForm.reset();
            }
        });
        get('mainTaskLinksList').parentElement.querySelector('.add-link-btn-header').addEventListener('click', () => {
            openLinkModal(currentEditingTask.id);
        });
        openNewTaskModalBtn.addEventListener('click', () => openTaskModal());
        deleteTaskBtn.addEventListener('click', () => {
             showInAppConfirmation('Are you sure you want to delete this task? This action cannot be undone.', () => {
                 if (currentEditingTask) {
                    tasks = tasks.filter(t => t.id !== currentEditingTask.id);
                    saveState();
                    closeModal(taskModal);
                    showToast('Task deleted!');
                }
            });
        });
        archiveTaskBtn.addEventListener('click', () => {
            showInAppConfirmation('Are you sure you want to archive this task?', () => {
                if (currentEditingTask) {
                    const task = findTaskById(currentEditingTask.id);
                    task.isArchived = true;
                    task.archivedDate = new Date().toISOString();
                    saveState();
                    closeModal(taskModal);
                    showToast('Task archived!');
                }
            });
        });
        addNewCategoryBtn.addEventListener('click', () => openModal(categoryModal));
        addNewPersonBtn.addEventListener('click', () => { activeAssigneeSelect = taskAssigneeSelect; openModal(personModal); });
        
        // Reports View Listeners
        get('openAssigneeReportConfigBtn').addEventListener('click', () => {
            const userSelection = get('reportUserSelectionContainer');
            const activeUsers = new Set();
            tasks.filter(t => !t.isArchived).forEach(task => getAllAssignees(task).forEach(assignee => activeUsers.add(assignee)));
            userSelection.innerHTML = `<div><label><input type="checkbox" id="reportSelectAllUsers"> <strong>Select All</strong></label></div>`;
            Array.from(activeUsers).sort().forEach(user => {
                userSelection.innerHTML += `<div><label><input type="checkbox" class="report-user-checkbox" value="${user}"> ${user}</label></div>`;
            });
            get('reportSelectAllUsers').addEventListener('change', (e) => queryAll('.report-user-checkbox').forEach(cb => cb.checked = e.target.checked));
            openModal(get('reportConfigModal'));
        });
        get('generateAssigneeReportBtn').addEventListener('click', generateAssigneeReport);
        get('generateOverdueReportBtn').addEventListener('click', generateOverdueReport);
        get('generateCategoryReportBtn').addEventListener('click', generateCategoryReport);
        
        [assigneeFilter, categoryFilter, sortByDate, closedTasksFilter].forEach(el => el.addEventListener('change', renderAndPopulate));
        globalSearchInput.addEventListener('input', renderAndPopulate);
        categoryForm.addEventListener('submit', e => { e.preventDefault(); const newCat = newCategoryNameInput.value.trim(); if (newCat && !categories[newCat]) { categories[newCat] = generateRandomColor(); saveState(); categorySelect.value = newCat; } categoryForm.reset(); closeModal(categoryModal); });
        personForm.addEventListener('submit', e => { e.preventDefault(); const newName = newPersonNameInput.value.trim(); if (newName) { if (!people[newName]) { people[newName] = generateRandomColor(); saveState(); populateAllDropdowns(); } if (activeAssigneeSelect) { activeAssigneeSelect.value = newName; } } personForm.reset(); closeModal(personModal); });
        taskDescriptionInput.addEventListener('input', e => { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px'; });
        queryAll('.modal').forEach(modal => { modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal); }); modal.querySelector('.close-button')?.addEventListener('click', () => closeModal(modal)); });
        
        // Data management event listeners
        get('exportDataBtn').addEventListener('click', () => {
            const data = { tasks, categories, people, passwords, websites, notes };
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `taskboard-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Data exported successfully!');
        });
        
        get('importDataBtn').addEventListener('click', () => get('importFileInput').click());
        get('importFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            showInAppConfirmation('Are you sure you want to import data? This will overwrite all current data.', () => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (data && data.tasks && data.people && data.categories) {
                            tasks = (data.tasks || []).map(sanitizeTask);
                            people = data.people || {};
                            categories = data.categories || {};
                            passwords = (data.passwords || []).map(sanitizePassword);
                            websites = (data.websites || []).map(sanitizeWebsite);
                            notes = (data.notes || []).map(sanitizeNote);
                            saveState();
                            showToast('Data imported successfully!');
                            closeModal(settingsModal);
                        } else {
                            showInAppNotification('Invalid data file. Please ensure it is a valid JSON backup.', 'error', get('generalTab'));
                        }
                    } catch (err) {
                        showInAppNotification('Failed to parse data file. Please ensure it is a valid JSON backup.', 'error', get('generalTab'));
                        console.error("Import error:", err);
                    } finally {
                        e.target.value = '';
                    }
                };
                reader.readAsText(file);
            });
        });

        get('viewArchivedBtn').addEventListener('click', openArchiveModal);

        get('archiveModal').addEventListener('click', (e) => {
            const restoreBtn = e.target.closest('.restore-btn');
            const deleteBtn = e.target.closest('.delete-perm-btn');
            const li = e.target.closest('li');
            if (!li) return;
            const itemId = li.dataset.id;
            const itemType = restoreBtn ? restoreBtn.dataset.type : (deleteBtn ? deleteBtn.dataset.type : null);
            
            if (restoreBtn) {
                restoreArchivedItem(itemId, itemType);
                showInAppNotification('Item restored successfully.', 'success', get('archiveModal').querySelector('.modal-content'));
            }

            if (deleteBtn) {
                deleteArchivedItem(itemId, itemType);
            }
        });

        ['dashboard-urgent-tasks', 'dashboard-upcoming-tasks'].forEach(id => {
            get(id).addEventListener('click', (e) => {
                const li = e.target.closest('li');
                if (li && li.dataset.taskId) {
                    openTaskModal(li.dataset.taskId);
                }
            });
        });
        
        // Notes event listeners
        if (addNoteBtn) addNoteBtn.addEventListener('click', addNote);
        if (saveNotesBtn) saveNotesBtn.addEventListener('click', saveNotes);
        if (notesContainer) {
            notesContainer.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-note-btn');
                const archiveBtn = e.target.closest('.archive-note-btn');
                const noteCard = e.target.closest('.note-card');
                if (!noteCard) return;

                if (deleteBtn) {
                    deleteNote(noteCard.dataset.id);
                }
                if (archiveBtn) {
                    archiveNote(noteCard.dataset.id);
                }
            });
        }
        
        if(notesContainer) {
             notesContainer.addEventListener('input', (e) => {
                 if(e.target.classList.contains('note-title') || e.target.classList.contains('note-body')) {
                     const noteCard = e.target.closest('.note-card');
                     if(noteCard) {
                         const note = notes.find(n => n.id === noteCard.dataset.id);
                         if(note) {
                             note.title = noteCard.querySelector('.note-title').value;
                             note.body = noteCard.querySelector('.note-body').value;
                         }
                     }
                 }
             });
        }

        renderAndPopulate();
    };
    initialize();
})();
