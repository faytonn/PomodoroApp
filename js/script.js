// script.js
// — AUTH & TAB SHELL —
function qs(id)
{
  return document.getElementById(id);
}
let users = JSON.parse(localStorage.getItem('users') || '[]');
let currentUser = null;
const authC = qs('auth-container'),
      loginS = qs('login-section'),
      regS = qs('register-section'),
      appC = qs('app-container');

document.addEventListener('DOMContentLoaded', () => {
  currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    authC.classList.add('hidden');
    appC.classList.remove('hidden');
    qs('username-display').textContent = currentUser;
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
    
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

qs('register-btn').onclick = () => {
  const u = qs('reg-username').value.trim();
  const p = qs('reg-password').value;
  const c = qs('reg-confirm').value;
  
  qs('reg-error').textContent = '';
  
  if (!u || !p) {
    qs('reg-error').textContent = 'Please fill in all fields';
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
  
  if (users.some(x => x.user === u)) {
    qs('reg-error').textContent = 'Username already exists';
    return;
  }
  
  users.push({user: u, pass: p});
  localStorage.setItem('users', JSON.stringify(users));
  
  qs('reg-username').value = '';
  qs('reg-password').value = '';
  qs('reg-confirm').value = '';
  
  alert('Registration successful! Please log in.');
  loginS.classList.remove('hidden');
  regS.classList.add('hidden');
};

qs('login-btn').onclick = () => {
  const u = qs('login-username').value.trim();
  const p = qs('login-password').value;
  
  qs('login-error').textContent = '';
  
  if (!u || !p) {
    qs('login-error').textContent = 'Please fill in all fields';
    return;
  }
  
  const user = users.find(x => x.user === u && x.pass === p);
  
  if (!user) {
    qs('login-error').textContent = 'Invalid username or password';
    return;
  }
  
  currentUser = u;
  localStorage.setItem('currentUser', u);
  
  qs('login-username').value = '';
  qs('login-password').value = '';
  
  authC.classList.add('hidden');
  appC.classList.remove('hidden');
  qs('username-display').textContent = currentUser;
  
  initHeader();
  initPomodoro();
};

qs('logout-btn').onclick = () => {
  localStorage.removeItem('currentUser');
  location.reload();
};

// — PANEL INITIALIZERS —
// 1) Pomodoro
export function initPomodoro() 
{
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
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (st.lastPomodoroDate === today) 
    {
      st.pomodoros.push(new Date().toISOString());
      st.totalSeconds += settings.work * 60;
    } 
    else if (!st.lastPomodoroDate || st.lastPomodoroDate === yesterday) 
    {
      st.streak++;
      st.pomodoros.push(new Date().toISOString());
      st.totalSeconds += settings.work * 60;
      st.lastPomodoroDate = today;
      showStreakCelebration(st.streak);
    } 
    else 
    {
      st.streak = 1;
      st.pomodoros.push(new Date().toISOString());
      st.totalSeconds += settings.work * 60;
      st.lastPomodoroDate = today;
      showStreakCelebration(1);
    }
    
    localStorage.setItem(statsKey, JSON.stringify(st));
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

export function initTodo() 
{
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

  let tasks = JSON.parse(localStorage.getItem(`tasks_${currentUser}`) || '[]');

  hasDueDate.addEventListener('change', () => 
  {
    dueDateInput.classList.toggle('hidden', !hasDueDate.checked);
    if (!hasDueDate.checked) 
    {
      dueDateInput.value = '';
    }
  });

  reminderSelect.addEventListener('change', () => 
  {
    customReminder.classList.toggle('hidden', reminderSelect.value !== 'custom');
    if (reminderSelect.value !== 'custom') 
    {
      customReminder.value = '';
    }
  });

  function saveRender() 
  {
    localStorage.setItem(`tasks_${currentUser}`, JSON.stringify(tasks));
    render();
  }

  function render() 
  {
    list.innerHTML = '';
    const category = categoryFilter.value;
    const priority = priorityFilter.value;
    const status = statusFilter.value;
    
    const filteredTasks = tasks.filter(task => 
    {
      const categoryMatch = category === 'all' || task.category === category;
      const priorityMatch = priority === 'all' || task.priority === priority;
      const statusMatch = status === 'all' || 
        (status === 'completed' && task.completed) ||
        (status === 'pending' && !task.completed && !isOverdue(task)) ||
        (status === 'overdue' && !task.completed && isOverdue(task));
      return categoryMatch && priorityMatch && statusMatch;
    });

    filteredTasks.forEach((task, i) => 
    {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''} priority-${task.priority} ${isOverdue(task) ? 'overdue' : ''}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.onchange = () => 
      {
        tasks[i].completed = !tasks[i].completed;
        saveRender();
      };

      const taskContent = document.createElement('div');
      taskContent.className = 'task-content';
      
      const taskText = document.createElement('span');
      taskText.className = 'task-text';
      taskText.textContent = task.text;
      
      const taskMeta = document.createElement('div');
      taskMeta.className = 'task-meta';
      
      let metaHTML = `
        <span class="task-category">${task.category}</span>
        <span class="task-priority">${task.priority}</span>
      `;

      if (task.dueDate) 
      {
        const dueDate = new Date(task.dueDate);
        const formattedDate = dueDate.toLocaleString('en-US', 
        {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        metaHTML += `<span class="task-due-date">Due: ${formattedDate}</span>`;
      }

      if (task.reminder) 
      {
        metaHTML += `<span class="task-reminder">Reminder: ${formatReminder(task.reminder)}</span>`;
      }

      taskMeta.innerHTML = metaHTML;

      taskContent.appendChild(taskText);
      taskContent.appendChild(taskMeta);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-task';
      deleteBtn.innerHTML = '✕';
      deleteBtn.onclick = () => 
      {
        tasks.splice(i, 1);
        saveRender();
      };

      li.appendChild(checkbox);
      li.appendChild(taskContent);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }

  function isOverdue(task) 
  {
    return task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
  }

  function formatReminder(reminder) 
  {
    if (reminder === '1day') return '1 Day Before';
    if (reminder === '1week') return '1 Week Before';
    if (reminder === 'custom') return 'Custom';
    return '';
  }

  add.onclick = () => 
  {
    const text = inp.value.trim();
    if (!text) return;
    
    const category = qs('task-category').value;
    const priority = qs('task-priority').value;
    const hasDueDateChecked = qs('has-due-date').checked;
    const dueDate = hasDueDateChecked ? qs('task-due-date').value : null;
    const reminder = qs('task-reminder').value;
    const customReminderDate = reminder === 'custom' ? qs('custom-reminder').value : null;
    
    tasks.push({
      text,
      category,
      priority,
      dueDate,
      reminder: reminder === 'custom' ? customReminderDate : reminder,
      completed: false,
      createdAt: new Date().toISOString()
    });
    
    inp.value = '';
    qs('has-due-date').checked = false;
    qs('task-due-date').value = '';
    qs('task-due-date').classList.add('hidden');
    qs('task-reminder').value = 'none';
    qs('custom-reminder').value = '';
    qs('custom-reminder').classList.add('hidden');
    
    saveRender();
  };

  inp.onkeypress = e => 
  {
    if (e.key === 'Enter') add.click();
  };

  categoryFilter.onchange = render;
  priorityFilter.onchange = render;
  statusFilter.onchange = render;

  render();
}

export function initStats() 
{
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

function initHeader() 
{
  const userPanel = document.querySelector('.user-panel');
  const userButton = userPanel.querySelector('.user-button');
  const userAvatar = userPanel.querySelector('.user-avatar');
  
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
      
      switch(action) {
        case 'profile':
          userPanel.classList.remove('open');
          break;
        case 'settings':
          userPanel.classList.remove('open');
          initSettings();
          break;
        case 'theme':
          const themeIcon = item.querySelector('.theme-icon');
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
          themeIcon.textContent = isDark ? '🌙' : '☀️';
          localStorage.setItem('theme', isDark ? 'light' : 'dark');
          break;
        case 'logout':
          localStorage.removeItem('currentUser');
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
  if (initialTab) 
  {
    initialTab.classList.add('active');
  }
}

function initSettings() 
{
  const root = qs('root');
  root.innerHTML = `
    <div class="settings-container">
      <h2>Settings</h2>
      
      <div class="settings-section">
        <h3>Account Settings</h3>
        <div class="settings-group">
          <div class="settings-item">
            <label>Change Email</label>
            <input type="email" id="new-email" placeholder="New email">
            <button class="settings-button" onclick="updateEmail()">Update Email</button>
          </div>
          
          <div class="settings-item">
            <label>Change Password</label>
            <input type="password" id="current-password" placeholder="Current password">
            <input type="password" id="new-password" placeholder="New password">
            <input type="password" id="confirm-password" placeholder="Confirm new password">
            <button class="settings-button" onclick="updatePassword()">Update Password</button>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <h3>Appearance</h3>
        <div class="settings-group">
          <div class="settings-item">
            <label>Accent Color</label>
            <input type="color" id="accent-color" value="${getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()}">
            <button id="apply-color" class="settings-button">Apply Color</button>
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

          <div class="settings-item">
            <label>Notification Types</label>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="streak-reminder" checked>
                Streak Reminders
              </label>
              <label>
                <input type="checkbox" id="weekly-report" checked>
                Weekly Progress Reports
              </label>
              <label>
                <input type="checkbox" id="app-updates" checked>
                App Updates
              </label>
              <label>
                <input type="checkbox" id="productivity-tips" checked>
                Productivity Tips
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>Focus Settings</h3>
        <div class="settings-group">
          <div class="settings-item">
            <label>Auto-start Next Session</label>
            <select id="auto-start">
              <option value="never">Never</option>
              <option value="work">After Work Sessions</option>
              <option value="break">After Breaks</option>
              <option value="always">Always</option>
            </select>
          </div>

          <div class="settings-item">
            <label>Focus Mode</label>
            <select id="focus-mode">
              <option value="normal">Normal</option>
              <option value="strict">Strict (No Pausing)</option>
              <option value="flexible">Flexible (Allow Pausing)</option>
            </select>
          </div>

          <div class="settings-item">
            <label>
              <input type="checkbox" id="fullscreen-mode" checked>
              Enable Fullscreen Mode
            </label>
          </div>
        </div>
      </div>
    </div>
  `;

  loadSettings();

  qs('font-size').addEventListener('change', updateFontSize);
  qs('auto-start').addEventListener('change', updateAutoStart);
  qs('focus-mode').addEventListener('change', updateFocusMode);
  qs('fullscreen-mode').addEventListener('change', updateFullscreenMode);
  
  qs('apply-color').addEventListener('click', updateAccentColor);
}

function loadSettings() 
{
  const settings = JSON.parse(localStorage.getItem(`settings_${currentUser}`) || '{}');
  
  if (settings.appearance) 
  {
    const accentColor = settings.appearance.accentColor || '#ff6b6b';
    const fontSize = settings.appearance.fontSize || 'medium';

    qs('accent-color').value = accentColor;
    qs('font-size').value = fontSize;

    document.documentElement.style.setProperty('--font-size', 
      fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px');
  }

  if (settings.focus) 
  {
    qs('auto-start').value = settings.focus.autoStart || 'never';
    qs('focus-mode').value = settings.focus.mode || 'normal';
    qs('fullscreen-mode').checked = settings.focus.fullscreen !== false;
  }
}

function saveSettings() 
{
  const settings = 
  {
    appearance: 
    {
      accentColor: qs('accent-color').value,
      fontSize: qs('font-size').value
    },
    focus: 
    {
      autoStart: qs('auto-start').value,
      mode: qs('focus-mode').value,
      fullscreen: qs('fullscreen-mode').checked
    }
  };
  
  localStorage.setItem(`settings_${currentUser}`, JSON.stringify(settings));
}

function updateAccentColor() 
{
  const colorInput = qs('accent-color');
  const newColor = colorInput.value;
  
  document.documentElement.style.setProperty('--primary-color', newColor);
  document.documentElement.style.setProperty('--hover-color', newColor + '20');
  document.documentElement.style.setProperty('--border-color', newColor + '40'); 
  document.documentElement.style.setProperty('--box-shadow', `0 4px 6px ${newColor}20`); 
  
  
  colorInput.value = newColor;
  
  saveSettings();
}

function updateFontSize() {
  const size = qs('font-size').value;
  const fontSize = size === 'small' ? '14px' : size === 'large' ? '18px' : '16px';
  document.documentElement.style.setProperty('--font-size', fontSize);
  document.body.style.fontSize = fontSize; 
  saveSettings();
}

function updateAutoStart() 
{
  saveSettings();
}

function updateFocusMode() 
{
  saveSettings();

}

function updateFullscreenMode() {
  const isFullscreen = qs('fullscreen-mode').checked;
  if (isFullscreen) 
  {
    document.documentElement.requestFullscreen();
  } 
  else 
  {
    document.exitFullscreen();
  }
  saveSettings();
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

      const tryPlaySound = (extension) => 
        {
        return new Promise((resolve, reject) => 
          {
          try 
          {
            const soundPath = `sounds/${sound}.${extension}`;
            currentSound = new Audio(soundPath);
            
            currentSound.addEventListener('canplaythrough', () => 
              {
              currentSound.addEventListener('timeupdate', () => 
              {
               if (currentSound.currentTime > currentSound.duration - 0.1) 
                {
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

      tryPlaySound('mp3')
        .catch(() => tryPlaySound('wav'))
        .catch(e => {
          console.error('All sound formats failed:', e);
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

