import { initPomodoro, initTodo, initStats, initAbout, initFocusMode } from './script.js';

const root = document.getElementById('root');
const tabs = document.querySelectorAll('.tab-btn');

function loadPanel(name) {
  try {
    root.innerHTML = '';
    
    switch(name) {
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
      default:
        throw new Error(`Unknown panel: ${name}`);
    }
  } catch (e) {
    root.innerHTML = `<p class="error">Could not load "${name}": ${e.message}</p>`;
    console.error(e);
  }
}

function navigateTo(name) {
  tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
  
  history.pushState({panel: name}, '', `#${name}`);
  
  loadPanel(name);
}

tabs.forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.tab));
});

window.addEventListener('popstate', e => {
  const panel = e.state?.panel || 'pomodoro';
  navigateTo(panel);
});

const startPanel = location.hash.replace('#', '') || 'pomodoro';
navigateTo(startPanel);
