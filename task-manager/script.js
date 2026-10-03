/**
 * Task Manager - Client-side Controller connected to Express Backend
 * Uses fetch() API for server communication with /tasks and /tasks/:name endpoints.
 */

// Initial demo tasks available to restore/seed if desired
const INITIAL_DEMO_TASKS = [
    {
        title: 'adsf',
        details: 'Testing draft notes and quick memo items.'
    },
    {
        title: 'backendoeftxfhh',
        details: 'Backend Express routing, middleware architecture, and API endpoints setup.'
    },
    {
        title: 'chacha.md',
        details: 'Project documentation, setup instructions, and feature roadmap.'
    },
    {
        title: 'dbfiles',
        details: 'Database connection configuration, schema design, and query optimization.'
    },
    {
        title: 'helo.js',
        details: 'JavaScript utility functions, event listeners, and DOM manipulation scripts.'
    },
    {
        title: 'kushal',
        details: 'Tasks delegated to Kushal for code review, quality assurance, and testing.'
    },
    {
        title: 'nilotpalfrontend',
        details: 'Frontend styling, responsive grid layouts, card hover effects, and UI components.'
    }
];

// App State (in-memory, synchronized with backend via fetch)
let tasks = [];
let currentFilter = '';
let currentSort = 'default'; // 'default' | 'alpha' | 'newest'
let activeTask = null; // currently selected task for modal

// DOM Elements
const taskForm = document.getElementById('taskForm');
const taskTitleInput = document.getElementById('taskTitle');
const taskDetailsInput = document.getElementById('taskDetails');
const tasksGrid = document.getElementById('tasksGrid');
const emptyState = document.getElementById('emptyState');
const taskCountBadge = document.getElementById('taskCountBadge');
const searchInput = document.getElementById('searchInput');
const resetBtn = document.getElementById('resetBtn');
const restoreDemoBtn = document.getElementById('restoreDemoBtn');
const sortChips = document.querySelectorAll('.sort-chip');

// Modals
const taskModal = document.getElementById('taskModal');
const modalTaskTitle = document.getElementById('modalTaskTitle');
const modalTaskContent = document.getElementById('modalTaskContent');
const modalTaskDate = document.getElementById('modalTaskDate');
const modalTaskLength = document.getElementById('modalTaskLength');
const closeModalBtn = document.getElementById('closeModalBtn');
const downloadTaskBtn = document.getElementById('downloadTaskBtn');
const copyTaskBtn = document.getElementById('copyTaskBtn');
const editTaskBtn = document.getElementById('editTaskBtn');
const deleteTaskModalBtn = document.getElementById('deleteTaskModalBtn');

// Edit Modal
const editModal = document.getElementById('editModal');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskTitle = document.getElementById('editTaskTitle');
const editTaskDetails = document.getElementById('editTaskDetails');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

// --- Initialization ---
function init() {
    setupEventListeners();
    loadTasks();
}

/**
 * Requirement 5: Fetch all tasks from GET /tasks on page load
 */
async function loadTasks() {
    try {
        const response = await fetch('/tasks');
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        // Map backend response: [{ title, preview }]
        tasks = data.map((item, index) => ({
            id: item.title,
            title: item.title,
            preview: item.preview || '',
            orderIndex: index
        }));

        renderTasks();
    } catch (error) {
        console.error('Error fetching tasks from server:', error);
        showToast('Could not load tasks from server', 'danger');
        renderTasks();
    }
}

/**
 * Render task cards to the grid according to currentFilter and currentSort
 */
function renderTasks() {
    let filtered = tasks.filter(t => {
        const term = currentFilter.toLowerCase();
        const titleMatch = t.title && t.title.toLowerCase().includes(term);
        const previewMatch = t.preview && t.preview.toLowerCase().includes(term);
        return titleMatch || previewMatch;
    });

    if (currentSort === 'alpha') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (currentSort === 'newest') {
        filtered.sort((a, b) => b.orderIndex - a.orderIndex);
    } else {
        filtered.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    // Update count badge
    taskCountBadge.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
        tasksGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        emptyState.style.display = '';
        return;
    }

    emptyState.classList.add('hidden');
    emptyState.style.display = 'none';
    tasksGrid.innerHTML = filtered.map(task => {
        const displayTitle = task.title.endsWith('.txt') ? task.title : `${task.title}.txt`;
        return `
            <article class="task-card" data-title="${escapeHtml(task.title)}">
                <div class="card-header">
                    <h3 class="task-card-title" title="${escapeHtml(displayTitle)}">${escapeHtml(displayTitle)}</h3>
                    <div class="card-quick-actions" onclick="event.stopPropagation()">
                        <button class="quick-action-btn" title="Copy Content" onclick="handleCopy('${escapeJsParam(task.title)}')">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <button class="quick-action-btn" title="Edit File" onclick="openEditModal('${escapeJsParam(task.title)}')">
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button class="quick-action-btn delete-btn" title="Delete File" onclick="handleDelete('${escapeJsParam(task.title)}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
                <div class="card-footer">
                    <a href="#" class="read-more-link" onclick="handleOpenModal('${escapeJsParam(task.title)}', event)">
                        read more
                    </a>
                </div>
            </article>
        `;
    }).join('');

    // Attach card click listener to open modal
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-quick-actions') || e.target.closest('.read-more-link')) return;
            const title = card.getAttribute('data-title');
            handleOpenModal(title);
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeJsParam(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * Setup DOM event listeners
 */
function setupEventListeners() {
    // Requirement 5: Form submission -> POST /tasks
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = taskTitleInput.value.trim();
        const description = taskDetailsInput.value.trim();

        if (!title) {
            showToast('Please enter a task title', 'danger');
            return;
        }

        try {
            const response = await fetch('/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    description: description
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error (${response.status})`);
            }

            taskTitleInput.value = '';
            taskDetailsInput.value = '';
            taskTitleInput.focus();

            showToast(`Created task successfully!`, 'success');
            await loadTasks();
        } catch (err) {
            console.error('Error creating task:', err);
            showToast(err.message || 'Failed to create task', 'danger');
        }
    });

    // Search filter
    searchInput.addEventListener('input', (e) => {
        currentFilter = e.target.value.trim();
        renderTasks();
    });

    // Reset / Restore demo tasks
    resetBtn.addEventListener('click', () => {
        if (confirm('Create sample demo tasks on the server?')) {
            seedDemoTasks();
        }
    });

    restoreDemoBtn.addEventListener('click', () => {
        seedDemoTasks();
    });

    // Sort Chips
    sortChips.forEach(chip => {
        chip.addEventListener('click', () => {
            sortChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentSort = chip.getAttribute('data-sort');
            renderTasks();
        });
    });

    // Modal controls
    closeModalBtn.addEventListener('click', closeModal);
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal();
    });

    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });

    // Keyboard navigation (ESC key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeEditModal();
        }
    });

    // Modal Action Buttons
    copyTaskBtn.addEventListener('click', () => {
        if (activeTask) handleCopy(activeTask.title);
    });

    downloadTaskBtn.addEventListener('click', () => {
        if (activeTask) downloadFile(activeTask.title, activeTask.content);
    });

    deleteTaskModalBtn.addEventListener('click', async () => {
        if (activeTask) {
            const title = activeTask.title;
            closeModal();
            await handleDelete(title);
        }
    });

    editTaskBtn.addEventListener('click', () => {
        if (activeTask) {
            const title = activeTask.title;
            closeModal();
            openEditModal(title);
        }
    });

    // Edit form submission -> POST /tasks to overwrite
    editTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = editTaskTitle.value.trim();
        const details = editTaskDetails.value.trim();

        if (!title) return;

        try {
            const response = await fetch('/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    description: details
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update task');
            }

            closeEditModal();
            showToast(`Updated "${title}"`, 'success');
            await loadTasks();
        } catch (err) {
            console.error('Error saving edited task:', err);
            showToast(err.message || 'Failed to update task', 'danger');
        }
    });
}

/**
 * Requirement 5: "read more" calls GET /tasks/:name and shows full task in modal
 */
window.handleOpenModal = async function(taskTitle, event) {
    if (event) event.preventDefault();
    if (!taskTitle) return;

    try {
        const response = await fetch(`/tasks/${encodeURIComponent(taskTitle)}`);
        if (!response.ok) {
            throw new Error(`Failed to load task details (${response.status})`);
        }

        let fullContent = '';
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await response.json();
            fullContent = data.content !== undefined ? data.content : (data.description || '');
        } else {
            fullContent = await response.text();
        }

        const displayFileName = taskTitle.endsWith('.txt') ? taskTitle : `${taskTitle}.txt`;
        activeTask = {
            title: taskTitle,
            fileName: displayFileName,
            content: fullContent
        };

        modalTaskTitle.textContent = displayFileName;
        modalTaskContent.textContent = fullContent || '(Empty file)';
        modalTaskDate.innerHTML = `<i class="fa-regular fa-file"></i> ${displayFileName}`;
        modalTaskLength.innerHTML = `<i class="fa-solid fa-text-width"></i> ${fullContent.length} chars`;

        taskModal.classList.remove('hidden');
    } catch (err) {
        console.error('Error opening task modal:', err);
        showToast(err.message || 'Failed to open task', 'danger');
    }
};

function closeModal() {
    taskModal.classList.add('hidden');
    activeTask = null;
}

window.openEditModal = async function(taskTitle) {
    try {
        const response = await fetch(`/tasks/${encodeURIComponent(taskTitle)}`);
        let content = '';
        if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await response.json();
                content = data.content !== undefined ? data.content : (data.description || '');
            } else {
                content = await response.text();
            }
        }

        editTaskTitle.value = taskTitle;
        editTaskDetails.value = content;
        editModal.classList.remove('hidden');
    } catch (err) {
        console.error('Error opening edit modal:', err);
        showToast('Failed to load task for editing', 'danger');
    }
};

function closeEditModal() {
    editModal.classList.add('hidden');
}

/**
 * Handle deleting a task
 */
window.handleDelete = async function(taskTitle) {
    if (!confirm(`Are you sure you want to delete "${taskTitle}"?`)) return;

    try {
        const response = await fetch(`/tasks/${encodeURIComponent(taskTitle)}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to delete task');
        }

        showToast(`Deleted "${taskTitle}"`, 'danger');
        await loadTasks();
    } catch (err) {
        console.error('Error deleting task:', err);
        showToast(err.message || 'Failed to delete task', 'danger');
    }
};

/**
 * Handle copying a task's content
 */
window.handleCopy = async function(taskTitle) {
    try {
        let content = '';
        if (activeTask && activeTask.title === taskTitle) {
            content = activeTask.content;
        } else {
            const response = await fetch(`/tasks/${encodeURIComponent(taskTitle)}`);
            if (response.ok) {
                const data = await response.json().catch(() => null);
                content = data ? (data.content || data.description || '') : await response.text();
            }
        }

        const textToCopy = `${taskTitle}\n\n${content}`;
        await navigator.clipboard.writeText(textToCopy);
        showToast('Copied task to clipboard!', 'info');
    } catch (err) {
        console.error('Failed to copy task:', err);
        showToast('Failed to copy to clipboard', 'danger');
    }
};

/**
 * Download task as .txt file
 */
function downloadFile(taskTitle, content) {
    const filename = taskTitle.endsWith('.txt') ? taskTitle : `${taskTitle}.txt`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Downloaded "${filename}"`, 'success');
}

/**
 * Seed initial demo tasks into the backend via POST /tasks
 */
async function seedDemoTasks() {
    try {
        for (const demo of INITIAL_DEMO_TASKS) {
            await fetch('/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: demo.title,
                    description: demo.details
                })
            });
        }
        await loadTasks();
        showToast('Demo tasks added successfully', 'info');
    } catch (err) {
        console.error('Failed to seed demo tasks:', err);
        showToast('Failed to seed demo tasks', 'danger');
    }
}

/**
 * Toast Notification Helper
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'danger') iconClass = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', init);
