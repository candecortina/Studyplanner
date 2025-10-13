// Studyplanner - Task Management App
class StudyPlanner {
  constructor() {
    this.tasks = this.loadTasks();
    this.currentView = 'home';
    this.editingTaskId = null;
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateStats();
    this.renderTasks();
    this.setTodayDate();
  }

  // Event binding
  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.getAttribute('data-link');
        this.navigateTo(view);
      });
    });

    // New task button
    document.getElementById('btn-new-task').addEventListener('click', () => {
      this.navigateTo('editor');
    });

    // Task form
    document.getElementById('task-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTask();
    });

    // Cancel button
    document.getElementById('btn-cancel').addEventListener('click', () => {
      this.navigateTo('home');
    });

    // Subject filter
    document.getElementById('subject-filter').addEventListener('change', (e) => {
      this.filterTasks(e.target.value);
    });

    // Task list events (delegated)
    document.getElementById('task-list').addEventListener('click', (e) => {
      if (e.target.classList.contains('task-checkbox')) {
        this.toggleTask(e.target.closest('.task-item').dataset.taskId);
      } else if (e.target.classList.contains('btn-edit')) {
        this.editTask(e.target.closest('.task-item').dataset.taskId);
      } else if (e.target.classList.contains('btn-delete')) {
        this.deleteTask(e.target.closest('.task-item').dataset.taskId);
      }
    });
  }

  // Navigation
  navigateTo(view) {
    // Update active view
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');

    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-link') === view) {
        btn.classList.add('active');
      }
    });

    this.currentView = view;

    // View-specific actions
    if (view === 'tasks') {
      this.renderTasks();
    } else if (view === 'editor') {
      this.resetForm();
    }
  }

  // Task management
  saveTask() {
    const form = document.getElementById('task-form');
    const formData = new FormData(form);
    
    const taskData = {
      title: formData.get('title').trim(),
      subject: formData.get('subject'),
      date: formData.get('date'),
      completed: false,
      createdAt: new Date().toISOString()
    };

    // Validation
    if (!taskData.title || !taskData.subject || !taskData.date) {
      this.showFormHint('Por favor completá todos los campos', 'error');
      return;
    }

    // Check for duplicate title
    const existingTask = this.tasks.find(task => 
      task.title.toLowerCase() === taskData.title.toLowerCase() && 
      task.id !== this.editingTaskId
    );

    if (existingTask) {
      this.showFormHint('Ya existe una tarea con ese título', 'error');
      return;
    }

    if (this.editingTaskId) {
      // Update existing task
      const taskIndex = this.tasks.findIndex(task => task.id === this.editingTaskId);
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...taskData };
        this.showFormHint('Tarea actualizada correctamente', 'success');
      }
    } else {
      // Create new task
      const newTask = {
        id: this.generateId(),
        ...taskData
      };
      this.tasks.push(newTask);
      this.showFormHint('Tarea creada correctamente', 'success');
    }

    this.saveTasks();
    this.updateStats();
    this.renderTasks();
    
    // Clear form and navigate
    setTimeout(() => {
      this.resetForm();
      this.navigateTo('home');
    }, 1500);
  }

  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks();
      this.updateStats();
      this.renderTasks();
    }
  }

  editTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      this.editingTaskId = taskId;
      document.getElementById('task-title').value = task.title;
      document.getElementById('task-subject').value = task.subject;
      document.getElementById('task-date').value = task.date;
      document.getElementById('editor-title').textContent = 'Editar tarea';
      this.navigateTo('editor');
    }
  }

  deleteTask(taskId) {
    if (confirm('¿Estás seguro de que querés eliminar esta tarea?')) {
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      this.saveTasks();
      this.updateStats();
      this.renderTasks();
    }
  }

  filterTasks(subject) {
    this.renderTasks(subject);
  }

  // Rendering
  renderTasks(filterSubject = '') {
    const taskList = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    
    let filteredTasks = this.tasks;
    if (filterSubject) {
      filteredTasks = this.tasks.filter(task => task.subject === filterSubject);
    }

    // Sort tasks: incomplete first, then by date
    filteredTasks.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed - b.completed;
      }
      return new Date(a.date) - new Date(b.date);
    });

    if (filteredTasks.length === 0) {
      taskList.innerHTML = '';
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    taskList.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
  }

  createTaskHTML(task) {
    const isOverdue = new Date(task.date) < new Date() && !task.completed;
    const dateFormatted = this.formatDate(task.date);
    
    return `
      <li class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}">
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" role="button" tabindex="0" aria-label="${task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}">
          ${task.completed ? '✓' : ''}
        </div>
        <div class="task-content">
          <div class="task-title ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="task-subject">${this.escapeHtml(task.subject)}</span>
            <span class="task-date ${isOverdue ? 'overdue' : ''}">${dateFormatted}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-small" onclick="event.stopPropagation()" aria-label="Editar tarea">
            <span class="btn-edit">✏️</span>
          </button>
          <button class="btn btn-small btn-danger" onclick="event.stopPropagation()" aria-label="Eliminar tarea">
            <span class="btn-delete">🗑️</span>
          </button>
        </div>
      </li>
    `;
  }

  updateStats() {
    const total = this.tasks.length;
    const done = this.tasks.filter(task => task.completed).length;
    const pending = total - done;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-done').textContent = done;
    document.getElementById('stat-pending').textContent = pending;
  }

  // Utility functions
  resetForm() {
    document.getElementById('task-form').reset();
    document.getElementById('editor-title').textContent = 'Nueva tarea';
    this.editingTaskId = null;
    this.showFormHint('', '');
    this.setTodayDate();
  }

  setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('task-date').value = today;
  }

  showFormHint(message, type) {
    const hint = document.getElementById('form-hint');
    hint.textContent = message;
    hint.className = `form-hint ${type}`;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana';
    } else {
      return date.toLocaleDateString('es-AR', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Local storage
  saveTasks() {
    localStorage.setItem('studyplanner-tasks', JSON.stringify(this.tasks));
  }

  loadTasks() {
    const saved = localStorage.getItem('studyplanner-tasks');
    return saved ? JSON.parse(saved) : [];
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new StudyPlanner();
});

// Add some sample data if no tasks exist
document.addEventListener('DOMContentLoaded', () => {
  const app = new StudyPlanner();
  
  // Add sample tasks if none exist
  if (app.tasks.length === 0) {
    const sampleTasks = [
      {
        id: 'sample-1',
        title: 'Resolver ejercicios de álgebra',
        subject: 'Matemática',
        date: new Date().toISOString().split('T')[0],
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-2',
        title: 'Leer capítulo 5 de historia',
        subject: 'Historia',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-3',
        title: 'Completar proyecto de programación',
        subject: 'Programación',
        date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // Day after tomorrow
        completed: true,
        createdAt: new Date().toISOString()
      }
    ];
    
    app.tasks = sampleTasks;
    app.saveTasks();
    app.updateStats();
    app.renderTasks();
  }
});
