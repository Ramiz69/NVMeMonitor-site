const preferences = {
  read(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  save(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* Storage may be unavailable. */ }
  },
};

const themeKey = 'nvme-site-theme';
const unitKey = 'nvme-site-unit';
const theme = preferences.read(themeKey);

function applyTheme(value) {
  if (value === 'light' || value === 'dark') {
    document.documentElement.dataset.theme = value;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

applyTheme(theme);

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.masthead');
  const mobileToggle = header.querySelector('.mobile-toggle');
  const dropdowns = [...document.querySelectorAll('.dropdown')];

  function focusTrigger(trigger, pointer = false) {
    trigger.toggleAttribute('data-pointer-focus', pointer);
    trigger.focus({ preventScroll: true });
  }

  function setNavigation(open) {
    mobileToggle.setAttribute('aria-expanded', String(open));
    if (!open) {
      header.querySelectorAll('.dropdown[open]').forEach(dropdown => { dropdown.open = false; });
    }
  }

  mobileToggle.hidden = false;
  mobileToggle.addEventListener('click', () => {
    setNavigation(mobileToggle.getAttribute('aria-expanded') === 'false');
  });
  header.querySelector('nav').addEventListener('click', event => {
    if (event.target.closest('a')) setNavigation(false);
  });
  header.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || mobileToggle.getAttribute('aria-expanded') !== 'true') return;
    event.preventDefault();
    setNavigation(false);
    mobileToggle.focus();
  });

  document.addEventListener('keydown', () => {
    document.querySelectorAll('[data-pointer-focus]').forEach(trigger => {
      trigger.removeAttribute('data-pointer-focus');
    });
  }, { capture: true });

  document.addEventListener('click', event => {
    for (const dropdown of dropdowns) {
      if (!dropdown.contains(event.target)) dropdown.open = false;
    }
  });

  for (const dropdown of dropdowns) {
    const trigger = dropdown.querySelector('summary');
    const options = [...dropdown.querySelectorAll('.dropdown-options a, .dropdown-options button')];
    trigger.addEventListener('pointerdown', () => trigger.setAttribute('data-pointer-focus', ''));
    trigger.addEventListener('blur', () => trigger.removeAttribute('data-pointer-focus'));
    dropdown.addEventListener('focusout', event => {
      if (event.relatedTarget && !dropdown.contains(event.relatedTarget)) dropdown.open = false;
    });
    dropdown.addEventListener('keydown', event => {
      if (event.key === 'Escape' && dropdown.open) {
        event.preventDefault();
        event.stopPropagation();
        focusTrigger(trigger);
        dropdown.open = false;
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      if (!dropdown.open && (event.key === 'Home' || event.key === 'End')) return;
      event.preventDefault();
      const previous = options.indexOf(event.target);
      let next = 0;
      if (event.key === 'End' || (event.key === 'ArrowUp' && previous === -1)) {
        next = options.length - 1;
      } else if (event.key === 'ArrowDown') {
        next = (previous + 1) % options.length;
      } else if (event.key === 'ArrowUp') {
        next = (previous + options.length - 1) % options.length;
      }
      for (const other of dropdowns) {
        if (other !== dropdown) other.open = false;
      }
      dropdown.open = true;
      options[next].focus();
    });
  }

  function bindPreference(id, key, initial, fallback, apply) {
    const dropdown = document.getElementById(id);
    const label = dropdown.querySelector('.dropdown-value');
    const trigger = dropdown.querySelector('summary');
    const options = [...dropdown.querySelectorAll('button[data-value]')];
    const update = (value, initialUpdate = false) => {
      const selected = options.find(option => option.dataset.value === value);
      label.textContent = selected.textContent;
      for (const option of options) {
        option.setAttribute('aria-pressed', String(option === selected));
      }
      apply(value, initialUpdate);
    };

    update(options.some(option => option.dataset.value === initial) ? initial : fallback, true);
    dropdown.closest('.control').hidden = false;
    dropdown.addEventListener('click', event => {
      const option = event.target.closest('button[data-value]');
      if (!option) return;
      const value = option.dataset.value;
      update(value);
      preferences.save(key, value);
      focusTrigger(trigger, event.detail > 0);
      dropdown.open = false;
    });
  }

  bindPreference('theme', themeKey, theme, 'system', applyTheme);
  const preview = document.querySelector('#smart-preview');
  if (!preview) return;

  const regionalUnit = /-US$/i.test(navigator.language) ? 'fahrenheit' : 'celsius';
  const previewArt = preview.parentElement;
  let shouldReplay = true;
  const readoutObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) {
      previewArt.removeAttribute('data-readout-active');
      shouldReplay = true;
    } else if (shouldReplay && entry.intersectionRatio >= .3) {
      previewArt.setAttribute('data-readout-active', '');
      shouldReplay = false;
    }
  }, { threshold: [0, .3] });
  readoutObserver.observe(previewArt);

  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  let requestedSource = preview.getAttribute('src');
  let outgoing;

  async function updatePreview(value, initial) {
    const source = value === 'fahrenheit' ? '/assets/smart-fahrenheit.webp' : '/assets/smart.webp';
    requestedSource = source;
    if (initial || !motion.matches) {
      preview.src = source;
      return;
    }

    const incoming = new Image();
    incoming.src = source;
    try {
      await incoming.decode();
    } catch {
      return;
    }
    if (source !== requestedSource || source === preview.getAttribute('src')) return;

    outgoing?.remove();
    if (!motion.matches || !preview.complete || !preview.naturalWidth) {
      preview.src = source;
      return;
    }

    const previous = preview.cloneNode();
    previous.removeAttribute('id');
    previous.alt = '';
    previous.classList.add('preview-outgoing');
    preview.after(previous);
    outgoing = previous;
    preview.src = source;
    previous.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 320,
      easing: 'ease-out',
      fill: 'forwards',
    }).onfinish = () => {
      previous.remove();
      if (outgoing === previous) outgoing = undefined;
    };
  }

  motion.addEventListener('change', () => {
    if (!motion.matches) outgoing?.remove();
  });
  bindPreference('temperature-unit', unitKey, preferences.read(unitKey), regionalUnit, updatePreview);
});
