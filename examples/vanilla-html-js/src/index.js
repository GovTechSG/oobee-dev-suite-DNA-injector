/**
 * Task Management Application
 * 
 * This is a simple vanilla JavaScript application to demonstrate
 * oobee-genome source location tracking in pure HTML/CSS/JS projects.
 * 
 * Every element on the page has data-oobee-* attributes that track
 * its source file and line number - visible in DevTools!
 */

// DOM Elements
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const totalTasksSpan = document.getElementById('totalTasks');
const completedTasksSpan = document.getElementById('completedTasks');
const inspectBtn = document.getElementById('inspectBtn');

// Task Management
let tasks = [
  { id: 1, text: 'Inspect this element with DevTools (F12)', completed: false },
  { id: 2, text: 'Look for data-oobee-* attributes', completed: false },
  { id: 3, text: 'Check the source file and line number information', completed: false }
];

let nextId = 4;

/**
 * Render all tasks to the DOM
 */
function renderTasks() {
  taskList.innerHTML = '';

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `
      <input 
        type="checkbox" 
        class="task-checkbox" 
        ${task.completed ? 'checked' : ''}
        data-task-id="${task.id}"
      >
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="task-delete" data-task-id="${task.id}">Delete</button>
    `;

    taskList.appendChild(li);
  });

  updateStats();
  attachEventListeners();
}

/**
 * Attach event listeners to dynamically created elements
 */
function attachEventListeners() {
  // Checkbox listeners
  document.querySelectorAll('.task-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const taskId = parseInt(e.target.dataset.taskId);
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = e.target.checked;
        updateStats();
      }
    });
  });

  // Delete button listeners
  document.querySelectorAll('.task-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = parseInt(e.target.dataset.taskId);
      tasks = tasks.filter(t => t.id !== taskId);
      renderTasks();
    });
  });
}

/**
 * Add a new task
 */
function addTask() {
  const text = taskInput.value.trim();

  if (!text) {
    alert('Please enter a task');
    return;
  }

  tasks.push({
    id: nextId++,
    text: text,
    completed: false
  });

  taskInput.value = '';
  renderTasks();
}

/**
 * Update task statistics
 */
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;

  totalTasksSpan.textContent = total;
  completedTasksSpan.textContent = completed;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Handle inspect button click
 */
function handleInspectClick() {
  alert(
    'Perfect! Now open DevTools (F12) and inspect this button.\n\n' +
    'You should see data-oobee-path, data-oobee-line, and data-oobee-column attributes.\n\n' +
    'These show you exactly where this element is defined in the source code!'
  );
}

// Event Listeners
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTask();
  }
});

inspectBtn.addEventListener('click', handleInspectClick);

// Initial render
renderTasks();

console.log('✅ Task app loaded!');
console.log('💡 Open DevTools (F12) and inspect elements to see oobee-genome source tracking!');
