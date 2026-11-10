/**
 * GenSurat — Buttery Smooth Dark/Light Theme Transition Engine
 * Inspired by & unified with InLiveIq's Radial Reveal & Nuance Design System.
 * 
 * Features:
 * 1. Native View Transitions API with GPU-accelerated Circular Radial Reveal (Chrome, Edge, Safari 18+)
 * 2. Silky Universal Cross-Fade & Ripple Fallback (Firefox, older browsers)
 * 3. Interactive Elastic Spin & Sun ↔ Moon Morph Animation on Toggle Button
 * 4. Full Backward Compatibility with .light-mode / .dark classes and localStorage('theme')
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'theme';
  const THEME_DARK = 'dark';
  const THEME_LIGHT = 'light';

  // Nuance palette targets matching InLiveIq
  const THEME_BG_COLORS = {
    dark: '#04070c',
    light: '#f5f6fa'
  };

  let inMemoryTheme = null;
  const safeStorage = {
    get(key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (e) {}
      return inMemoryTheme;
    },
    set(key, val) {
      inMemoryTheme = val;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, val);
        }
      } catch (e) {}
    }
  };

  let isTransitioning = false;

  function getSystemPreference() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return THEME_LIGHT;
      }
    } catch (e) {}
    return THEME_DARK;
  }

  function getCurrentTheme() {
    const fromDoc = document.documentElement.getAttribute('data-theme');
    if (fromDoc === THEME_LIGHT || fromDoc === THEME_DARK) return fromDoc;
    if (document.documentElement.classList.contains('light-mode')) return THEME_LIGHT;
    if (document.documentElement.classList.contains('dark')) return THEME_DARK;
    return safeStorage.get(STORAGE_KEY) || THEME_DARK;
  }

  function syncAllIcons(theme) {
    const isLight = theme === THEME_LIGHT;
    const labelText = isLight ? 'Beralih ke mode gelap' : 'Beralih ke mode terang';

    // Theme toggle buttons ARIA and tooltips
    const buttons = document.querySelectorAll('.theme-toggle-btn, .theme-toggle, button[onclick*="toggleTheme"]');
    buttons.forEach(btn => {
      btn.setAttribute('aria-label', labelText);
      btn.setAttribute('title', labelText);
    });

    // FontAwesome icon fallbacks
    document.querySelectorAll('.theme-toggle-icon, #themeIcon, #mobileThemeIcon').forEach(icon => {
      if (isLight) {
        icon.className = icon.id === 'mobileThemeIcon' 
          ? 'fa-solid fa-moon text-neutral-500' 
          : 'fa-solid fa-moon text-xs text-neutral-700';
      } else {
        icon.className = icon.id === 'mobileThemeIcon'
          ? 'fa-solid fa-sun text-amber-400'
          : 'fa-solid fa-sun text-xs text-amber-300';
      }
    });

    const mobLabel = document.getElementById('mobileThemeLabel');
    if (mobLabel) {
      mobLabel.innerText = isLight ? 'Mode Gelap' : 'Mode Terang';
    }

    // Sync meta theme-color for browser chrome / mobile address bars
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isLight ? '#f5f6fa' : '#04070c');
    }
  }

  function applyThemeInstant(theme) {
    const targetTheme = (theme === THEME_LIGHT) ? THEME_LIGHT : THEME_DARK;

    // Set data-theme on html & body
    document.documentElement.setAttribute('data-theme', targetTheme);
    if (document.body) {
      document.body.setAttribute('data-theme', targetTheme);
    }

    // Maintain existing class compatibility
    if (targetTheme === THEME_LIGHT) {
      document.documentElement.classList.add('light-mode', 'theme-light');
      document.documentElement.classList.remove('dark', 'theme-dark');
      if (document.body) {
        document.body.classList.add('light-mode', 'theme-light');
        document.body.classList.remove('dark', 'theme-dark');
      }
    } else {
      document.documentElement.classList.remove('light-mode', 'theme-light');
      document.documentElement.classList.add('dark', 'theme-dark');
      if (document.body) {
        document.body.classList.remove('light-mode', 'theme-light');
        document.body.classList.add('dark', 'theme-dark');
      }
    }

    safeStorage.set(STORAGE_KEY, targetTheme);
    syncAllIcons(targetTheme);

    // Notify any listening components
    try {
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: targetTheme } }));
    } catch (e) {}
  }

  function triggerButtonAnimation(btn) {
    if (!btn) return;
    btn.classList.remove('toggling');
    void btn.offsetWidth; // Force reflow
    btn.classList.add('toggling');
    setTimeout(() => {
      btn.classList.remove('toggling');
    }, 600);
  }

  /**
   * Main Theme Toggle with GPU-Accelerated Circular Clip-Path Reveal
   */
  function toggleTheme(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (isTransitioning) return;

    const currentTheme = getCurrentTheme();
    const nextTheme = (currentTheme === THEME_DARK) ? THEME_LIGHT : THEME_DARK;

    // Detect click origin coordinates for the radial wave
    let clickX = window.innerWidth * 0.85;
    let clickY = 40;
    let triggerBtn = null;

    if (event) {
      triggerBtn = event.currentTarget || (event.target ? event.target.closest('.theme-toggle-btn, .theme-toggle, button[onclick*="toggleTheme"]') : null);
      if (triggerBtn) {
        const rect = triggerBtn.getBoundingClientRect();
        clickX = rect.left + rect.width / 2;
        clickY = rect.top + rect.height / 2;
        triggerButtonAnimation(triggerBtn);
      } else if (typeof event.clientX === 'number' && event.clientX > 0) {
        clickX = event.clientX;
        clickY = event.clientY;
      }
    }

    if (!triggerBtn) {
      const defaultBtn = document.querySelector('.theme-toggle-btn, .theme-toggle, button[onclick*="toggleTheme"]');
      if (defaultBtn) {
        const rect = defaultBtn.getBoundingClientRect();
        clickX = rect.left + rect.width / 2;
        clickY = rect.top + rect.height / 2;
        triggerButtonAnimation(defaultBtn);
      }
    }

    // Check reduced motion preference
    let prefersReducedMotion = false;
    try {
      prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    // CASE 1: Modern View Transitions API (Chrome 111+, Edge 111+, Safari 18+)
    if (document.startViewTransition && !prefersReducedMotion) {
      isTransitioning = true;

      const transition = document.startViewTransition(() => {
        applyThemeInstant(nextTheme);
      });

      transition.ready.then(() => {
        const maxRadius = Math.hypot(
          Math.max(clickX, window.innerWidth - clickX),
          Math.max(clickY, window.innerHeight - clickY)
        );

        const clipAnimation = document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${clickX}px ${clickY}px)`,
              `circle(${maxRadius}px at ${clickX}px ${clickY}px)`
            ]
          },
          {
            duration: 520,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );

        clipAnimation.onfinish = () => {
          isTransitioning = false;
        };
      }).catch(() => {
        isTransitioning = false;
      });

      return;
    }

    // CASE 2: Fallback for browsers without View Transitions (Ripple overlay + CSS transition)
    isTransitioning = true;
    document.documentElement.classList.add('theme-transitioning');

    if (!prefersReducedMotion && document.body) {
      const ripple = document.createElement('div');
      ripple.className = 'theme-ripple-fallback';
      const maxRadius = Math.hypot(
        Math.max(clickX, window.innerWidth - clickX),
        Math.max(clickY, window.innerHeight - clickY)
      );
      const diameter = maxRadius * 2.2;
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${clickX}px`;
      ripple.style.top = `${clickY}px`;
      ripple.style.background = THEME_BG_COLORS[nextTheme] || '#04070c';
      document.body.appendChild(ripple);

      requestAnimationFrame(() => {
        ripple.style.transform = 'translate(-50%, -50%) scale(1)';
        ripple.style.opacity = '0';
      });

      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 600);
    }

    applyThemeInstant(nextTheme);

    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
      isTransitioning = false;
    }, 480);
  }

  function initTheme() {
    const initialDocTheme = document.documentElement.getAttribute('data-theme');
    const savedTheme = safeStorage.get(STORAGE_KEY) || initialDocTheme || getSystemPreference();
    applyThemeInstant(savedTheme);

    // Event delegation for theme toggle buttons
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('.theme-toggle-btn, .theme-toggle');
      if (toggle) {
        e.preventDefault();
        toggleTheme(e);
      }
    });

    // Detect OS theme change if user hasn't explicitly set one
    try {
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
          if (!safeStorage.get(STORAGE_KEY)) {
            applyThemeInstant(e.matches ? THEME_LIGHT : THEME_DARK);
          }
        });
      }
    } catch (e) {}
  }

  // Expose Global API
  window.GenSuratTheme = {
    toggle: toggleTheme,
    set: applyThemeInstant,
    get: getCurrentTheme
  };
  window.toggleTheme = toggleTheme;
  window.syncThemeIcons = () => syncAllIcons(getCurrentTheme());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
