const preferences = {
  read(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  save(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* Private storage can be unavailable. */ }
  },
};

const themeKey = 'nvme-site-theme';
const unitKey = 'nvme-site-unit';
const theme = preferences.read(themeKey);
if (theme === 'light' || theme === 'dark') {
  document.documentElement.dataset.theme = theme;
}

document.addEventListener('DOMContentLoaded', () => {
  const themeSelect = document.querySelector('#theme');
  themeSelect.value = theme === 'light' || theme === 'dark' ? theme : 'system';
  themeSelect.closest('label').hidden = false;
  themeSelect.addEventListener('change', () => {
    const next = themeSelect.value;
    if (next === 'system') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = next;
    }
    preferences.save(themeKey, next);
  });

  const languageMenu = document.querySelector('.languages');
  if (languageMenu) {
    const summary = languageMenu.querySelector('summary');
    languageMenu.addEventListener('keydown', event => {
      if (event.key === 'Escape' && languageMenu.open) {
        languageMenu.open = false;
        summary.focus();
      }
    });
    document.addEventListener('click', event => {
      if (!languageMenu.contains(event.target)) languageMenu.open = false;
    });
  }

  const unit = document.querySelector('#temperature-unit');
  const preview = document.querySelector('#smart-preview');
  if (!unit || !preview) return;

  const stored = preferences.read(unitKey);
  unit.value = stored === 'celsius' || stored === 'fahrenheit'
    ? stored
    : /-US$/i.test(navigator.language) ? 'fahrenheit' : 'celsius';
  const showUnit = () => {
    preview.src = unit.value === 'fahrenheit' ? '/assets/smart-fahrenheit.webp' : '/assets/smart.webp';
  };
  showUnit();
  unit.closest('label').hidden = false;
  unit.addEventListener('change', () => {
    preferences.save(unitKey, unit.value);
    showUnit();
  });
});
