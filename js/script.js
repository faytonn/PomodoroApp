import * as api from './api.js';
const { auth } = api;

function priorityToEnum(priority) {
  switch (priority) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 1;
  }
}
function enumToPriority(val) {
  switch (val) {
    case 3: return 'high';
    case 2: return 'medium';
    case 1: return 'low';
    default: return 'low';
  }
}


function qs(id)
{
  return document.getElementById(id);
}

const authC = qs('auth-container'),
      loginS = qs('login-section'),
      regS = qs('register-section'),
      appC = qs('app-container');

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    authC.classList.add('hidden');
    appC.classList.remove('hidden');
    qs('username-display').textContent = currentUser;
    
    // Load theme from user settings first, then fallback to localStorage
    loadSettings().then(settings => {
      const theme = settings?.theme || localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', theme);
      
      const themeIcon = document.querySelector('.theme-icon');
      if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
    });
    
    import('./theme.js').then(module => {
      module.initTheme();
    });
    
    import('./router.js').then(module => {
    });

    initHeader();
    initPomodoro();
  } else {
    authC.classList.remove('hidden');
    appC.classList.add('hidden');
  }
});

qs('show-register').onclick = e => {
  e.preventDefault();
  loginS.classList.add('hidden');
  regS.classList.remove('hidden');
  qs('reg-username').focus();
};

qs('show-login').onclick = e => {
  e.preventDefault();
  regS.classList.add('hidden');
  loginS.classList.remove('hidden');
  qs('login-username').focus();
};

qs('register-btn').onclick = async () => {
  const u = qs('reg-username').value.trim();
  const e = qs('reg-email').value.trim();
  const p = qs('reg-password').value;
  const c = qs('reg-confirm').value;
  
  qs('reg-error').textContent = '';
  
  if (!u || !e || !p) {
    qs('reg-error').textContent = 'Please fill in all fields';
    return;
  }
  
  if (!e.includes('@')) {
    qs('reg-error').textContent = 'Please enter a valid email address';
    return;
  }
  
  if (p.length < 6) {
    qs('reg-error').textContent = 'Password must be at least 6 characters';
    return;
  }
  
  if (p !== c) {
    qs('reg-error').textContent = 'Passwords do not match';
    return;
  }
  
  try {
    await auth.register(u, e, p);
    
    qs('reg-username').value = '';
    qs('reg-email').value = '';
    qs('reg-password').value = '';
    qs('reg-confirm').value = '';
    
    alert('Registration successful! Please log in.');
    loginS.classList.remove('hidden');
    regS.classList.add('hidden');
  } catch (error) {
    qs('reg-error').textContent = error.message || 'Registration failed';
  }
};

qs('login-btn').onclick = async () => {
  const loginId = qs('login-username').value.trim();
  const p = qs('login-password').value;
  
  qs('login-error').textContent = '';
  
  if (!loginId || !p) {
    qs('login-error').textContent = 'Please fill in all fields';
    return;
  }
  
  try {
    await auth.login(loginId, p);
    
    qs('login-username').value = '';
    qs('login-password').value = '';
    
    authC.classList.add('hidden');
    appC.classList.remove('hidden');
    qs('username-display').textContent = localStorage.getItem('currentUser');
    
    initHeader();
    initPomodoro();
  } catch (error) {
    qs('login-error').textContent = error.message || 'Invalid username/email or password';
  }
};

document.querySelector('[data-action="logout"]').onclick = () => {
  auth.logout();
  location.reload();
};


export function initPomodoro() 
{
  const currentUser = localStorage.getItem('currentUser');
  const root = qs('root');
  root.innerHTML = `
    <div class="timer-container">
      <div class="progress-ring">
        <svg class="progress-ring__circle" width="300" height="300">
          <circle class="progress-ring__circle-bg" cx="150" cy="150" r="140" />
          <circle class="progress-ring__circle-progress" cx="150" cy="150" r="140" />
        </svg>
        <div class="timer-display">
          <h2 id="mode-display">Work</h2>
          <div class="time">
            <span id="minutes">25</span>:<span id="seconds">00</span>
          </div>
        </div>
      </div>
      
      <div class="timer-controls">
        <button id="start">Start</button>
        <button id="pause">Pause</button>
        <button id="reset">Reset</button>
      </div>

      <div class="settings-panel">
        <h3>Timer Settings</h3>
        <div>
          <label>Work: <input type="number" id="work-input" min="1" max="60" value="25" /> min</label>
          <label>Short Break: <input type="number" id="short-break-input" min="1" max="60" value="5" /> min</label>
          <label>Long Break: <input type="number" id="long-break-input" min="1" max="60" value="15" /> min</label>
          <button id="save-settings">Save</button>
        </div>
      </div>
    </div>
  `;

  const workI = qs('work-input'),
        shortI = qs('short-break-input'),
        longI = qs('long-break-input'),
        saveBtn = qs('save-settings'),
        minE = qs('minutes'),
        secE = qs('seconds'),
        modeE = qs('mode-display'),
        start = qs('start'),
        pause = qs('pause'),
        reset = qs('reset'),
        progressRing = document.querySelector('.progress-ring__circle-progress');

  let settings = JSON.parse(localStorage.getItem('pomodoroSettings') || '{}'),
      defaults = 
      {
         work: 25, short: 5, long: 15 
  };
  settings = 
  {
     ...defaults, ...settings 
    };

  const radius = progressRing.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
  progressRing.style.strokeDashoffset = circumference;

  function setProgress(percent) 
  {
    const offset = circumference - (percent / 100 * circumference);
    progressRing.style.strokeDashoffset = offset;
  }

  function applySettings() 
  {
    settings.work = parseInt(workI.value) || 1;
    settings.short = parseInt(shortI.value) || 1;
    settings.long = parseInt(longI.value) || 1;
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    initDurations();
  }

  saveBtn.onclick = applySettings;
  [workI, shortI, longI].forEach(i => i.onchange = applySettings);

  let workDur, shortDur, longDur, timeLeft, mode = 'work', cycle = 0, intervalId;

  function initDurations() 
  {

    workDur = settings.work * 60;
    shortDur = settings.short * 60;
    longDur = settings.long * 60;
    timeLeft = workDur;
    mode = 'work';
    cycle = 0;
    updateDisplay();
  }

  function updateDisplay() {
    const m = Math.floor(timeLeft / 60),
          s = timeLeft % 60;
    minE.textContent = String(m).padStart(2, '0');
    secE.textContent = String(s).padStart(2, '0');
    
    const totalTime = mode === 'work' ? workDur : mode === 'short' ? shortDur : longDur;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;
    setProgress(progress);

    modeE.textContent = mode === 'work' ? 'Work' : mode === 'short' ? 'Short Break' : 'Long Break';
    modeE.style.color = mode === 'work' ? '#ff6b6b' : mode === 'short' ? '#4ecdc4' : '#ffd166';
  }

  function record() {
    const statsKey = `stats_${currentUser}`;
    const st = JSON.parse(localStorage.getItem(statsKey) || '{"pomodoros":[],"totalSeconds":0,"streak":0,"lastPomodoroDate":""}');
    
    // Get today's date in local timezone
    const now = new Date();
    const today = formatDate(now);
    const yesterday = formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    
    if (st.lastPomodoroDate === today) 
    {
      st.pomodoros.push(now.toISOString());
      st.totalSeconds += settings.work * 60;
    } 
    else if (!st.lastPomodoroDate || st.lastPomodoroDate === yesterday) 
    {
      st.streak++;
      st.pomodoros.push(now.toISOString());
      st.totalSeconds += settings.work * 60;
      st.lastPomodoroDate = today;
      showStreakCelebration(st.streak);
    } 
    else 
    {
      st.streak = 1;
      st.pomodoros.push(now.toISOString());
      st.totalSeconds += settings.work * 60;
      st.lastPomodoroDate = today;
      showStreakCelebration(1);
    }
    
    localStorage.setItem(statsKey, JSON.stringify(st));
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function showStreakCelebration(streak) 
  {
    const celebration = document.createElement('div');
    celebration.className = 'streak-celebration';
    celebration.innerHTML = `
      <button class="close-celebration">×</button>
      <div class="streak-fire">🔥</div>
      <div class="streak-count">${streak} Day${streak > 1 ? 's' : ''} Streak!</div>
      <div class="streak-message">${getStreakMessage(streak)}</div>
      <div class="streak-days">
        ${Array.from({length: 7}, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          const day = date.toLocaleDateString('en-US', { weekday: 'short' });
          const isCompleted = i < streak;
          return `<div class="streak-day ${isCompleted ? 'completed' : ''}">${day}</div>`;
        }).join('')}
      </div>
      <div class="streak-achievement">${getStreakAchievement(streak)}</div>
    `;
    
    document.body.appendChild(celebration);
    
    const sound = new Audio('sounds/celebration.wav');
    sound.play().catch(e => console.log('Audio playback failed:', e));
    
    createConfetti();
    
    setTimeout(() => celebration.classList.add('show'), 100);
    
    const closeButton = celebration.querySelector('.close-celebration');
    closeButton.onclick = () => {
      celebration.classList.remove('show');
      setTimeout(() => celebration.remove(), 500);
    };
  }

  function getStreakMessage(streak) {
    if (streak === 1) return "You're on fire! Keep it up!";
    if (streak === 3) return "3 days in a row! You're unstoppable!";
    if (streak === 7) return "A whole week! You're a productivity master!";
    if (streak === 14) return "Two weeks! You're building amazing habits!";
    if (streak === 30) return "A month of focus! You're incredible!";
    return "Keep the streak going!";
  }

  function getStreakAchievement(streak) {
    if (streak === 1) return "🎯 First Timer";
    if (streak === 3) return "🏆 Three Day Streak";
    if (streak === 7) return "🌟 Week Warrior";
    if (streak === 14) return "💪 Fortnight Focus";
    if (streak === 30) return "👑 Monthly Master";
    if (streak === 100) return "🔥 Century Club";
    return "";
  }

  function createConfetti() 
  {
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);
    
    const colors = ['#ff6b6b', '#4ecdc4', '#ffd166', '#06d6a0', '#118ab2'];
    
    for (let i = 0; i < 50; i++) 
    {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confettiContainer.appendChild(confetti);
    }
    
    setTimeout(() => confettiContainer.remove(), 3000);
  }

  function switchMode() 
  {
    if (mode === 'work') 
  {
      record();
      cycle++;
      if (cycle % 4 === 0) 
      {
        mode = 'long';
        timeLeft = longDur;
        playSound('break');
      } 
      else 
      {
        mode = 'short';
        timeLeft = shortDur;
        playSound('break');
      }
    } 
    else 
    {
      mode = 'work';
      timeLeft = workDur;
      playSound('work');
    }
    updateDisplay();
  }

  function playSound(type) 
  {
    const audio = new Audio(`sounds/${type}.wav`);
    audio.play().catch(e => console.log('Audio playback failed:', e));
  }

  function tick() 
  {
    if (timeLeft <= 0) 
    {
      clearInterval(intervalId);
      intervalId = null;
      switchMode();
      return;
    }
    timeLeft--;
    updateDisplay();
  }

  start.onclick = () => 
    {
    if (!intervalId) 
    {
      intervalId = setInterval(tick, 1000);
      start.textContent = 'Resume';
    }
  };

  pause.onclick = () => 
  {
    clearInterval(intervalId);
    intervalId = null;
    start.textContent = 'Start';
  };

  reset.onclick = () => 
  {
    clearInterval(intervalId);
    intervalId = null;
    start.textContent = 'Start';
    initDurations();
  };

  workI.value = settings.work;
  shortI.value = settings.short;
  longI.value = settings.long;
  initDurations();
}

export function initTodo() {
  const root = qs('root');
  root.innerHTML = `
    <div class="todo-container">
      <div class="todo-header">
        <h2>Tasks</h2>
        <div class="todo-filters">
          <select id="category-filter">
            <option value="all">All Categories</option>
            <option value="work">Work</option>
            <option value="study">Study</option>
            <option value="personal">Personal</option>
          </select>
          <select id="priority-filter">
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select id="status-filter">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>
      
      <div class="todo-input">
        <input type="text" id="new-task" placeholder="Add a new task..." />
        <select id="task-category">
          <option value="work">Work</option>
          <option value="study">Study</option>
          <option value="personal">Personal</option>
        </select>
        <select id="task-priority">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div class="due-date-toggle">
          <label>
            <input type="checkbox" id="has-due-date">
            Add Due Date
          </label>
        </div>
        <input type="datetime-local" id="task-due-date" class="hidden" />
        <select id="task-reminder">
          <option value="none">No Reminder</option>
          <option value="1day">1 Day Before</option>
          <option value="1week">1 Week Before</option>
          <option value="custom">Custom</option>
        </select>
        <input type="datetime-local" id="custom-reminder" class="hidden" />
        <button id="add-task">Add</button>
      </div>
      
      <ul id="task-list" class="task-list"></ul>
    </div>
  `;

  const inp = qs('new-task'),
        add = qs('add-task'),
        list = qs('task-list'),
        categoryFilter = qs('category-filter'),
        priorityFilter = qs('priority-filter'),
        statusFilter = qs('status-filter'),
        reminderSelect = qs('task-reminder'),
        customReminder = qs('custom-reminder'),
        hasDueDate = qs('has-due-date'),
        dueDateInput = qs('task-due-date');

  let tasks = [];

  hasDueDate.addEventListener('change', () => {
    dueDateInput.classList.toggle('hidden', !hasDueDate.checked);
    if (!hasDueDate.checked) {
      dueDateInput.value = '';
    }
  });

  reminderSelect.addEventListener('change', () => {
    customReminder.classList.toggle('hidden', reminderSelect.value !== 'custom');
    if (reminderSelect.value !== 'custom') {
      customReminder.value = '';
    }
  });

  async function loadTasks() {
    try {
      tasks = await api.tasks.getAll();
      render();
    } catch (error) {
      console.error('Failed to load tasks:', error);
      alert('Failed to load tasks. Please try again.');
    }
  }

  async function saveTask(task) {
    try {
      console.log('Saving task:', task);
      
      // Convert to backend format with all required fields
      const taskToSave = {
        id: task.id,
        userId: task.userId,
        title: task.title || task.text || "", // Ensure title is never null
        category: task.category || "work", // Default category if none provided
        priority: task.priority || 1, // Default to low priority if none provided
        dueDate: task.dueDate,
        progress: task.progress || (task.completed ? 2 : 0),
        completed: task.completed || false
      };

      // Remove any undefined or null values
      Object.keys(taskToSave).forEach(key => {
        if (taskToSave[key] === undefined || taskToSave[key] === null) {
          delete taskToSave[key];
        }
      });

      if (task.id) {
        console.log('Updating task:', taskToSave);
        await api.tasks.update(task.id, taskToSave);
      } else {
        console.log('Creating task:', taskToSave);
        await api.tasks.create(taskToSave);
      }
      await loadTasks();
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task. Please try again.');
    }
  }

  async function deleteTask(id) {
    try {
      console.log('Attempting to delete task with ID:', id);
      const result = await api.tasks.delete(id);
      console.log('Delete result:', result);
      await loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  }

  function render() {
    list.innerHTML = '';
    const category = categoryFilter.value;
    const priority = priorityFilter.value;
    const status = statusFilter.value;
    
    const filteredTasks = tasks.filter(task => {
      const categoryMatch = category === 'all' || task.category === category;
      const priorityMatch = priority === 'all' || task.priority === priorityToEnum(priority);
      const statusMatch = status === 'all' || 
        (status === 'completed' && task.progress === 2) ||
        (status === 'pending' && task.progress !== 2 && !isOverdue(task)) ||
        (status === 'overdue' && task.progress !== 2 && isOverdue(task));
      return categoryMatch && priorityMatch && statusMatch;
    });

    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.progress === 2 ? 'completed' : ''} priority-${task.priority} ${isOverdue(task) ? 'overdue' : ''}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.progress === 2;
      checkbox.onchange = async () => {
        try {
          const updatedTask = {
            ...task,
            progress: checkbox.checked ? 2 : 0,
            completed: checkbox.checked
          };
          await saveTask(updatedTask);
        } catch (error) {
          console.error('Failed to update task:', error);
          alert('Failed to update task. Please try again.');
        }
      };

      const taskContent = document.createElement('div');
      taskContent.className = 'task-content';
      
      const taskText = document.createElement('span');
      taskText.className = 'task-text';
      taskText.textContent = task.title || task.text || "";
      
      const taskMeta = document.createElement('div');
      taskMeta.className = 'task-meta';
      
      let metaHTML = `
        <span class="task-category">${task.category || 'work'}</span>
        <span class="task-priority">${priorityToText(task.priority)}</span>
      `;

      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const formattedDate = dueDate.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        metaHTML += `<span class="task-due-date">Due: ${formattedDate}</span>`;
      }

      taskMeta.innerHTML = metaHTML;

      taskContent.appendChild(taskText);
      taskContent.appendChild(taskMeta);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-task';
      deleteBtn.innerHTML = '✕';
      deleteBtn.onclick = async (e) => {
        e.preventDefault(); // Prevent any default button behavior
        e.stopPropagation(); // Stop event bubbling
        
        if (confirm('Are you sure you want to delete this task?')) {
          try {
            console.log('Delete button clicked for task ID:', task.id);
            await deleteTask(task.id);
          } catch (error) {
            console.error('Error in delete button handler:', error);
            alert('Failed to delete task. Please try again.');
          }
        }
      };

      li.appendChild(checkbox);
      li.appendChild(taskContent);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }

  function priorityToText(priority) {
    switch (priority) {
      case 3: return 'high';
      case 2: return 'medium';
      case 1: return 'low';
      default: return 'low';
    }
  }

  function isOverdue(task) {
    return task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
  }

  function formatReminder(reminder) {
    if (reminder === '1day') return '1 Day Before';
    if (reminder === '1week') return '1 Week Before';
    if (reminder === 'custom') return 'Custom';
    return '';
  }

  add.onclick = async () => {
    const text = inp.value.trim();
    if (!text) return;
    
    const category = qs('task-category').value;
    const priority = qs('task-priority').value;
    const hasDueDateChecked = qs('has-due-date').checked;
    const dueDate = hasDueDateChecked ? qs('task-due-date').value : null;
    
    try {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to create tasks');
            return;
        }

        const newTask = {
            text: text,
            category: category,
            priority: priorityToEnum(priority),
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            completed: false
        };
        
        await saveTask(newTask);
        
        // Clear the form
        inp.value = '';
        qs('has-due-date').checked = false;
        qs('task-due-date').value = '';
        qs('task-due-date').classList.add('hidden');
        qs('task-reminder').value = 'none';
        qs('custom-reminder').value = '';
        qs('custom-reminder').classList.add('hidden');
    } catch (error) {
        console.error('Failed to save task:', error);
        if (error.message.includes('401')) {
            alert('Your session has expired. Please log in again.');
            auth.logout();
            location.reload();
        } else {
            alert('Failed to save task. Please try again.');
        }
    }
  };

  inp.onkeypress = e => {
    if (e.key === 'Enter') add.click();
  };

  categoryFilter.onchange = render;
  priorityFilter.onchange = render;
  statusFilter.onchange = render;

  // Load tasks when the page loads
  loadTasks();
}

export function initStats() 
{

  const currentUser = localStorage.getItem('currentUser');

  const root = qs('root');
  const statsKey = `stats_${currentUser}`;
  const st = JSON.parse(localStorage.getItem(statsKey) || '{"pomodoros":[],"totalSeconds":0,"streak":0,"lastPomodoroDate":""}');
  
  const totalPomodoros = st.pomodoros.length;
  const totalHours = Math.floor(st.totalSeconds / 3600);
  const totalMinutes = Math.floor((st.totalSeconds % 3600) / 60);
  
  const currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();
  
  root.innerHTML = `
    <div class="stats-container">
      <section class="stats-overview">
        <h2>Your Productivity Stats</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Focus Time</h3>
            <p class="stat-value">${totalHours}h ${totalMinutes}m</p>
          </div>
          <div class="stat-card">
            <h3>Total Pomodoros</h3>
            <p class="stat-value">${totalPomodoros}</p>
          </div>
          <div class="stat-card">
            <h3>Current Streak</h3>
            <p class="stat-value">${st.streak} days</p>
          </div>
          <div class="stat-card">
            <h3>Best Streak</h3>
            <p class="stat-value">${calculateBestStreak(st.pomodoros)} days</p>
          </div>
        </div>
      </section>
      
      <section class="streak-calendar">
        <div class="calendar-header">
          <button class="calendar-nav" id="prev-month">←</button>
          <h3 id="calendar-title">${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          <button class="calendar-nav" id="next-month">→</button>
        </div>
        <div class="calendar-grid" id="calendar-grid">
          ${renderMonthCalendar(currentMonth, currentYear, st.pomodoros)}
        </div>
      </section>
      
      <section class="streak-achievements">
        <h3>Streak Achievements</h3>
        <div class="achievements-grid">
          ${renderStreakAchievements(st.streak)}
        </div>
      </section>
    </div>
  `;

  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const calendarTitle = document.getElementById('calendar-title');
  const calendarGrid = document.getElementById('calendar-grid');

  function updateCalendar() 
  {
    calendarTitle.textContent = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
    calendarGrid.innerHTML = renderMonthCalendar(currentMonth, currentYear, st.pomodoros);
  }

  prevMonthBtn.addEventListener('click', () => 
    {
    if (currentMonth === 0) 
  {
      currentMonth = 11;
      currentYear--;
    } 
    else 
    {
      currentMonth--;
    }
    updateCalendar();
  });

  nextMonthBtn.addEventListener('click', () => 
    {
    if (currentMonth === 11) 
    {
      currentMonth = 0;
      currentYear++;
    } 
    else 
    {
      currentMonth++;
    }
    updateCalendar();
  });
}

function renderMonthCalendar(month, year, pomodoros) 
{
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDay = firstDay.getDay();
  const totalDays = lastDay.getDate();
  
  let calendarHTML = '<div class="calendar-week">';
  
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  dayNames.forEach(day => 
  {
    calendarHTML += `<div class="calendar-day-name">${day}</div>`;
  });
  calendarHTML += '</div>';
  
  calendarHTML += '<div class="calendar-week">';
  for (let i = 0; i < startingDay; i++) 
  {
    calendarHTML += '<div class="calendar-day empty"></div>';
  }
  
  for (let day = 1; day <= totalDays; day++)
 {
    const date = new Date(year, month, day).toISOString().split('T')[0];
    const dayPomodoros = pomodoros.filter(p => p.startsWith(date));
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
    
    calendarHTML += `
      <div class="calendar-day ${dayPomodoros.length > 0 ? 'completed' : ''} ${isToday ? 'today' : ''}">
        <span class="day-date">${day}</span>
        ${dayPomodoros.length > 0 ? `<span class="day-count">${dayPomodoros.length}</span>` : ''}
      </div>
    `;
    
    if ((day + startingDay) % 7 === 0) {
      calendarHTML += '</div><div class="calendar-week">';
    }
  }
  
  const remainingDays = 7 - ((totalDays + startingDay) % 7);
  if (remainingDays < 7) 
  {
    for (let i = 0; i < remainingDays; i++) 
    {
      calendarHTML += '<div class="calendar-day empty"></div>';
    }
  }
  
  calendarHTML += '</div>';
  return calendarHTML;
}

function calculateBestStreak(pomodoros) 
{
  const dates = [...new Set(pomodoros.map(p => p.split('T')[0]))].sort();
  let currentStreak = 0;
  let bestStreak = 0;
  let lastDate = null;
  
  for (const date of dates) 
  {
    if (!lastDate || isConsecutiveDay(lastDate, date)) 
    {
      currentStreak++;
    } 
    else 
    {
      bestStreak = Math.max(bestStreak, currentStreak);
      currentStreak = 1;
    }
    lastDate = date;
  }
  
  return Math.max(bestStreak, currentStreak);
}

function isConsecutiveDay(date1, date2) 
{
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

function renderStreakAchievements(currentStreak) 
{
  const achievements = [
    { streak: 1, title: "First Timer", emoji: "🎯", description: "Complete your first day" },
    { streak: 3, title: "Three Day Streak", emoji: "🏆", description: "Maintain focus for 3 days" },
    { streak: 7, title: "Week Warrior", emoji: "🌟", description: "Complete a full week" },
    { streak: 14, title: "Fortnight Focus", emoji: "💪", description: "Two weeks of dedication" },
    { streak: 30, title: "Monthly Master", emoji: "👑", description: "A month of consistency" },
    { streak: 100, title: "Century Club", emoji: "🔥", description: "100 days of excellence" }
  ];
  
  return achievements.map(achievement => `
    <div class="achievement-card ${currentStreak >= achievement.streak ? 'achieved' : ''}">
      <div class="achievement-emoji">${achievement.emoji}</div>
      <div class="achievement-content">
        <h4>${achievement.title}</h4>
        <p>${achievement.description}</p>
        <div class="achievement-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(100, (currentStreak / achievement.streak) * 100)}%"></div>
          </div>
          <span>${currentStreak}/${achievement.streak} days</span>
        </div>
      </div>
    </div>
  `).join('');
}

export function initAbout() 
{
  

  const root = qs('root');
  root.innerHTML = `
    <div class="about-container">
      <h2>About Pomodoro</h2>
      <p>The Pomodoro Technique is a time management method developed by Francesco Cirillo in the late 1980s.</p>
      <p>This app helps you implement this technique by providing a timer, task management, and statistics tracking.</p>
    </div>
  `;
}

export function initProfile() {
    console.log('Starting profile initialization...');
    const root = qs('root');
    const currentUser = localStorage.getItem('currentUser');
    console.log('Profile initialization - currentUser:', currentUser);
    
    if (!currentUser) {
        console.error('No currentUser found in localStorage');
        return;
    }

    console.log('Creating profile HTML with currentUser:', currentUser);
    root.innerHTML = `
        <div class="profile-container">
            <div class="profile-header">
                <div class="profile-avatar">
                    <span>${currentUser?.charAt(0).toUpperCase() || 'U'}</span>
                </div>
                <h2>${currentUser}</h2>
            </div>
            
            <div class="profile-stats">
                <h3>Account Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-value" id="total-pomodoros">0</span>
                        <span class="stat-label">Total Pomodoros</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value" id="total-focus-time">0h 0m</span>
                        <span class="stat-label">Total Focus Time</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value" id="tasks-completed">0</span>
                        <span class="stat-label">Tasks Completed</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value" id="current-streak">0</span>
                        <span class="stat-label">Current Streak</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-settings">
                <h3>Account Settings</h3>
                <div class="settings-group">
                    <div class="settings-item">
                        <label>Change Email</label>
                        <input type="email" id="new-email" placeholder="New email">
                        <button class="settings-button" id="update-email-btn">Update Email</button>
                    </div>
                    
                    <div class="settings-item">
                        <label>Change Password</label>
                        <input type="password" id="current-password" placeholder="Current password">
                        <input type="password" id="new-password" placeholder="New password">
                        <input type="password" id="confirm-password" placeholder="Confirm new password">
                        <button class="settings-button" id="update-password-btn">Update Password</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add event listeners for the buttons
    qs('update-email-btn').onclick = updateEmail;
    qs('update-password-btn').onclick = updatePassword;

    // Load user stats
    loadProfileStats();
}

async function updateEmail() {
    const newEmail = qs('new-email').value.trim();
    
    if (!newEmail) {
        alert('Please enter a new email address');
        return;
    }
    
    if (!newEmail.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }
    
    try {
        await apiCall('/auth/update-email', 'PUT', { email: newEmail });
        alert('Email updated successfully');
        qs('new-email').value = '';
    } catch (error) {
        alert(error.message || 'Failed to update email');
    }
}


async function loadProfileStats() {
    try {
        const stats = await api.stats.getUserStats();
        console.log('Received stats from API:', stats);
        
        // Ensure we have default values if stats is null or undefined
        const safeStats = stats || {
            totalPomodoros: 0,
            totalFocusTime: 0,
            tasksCompleted: 0,
            currentStreak: 0
        };
        
        // Update the stats display with safe values
        const totalPomodoros = document.getElementById('total-pomodoros');
        const totalFocusTime = document.getElementById('total-focus-time');
        const tasksCompleted = document.getElementById('tasks-completed');
        const currentStreak = document.getElementById('current-streak');
        
        if (totalPomodoros) totalPomodoros.textContent = safeStats.totalPomodoros || 0;
        if (totalFocusTime) totalFocusTime.textContent = formatTime(safeStats.totalFocusTime || 0);
        if (tasksCompleted) tasksCompleted.textContent = safeStats.tasksCompleted || 0;
        if (currentStreak) currentStreak.textContent = safeStats.currentStreak || 0;
    } catch (error) {
        console.error('Failed to load profile stats:', error);
        // Set default values on error
        const elements = ['total-pomodoros', 'total-focus-time', 'tasks-completed', 'current-streak'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = id === 'total-focus-time' ? '0h 0m' : '0';
            }
        });
    }
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

function initHeader() {
    console.log('Initializing header...');
    const currentUser = localStorage.getItem('currentUser');
    console.log('Header initialization - currentUser:', currentUser);
    
    const userPanel = document.querySelector('.user-panel');
    const userButton = userPanel.querySelector('.user-button');
    const userAvatar = userPanel.querySelector('.user-avatar');
    
    console.log('User panel elements:', {
        userPanel,
        userButton,
        userAvatar
    });
    
    userAvatar.textContent = currentUser?.charAt(0).toUpperCase() || '';
    
    userButton.addEventListener('click', (e) => {
        e.stopPropagation();
        userPanel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!userPanel.contains(e.target)) {
            userPanel.classList.remove('open');
        }
    });

    const dropdownItems = userPanel.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            console.log('Dropdown action clicked:', action);
            
            switch(action) {
                case 'profile':
                    userPanel.classList.remove('open');
                    console.log('Initializing profile...');
                    initProfile();
                    break;
                case 'settings':
                    userPanel.classList.remove('open');
                    initSettings();
                    break;
                case 'theme':
                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                    const newTheme = isDark ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', newTheme);
                    
                    // Update all theme icons
                    const themeIcons = document.querySelectorAll('.theme-icon');
                    themeIcons.forEach(icon => {
                        if (icon) {
                            icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
                        }
                    });
                    
                    // Save theme preference to settings
                    saveSettings();
                    break;
                case 'logout':
                    auth.logout();
                    location.reload();
                    break;
            }
        });
    });

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const tab = button.dataset.tab;
            switch(tab) {
                case 'pomodoro':
                    initPomodoro();
                    break;
                case 'todo':
                    initTodo();
                    break;
                case 'stats':
                    initStats();
                    break;
                case 'about':
                    initAbout();
                    break;
                case 'focus':
                    initFocusMode();
                    break;
            }
        });
    });

    const initialTab = document.querySelector('.tab-btn[data-tab="pomodoro"]');
    if (initialTab) {
        initialTab.classList.add('active');
    }
}

export function initSettings() {
  const root = qs('root');
  const currentUser = localStorage.getItem('currentUser');
  
  root.innerHTML = `
    <div class="settings-container">
      <h2>Settings</h2>
      
      <div class="settings-section">
        <h3>Account Settings</h3>
        <div class="settings-group">
          <div class="settings-item">
            <label>Change Email</label>
            <input type="email" id="settings-email" placeholder="New email">
            <button class="settings-button" id="settings-email-btn">Update Email</button>
          </div>
          
          <div class="settings-item">
            <label>Change Password</label>
            <input type="password" id="settings-current-password" placeholder="Current password">
            <input type="password" id="settings-new-password" placeholder="New password">
            <input type="password" id="settings-confirm-password" placeholder="Confirm new password">
            <button class="settings-button" id="settings-password-btn">Update Password</button>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <h3>Appearance</h3>
        <div class="settings-group">
          <div class="settings-item">
            <label>Accent Color</label>
            <input type="color" id="accent-color" value="${getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()}">
            <button class="settings-button" id="apply-color">Apply Color</button>
          </div>
          
          <div class="settings-item">
            <label>Font Size</label>
            <select id="font-size">
              <option value="small">Small</option>
              <option value="medium" selected>Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <h3>Notifications</h3>
        <div class="settings-group">
          <div class="settings-item">
            <label>
              <input type="checkbox" id="email-notifications" checked>
              Enable Email Notifications
            </label>
          </div>
          
          <div class="settings-item">
            <label>Daily Reminder Time</label>
            <input type="time" id="reminder-time" value="09:00">
          </div>
        </div>
      </div>
    </div>
  `;

  // Load saved settings
  loadSettings();

  // Add event listeners
  qs('settings-email-btn').onclick = updateEmail;
  qs('settings-password-btn').onclick = updatePassword;
  qs('apply-color').onclick = updateAccentColor;
  qs('font-size').onchange = updateFontSize;
  qs('email-notifications').onchange = updateNotifications;
  qs('reminder-time').onchange = updateReminderTime;
}


async function updatePassword() {
  const currentPassword = qs('settings-current-password').value;
  const newPassword = qs('settings-new-password').value;
  const confirmPassword = qs('settings-confirm-password').value;
  
  if (!currentPassword || !newPassword || !confirmPassword) {
    alert('Please fill in all password fields');
    return;
  }
  
  if (newPassword.length < 6) {
    alert('New password must be at least 6 characters');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    alert('New passwords do not match');
    return;
  }
  
  try {
    await apiCall('/auth/update-password', 'PUT', {
      currentPassword,
      newPassword
    });
    alert('Password updated successfully');
    qs('settings-current-password').value = '';
    qs('settings-new-password').value = '';
    qs('settings-confirm-password').value = '';
  } catch (error) {
    alert(error.message || 'Failed to update password');
  }
}

function applyAccentColor(color) {
  // Update CSS variables
  document.documentElement.style.setProperty('--primary-color', color);
  document.documentElement.style.setProperty('--hover-color', color + '20');
  document.documentElement.style.setProperty('--border-color', color + '40');
  document.documentElement.style.setProperty('--box-shadow', `0 4px 6px ${color}20`);
  
  // Add CSS for all buttons and mode display
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --button-hover-bg: ${color}20;
      --button-border: ${color};
    }
    button {
      border-color: var(--button-border) !important;
    }
    button:hover {
      background-color: var(--button-hover-bg) !important;
      border-color: var(--button-border) !important;
    }
    #mode-display {
      color: var(--primary-color) !important;
    }
    .timer-controls button {
      border-color: var(--button-border) !important;
    }
    .timer-controls button:hover {
      background-color: var(--button-hover-bg) !important;
    }
    #add-task, .settings-button, .focus-btn {
      border-color: var(--button-border) !important;
    }
    #add-task:hover, .settings-button:hover, .focus-btn:hover {
      background-color: var(--button-hover-bg) !important;
    }
  `;
  
  // Remove any existing style we added
  const existingStyle = document.getElementById('accent-color-style');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  style.id = 'accent-color-style';
  document.head.appendChild(style);
}

function updateAccentColor() {
  const colorInput = qs('accent-color');
  const newColor = colorInput.value;
  
  applyAccentColor(newColor);
  saveSettings();
}

function updateFontSize() {
  const size = qs('font-size').value;
  const fontSize = size === 'small' ? '14px' : size === 'large' ? '18px' : '16px';
  document.documentElement.style.setProperty('--font-size', fontSize);
  document.body.style.fontSize = fontSize;
  saveSettings();
}

function updateNotifications() {
  const enabled = qs('email-notifications').checked;
  saveSettings();
}

function updateReminderTime() {
  const time = qs('reminder-time').value;
  saveSettings();
}

async function loadSettings() {
  try {
    // Try to load from API first
    const settings = await api.settings.getUserSettings();
    console.log('Received settings from API:', settings);
    
    if (settings) {
      // Apply appearance settings
      const accentColorInput = qs('accent-color');
      if (settings.accentColor && accentColorInput) {
        accentColorInput.value = settings.accentColor;
        document.documentElement.style.setProperty('--primary-color', settings.accentColor);
        document.documentElement.style.setProperty('--hover-color', settings.accentColor + '20');
        document.documentElement.style.setProperty('--border-color', settings.accentColor + '40');
        document.documentElement.style.setProperty('--box-shadow', `0 4px 6px ${settings.accentColor}20`);
      }
      
      // Apply theme
      if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
        const themeIcons = document.querySelectorAll('.theme-icon');
        themeIcons.forEach(icon => {
          if (icon) {
            icon.textContent = settings.theme === 'dark' ? '☀️' : '🌙';
          }
        });
      }
      
      const fontSizeInput = qs('font-size');
      if (settings.fontSize && fontSizeInput) {
        // Convert numeric fontSize to string value
        let fontSizeValue = 'medium';
        if (typeof settings.fontSize === 'number') {
          fontSizeValue = settings.fontSize <= 14 ? 'small' : settings.fontSize >= 18 ? 'large' : 'medium';
        } else {
          fontSizeValue = settings.fontSize;
        }
        
        fontSizeInput.value = fontSizeValue;
        const fontSize = fontSizeValue === 'small' ? '14px' : fontSizeValue === 'large' ? '18px' : '16px';
        document.documentElement.style.setProperty('--font-size', fontSize);
        document.body.style.fontSize = fontSize;
      }
      
      // Apply notification settings
      const notificationsInput = qs('email-notifications');
      if (settings.enableNotifications !== undefined && notificationsInput) {
        notificationsInput.checked = settings.enableNotifications;
      }
      
      // Apply timer settings
      const workInput = qs('work-input');
      const shortBreakInput = qs('short-break-input');
      const longBreakInput = qs('long-break-input');
      
      if (settings.workDuration && workInput) {
        workInput.value = settings.workDuration;
      }
      if (settings.shortBreakDuration && shortBreakInput) {
        shortBreakInput.value = settings.shortBreakDuration;
      }
      if (settings.longBreakDuration && longBreakInput) {
        longBreakInput.value = settings.longBreakDuration;
      }
    }
    
    return settings;
  } catch (error) {
    console.error('Failed to load settings from server:', error);
    // Load from localStorage as fallback
    const savedSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
    
    // Apply the same settings as above but from localStorage
    if (savedSettings.accentColor) {
      const accentColorInput = qs('accent-color');
      if (accentColorInput) {
        accentColorInput.value = savedSettings.accentColor;
        document.documentElement.style.setProperty('--primary-color', savedSettings.accentColor);
        document.documentElement.style.setProperty('--hover-color', savedSettings.accentColor + '20');
        document.documentElement.style.setProperty('--border-color', savedSettings.accentColor + '40');
        document.documentElement.style.setProperty('--box-shadow', `0 4px 6px ${savedSettings.accentColor}20`);
      }
    }
    
    if (savedSettings.theme) {
      document.documentElement.setAttribute('data-theme', savedSettings.theme);
      const themeIcons = document.querySelectorAll('.theme-icon');
      themeIcons.forEach(icon => {
        if (icon) {
          icon.textContent = savedSettings.theme === 'dark' ? '☀️' : '🌙';
        }
      });
    }
    
    return savedSettings;
  }
}

async function saveSettings() {
  const fontSizeValue = qs('font-size').value;
  // Convert string fontSize to number
  const fontSizeNumber = fontSizeValue === 'small' ? 14 : fontSizeValue === 'large' ? 18 : 16;

  const settings = {
    accentColor: qs('accent-color').value,
    fontSize: fontSizeNumber,
    enableNotifications: qs('email-notifications').checked,
    enableSound: true, // Default to true since we have sound controls
    workDuration: parseInt(qs('work-input')?.value || '25'),
    shortBreakDuration: parseInt(qs('short-break-input')?.value || '5'),
    longBreakDuration: parseInt(qs('long-break-input')?.value || '15'),
    longBreakInterval: 4, // Default to 4 pomodoros before long break
    theme: document.documentElement.getAttribute('data-theme') || 'light'
  };
  
  // Store in localStorage as a fallback
  localStorage.setItem('userSettings', JSON.stringify(settings));
  
  try {
    console.log('Saving settings to server:', settings);
    await api.settings.updateUserSettings(settings);
  } catch (error) {
    console.error('Failed to save settings to server:', error);
    // Don't show alert since we saved to localStorage
  }
}

export function initFocusMode() 
{
  const root = qs('root');
  if (!root) 
  {
    console.error('Root element not found');
    return;
  }

  root.innerHTML = `
    <div class="focus-dashboard">
      <div class="focus-header">
        <h2>Focus Mode</h2>
        <div class="focus-controls">
          <button id="start-focus" class="focus-btn">Start Focus Session</button>
          <button id="stop-focus" class="focus-btn" disabled>End Session</button>
        </div>
      </div>

      <div class="focus-content">
        <div class="focus-timer">
          <div class="timer-display-focus">00:00:00</div>
          <div class="timer-progress">
            <div class="progress-bar"></div>
          </div>
        </div>

        <div class="focus-features">
          <div class="ambient-sounds">
            <h3>Ambient Sounds</h3>
            <div class="sound-options">
              <button class="sound-btn" data-sound="rain">🌧️ Rain</button>
              <button class="sound-btn" data-sound="cafe">☕ Cafe</button>
              <button class="sound-btn" data-sound="white-noise">🌊 White Noise</button>
              <button class="sound-btn" data-sound="nature">🌿 Nature</button>
            </div>
            <div class="volume-control">
              <input type="range" id="sound-volume" min="0" max="100" value="50">
              <label for="sound-volume">Volume</label>
            </div>
          </div>

          <div class="website-blocker">
            <h3>Website Blocker</h3>
            <div class="blocker-controls">
              <input type="text" id="blocked-sites" placeholder="Add websites to block (e.g., facebook.com)">
              <button id="add-site">Add</button>
            </div>
            <ul id="blocked-list" class="blocked-list"></ul>
          </div>

          <div class="session-goals">
            <h3>Session Goals</h3>
            <div class="goal-input">
              <input type="text" id="new-goal" placeholder="Add a goal for this session">
              <button id="add-goal">Add Goal</button>
            </div>
            <ul id="goals-list" class="goals-list"></ul>
          </div>
        </div>

        <div class="focus-stats">
          <h3>Focus Statistics</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-value" id="total-focus-time">0h 0m</span>
              <span class="stat-label">Total Focus Time</span>
            </div>
            <div class="stat-card">
              <span class="stat-value" id="sessions-completed">0</span>
              <span class="stat-label">Sessions Completed</span>
            </div>
            <div class="stat-card">
              <span class="stat-value" id="goals-achieved">0</span>
              <span class="stat-label">Goals Achieved</span>
            </div>
            <div class="stat-card">
              <span class="stat-value" id="focus-score">0</span>
              <span class="stat-label">Focus Score</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  initFocusModeFunctionality();
}

function initFocusModeFunctionality() 
{
  let focusTimer = null;
  let startTime = null;
  let currentSound = null;
  let blockedSites = JSON.parse(localStorage.getItem('blockedSites') || '[]');
  let sessionGoals = [];
  let focusStats = JSON.parse(localStorage.getItem('focusStats') || '{"totalTime":0,"sessions":0,"goals":0,"score":0}');
  let isFullscreen = false;
  let lastVisibleTime = Date.now();
  let visibilityCheckInterval = null;

  const startBtn = document.getElementById('start-focus');
  const stopBtn = document.getElementById('stop-focus');
  const timerDisplay = document.querySelector('.timer-display-focus');
  const progressBar = document.querySelector('.progress-bar');
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.className = 'fullscreen-btn';
  fullscreenBtn.innerHTML = '⛶';
  fullscreenBtn.title = 'Toggle Fullscreen';
  document.querySelector('.focus-header').appendChild(fullscreenBtn);

  if (!startBtn || !stopBtn || !timerDisplay || !progressBar) {
    console.error('Required elements not found');
    return;
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const progress = (elapsed % 1500) / 1500 * 100; 
    progressBar.style.width = `${progress}%`;
  }

  function startVisibilityMonitoring() {
    if (visibilityCheckInterval) clearInterval(visibilityCheckInterval);
    visibilityCheckInterval = setInterval(checkVisibility, 1000);
    lastVisibleTime = Date.now();
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  function stopVisibilityMonitoring() {
    if (visibilityCheckInterval) {
      clearInterval(visibilityCheckInterval);
      visibilityCheckInterval = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      lastVisibleTime = Date.now();
    } else {
      const timeAway = Date.now() - lastVisibleTime;
      if (timeAway > 30000) 
      { 
        showVisibilityWarning(timeAway);
      }
    }
  }

  function checkVisibility() 
  {
    if (!document.hidden) 
    {
      const timeAway = Date.now() - lastVisibleTime;
      if (timeAway > 30000) 
      { 
        showVisibilityWarning(timeAway);
      }
    }
  }

  function showVisibilityWarning(timeAway) 
  {
    const existingWarning = document.querySelector('.visibility-warning');
    if (existingWarning) 
    {
      existingWarning.remove();
    }

    const minutes = Math.floor(timeAway / 60000);
    const seconds = Math.floor((timeAway % 60000) / 1000);
    
    const warning = document.createElement('div');
    warning.className = 'visibility-warning';
    warning.innerHTML = `
      <div class="warning-content">
        <h3>Focus Mode Warning</h3>
        <p>You've been away for ${minutes}m ${seconds}s.</p>
        <p>Remember to stay focused on your work!</p>
        <button class="close-warning">Got it</button>
      </div>
    `;
    
    document.body.appendChild(warning);
    
    const style = document.createElement('style');
    style.textContent = `
      .visibility-warning {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff6b6b;
        color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
      }
      
      .warning-content {
        text-align: center;
      }
      
      .close-warning {
        background: white;
        color: #ff6b6b;
        border: none;
        padding: 5px 15px;
        border-radius: 4px;
        margin-top: 10px;
        cursor: pointer;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    warning.querySelector('.close-warning').addEventListener('click', () => {
      warning.remove();
      style.remove();
      lastVisibleTime = Date.now();
    });
  }

  fullscreenBtn.addEventListener('click', () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen().catch(e => {
        console.error('Fullscreen error:', e);
      });
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    isFullscreen = !!document.fullscreenElement;
    fullscreenBtn.textContent = isFullscreen ? '⮽' : '⛶';
  });

  timerDisplay.textContent = '00:00:00';
  progressBar.style.width = '0%';

  startBtn.addEventListener('click', () => {
    if (focusTimer) {
      clearInterval(focusTimer);
    }
    startTime = Date.now();
    focusTimer = setInterval(updateTimer, 1000);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    updateFocusStats('sessions', 1);
    timerDisplay.textContent = '00:00:00';
    
    startVisibilityMonitoring();
  });

  stopBtn.addEventListener('click', () => {
    if (focusTimer) {
      clearInterval(focusTimer);
      focusTimer = null;
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateFocusStats('totalTime', Math.floor((Date.now() - startTime) / 1000));
    timerDisplay.textContent = '00:00:00';
    progressBar.style.width = '0%';
    
    stopVisibilityMonitoring();
  });

  const soundButtons = document.querySelectorAll('.sound-btn');
  const volumeControl = document.getElementById('sound-volume');

  soundButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sound = btn.dataset.sound;
      
      if (btn.classList.contains('active')) {
        if (currentSound) {
          currentSound.pause();
          currentSound = null;
        }
        btn.classList.remove('active');
        return;
      }

      if (currentSound) {
        currentSound.pause();
        currentSound = null;
      }

      btn.classList.add('loading');
      btn.disabled = true;

      const tryPlaySound = () => {
        return new Promise((resolve, reject) => {
          try {
            const soundPath = `sounds/${sound}.wav`;
            currentSound = new Audio(soundPath);
            
            currentSound.addEventListener('canplaythrough', () => {
              currentSound.addEventListener('timeupdate', () => {
                if (currentSound.currentTime > currentSound.duration - 0.1) {
                  currentSound.currentTime = 0;
                }
              });

              currentSound.loop = true;
              const volume = volumeControl ? volumeControl.value / 100 : 0.5;
              currentSound.volume = volume;
              
              currentSound.play()
                .then(() => {
                  soundButtons.forEach(b => {
                    b.classList.remove('active', 'loading');
                    b.disabled = false;
                  });
                  btn.classList.add('active');
                  resolve();
                })
                .catch(e => {
                  console.error('Playback failed:', e);
                  reject(e);
                });
            });

            currentSound.addEventListener('error', (e) => {
              console.error('Sound loading failed:', e);
              reject(e);
            });
          } catch (e) {
            console.error('Sound initialization failed:', e);
            reject(e);
          }
        });
      };

      tryPlaySound()
        .catch(e => {
          console.error('Sound loading failed:', e);
          btn.classList.remove('loading');
          btn.disabled = false;
          
          const errorMsg = document.createElement('div');
          errorMsg.className = 'sound-error';
          errorMsg.textContent = 'Sound file not found. Please check the sounds directory.';
          btn.parentNode.appendChild(errorMsg);
          
          setTimeout(() => errorMsg.remove(), 3000);
        });
    });
  });

  if (volumeControl) {
    volumeControl.addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      if (currentSound) {
        currentSound.volume = volume;
      }
    });
  }

  const blockedSitesInput = document.getElementById('blocked-sites');
  const addSiteBtn = document.getElementById('add-site');
  const blockedList = document.getElementById('blocked-list');

  function updateBlockedList() {
    if (blockedList) {
      blockedList.innerHTML = blockedSites.map(site => `
        <li>
          <span>${site}</span>
          <button class="remove-site" data-site="${site}">×</button>
        </li>
      `).join('');
    }
  }

  if (addSiteBtn && blockedSitesInput) {
    addSiteBtn.addEventListener('click', () => {
      const site = blockedSitesInput.value.trim();
      if (site && !blockedSites.includes(site)) {
        blockedSites.push(site);
        localStorage.setItem('blockedSites', JSON.stringify(blockedSites));
        updateBlockedList();
        blockedSitesInput.value = '';
      }
    });

    blockedSitesInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addSiteBtn.click();
      }
    });
  }

  if (blockedList) {
    blockedList.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-site')) {
        const site = e.target.dataset.site;
        blockedSites = blockedSites.filter(s => s !== site);
        localStorage.setItem('blockedSites', JSON.stringify(blockedSites));
        updateBlockedList();
      }
    });
  }

  const newGoalInput = document.getElementById('new-goal');
  const addGoalBtn = document.getElementById('add-goal');
  const goalsList = document.getElementById('goals-list');

  function updateGoalsList() {
    if (goalsList) {
      goalsList.innerHTML = sessionGoals.map((goal, index) => `
        <li>
          <input type="checkbox" id="goal-${index}" ${goal.completed ? 'checked' : ''}>
          <label for="goal-${index}">${goal.text}</label>
        </li>
      `).join('');
    }
  }

  if (addGoalBtn && newGoalInput) {
    addGoalBtn.addEventListener('click', () => {
      const goalText = newGoalInput.value.trim();
      if (goalText) {
        sessionGoals.push({ text: goalText, completed: false });
        updateGoalsList();
        newGoalInput.value = '';
      }
    });
  }

  if (goalsList) {
    goalsList.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const index = parseInt(e.target.id.split('-')[1]);
        sessionGoals[index].completed = e.target.checked;
        if (e.target.checked) {
          updateFocusStats('goals', 1);
        }
      }
    });
  }

  function updateFocusStats(stat, value) {
    focusStats[stat] += value;
    localStorage.setItem('focusStats', JSON.stringify(focusStats));
    updateStatsDisplay();
  }

  function updateStatsDisplay() {
    const totalTime = document.getElementById('total-focus-time');
    const sessions = document.getElementById('sessions-completed');
    const goals = document.getElementById('goals-achieved');
    const score = document.getElementById('focus-score');

    if (totalTime) totalTime.textContent = formatTime(focusStats.totalTime);
    if (sessions) sessions.textContent = focusStats.sessions;
    if (goals) goals.textContent = focusStats.goals;
    if (score) score.textContent = calculateFocusScore();
  }

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  function calculateFocusScore() {
    return Math.floor((focusStats.totalTime / 3600) * 10 + focusStats.goals * 5 + focusStats.sessions * 2);
  }

  updateBlockedList();
  updateStatsDisplay();
}

