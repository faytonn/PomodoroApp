export function initTheme() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  
  const themeToggle = document.querySelector('.theme-toggle');
  themeToggle.innerHTML = isDarkMode ? '<span>🌙 Dark Mode</span>' : '<span>☀️ Light Mode</span>';
  
  themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  const newTheme = !isDarkMode;
  
  localStorage.setItem('darkMode', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
  
  const themeToggle = document.querySelector('.theme-toggle');
  themeToggle.innerHTML = newTheme ? '<span>🌙 Dark Mode</span>' : '<span>☀️ Light Mode</span>';
}
  