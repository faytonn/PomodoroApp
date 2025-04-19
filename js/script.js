const workInput       = document.getElementById('work-input');
const shortInput      = document.getElementById('short-break-input');
const longInput       = document.getElementById('long-break-input');
const saveSettingsBtn = document.getElementById('save-settings');

const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const startBtn  = document.getElementById('start');
const pauseBtn  = document.getElementById('pause');
const resetBtn  = document.getElementById('reset');

const modeDisplay = document.getElementById('mode-display');

const newTaskInput = document.getElementById('new-task');
const addTaskBtn   = document.getElementById('add-task');
const taskList     = document.getElementById('task-list');


let settings = JSON.parse(localStorage.getItem('pomodoroSettings') || '{}');
const defaults = { work: 25, short: 5, long: 15 };
settings = { ...defaults, ...settings };

workInput.value  = settings.work;
shortInput.value = settings.short;
longInput.value  = settings.long;

let workDuration, shortDuration, longDuration;
let timeLeft, timerInterval;

let mode = 'work';      
let cycleCount = 0;     

function initDurations() {
  workDuration  = settings.work  * 60;
  shortDuration = settings.short * 60;
  longDuration  = settings.long  * 60;
  timeLeft = workDuration;
  mode = 'work';
  cycleCount = 0;
  updateDisplay();
}
initDurations();

function saveSettings() {
  settings.work  = Math.max(1, parseInt(workInput.value, 10));
  settings.short = Math.max(1, parseInt(shortInput.value, 10));
  settings.long  = Math.max(1, parseInt(longInput.value, 10));
  localStorage.setItem('pomodoroSettings', JSON.stringify(settings));

  clearInterval(timerInterval);
  timerInterval = null;
  initDurations();
}
saveSettingsBtn.addEventListener('click', saveSettings);
[workInput, shortInput, longInput].forEach(inp =>
  inp.addEventListener('change', saveSettings)
);


function updateDisplay() {
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  minutesEl.textContent = String(m).padStart(2, '0');
  secondsEl.textContent = String(s).padStart(2, '0');
  modeDisplay.textContent = mode === 'work'
    ? 'Work'
    : mode === 'short'
      ? 'Short Break'
      : 'Long Break';
  modeDisplay.className = 'mode-display ' + mode;
}

function switchMode() {
  if (mode === 'work') {
    cycleCount++;
    if (cycleCount % 4 === 0) {
      mode = 'long';
      timeLeft = longDuration;
      alert('🎉 Time for a long break!');
    } else {
      mode = 'short';
      timeLeft = shortDuration;
      alert('☕ Time for a short break!');
    }
  } else {
    mode = 'work';
    timeLeft = workDuration;
    alert('📝 Back to work!');
  }
  updateDisplay();
}

function tick() {
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    switchMode();
    return;
  }
  timeLeft--;
  updateDisplay();
}

startBtn.addEventListener('click', () => {
  if (!timerInterval) timerInterval = setInterval(tick, 1000);
});
pauseBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
});
resetBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
  initDurations();
});


let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');

function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach((task, idx) => {
    const li = document.createElement('li');
    li.className = task.completed ? 'completed' : '';

    const span = document.createElement('span');
    span.textContent = task.text;
    span.addEventListener('click', () => {
      tasks[idx].completed = !tasks[idx].completed;
      saveAndRender();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      tasks.splice(idx, 1);
      saveAndRender();
    });

    li.appendChild(span);
    li.appendChild(delBtn);
    taskList.appendChild(li);
  });
}

function saveAndRender() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  renderTasks();
}

addTaskBtn.addEventListener('click', () => {
  const text = newTaskInput.value.trim();
  if (!text) return;
  tasks.push({ text, completed: false });
  newTaskInput.value = '';
  saveAndRender();
});

newTaskInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') addTaskBtn.click();
});

renderTasks();
