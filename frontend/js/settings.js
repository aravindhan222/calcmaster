/**
 * CalcMaster Settings Module
 * Handles user preferences, theme switching, precision configuration, angle units, and memory slot management
 */

window.CalcMaster = window.CalcMaster || {};

window.CalcMaster.Settings = (() => {
  const SETTINGS_KEY = 'calcmaster_settings';

  const defaultSettings = {
    theme: 'dark',
    precision: 10,
    angleUnit: 'DEG',
    numberFormat: 'standard'
  };

  let state = { ...defaultSettings };

  /**
   * Load settings from localStorage
   */
  function load() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        state = { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error reading settings from localStorage:', e);
      state = { ...defaultSettings };
    }
  }

  /**
   * Save settings to localStorage
   */
  function save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  /**
   * Apply settings to the DOM
   */
  function apply() {
    // 1. Theme
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', state.theme === 'light' ? '#f3efe6' : '#0f172a');
    }
    const themeRadios = document.querySelectorAll('input[name="theme-choice"]');
    themeRadios.forEach((radio) => {
      radio.checked = (radio.value === state.theme);
    });

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      const sunIcon = themeToggleBtn.querySelector('.icon-sun');
      const moonIcon = themeToggleBtn.querySelector('.icon-moon');
      if (sunIcon && moonIcon) {
        if (state.theme === 'light') {
          sunIcon.style.display = 'none';
          moonIcon.style.display = 'inline-block';
        } else {
          sunIcon.style.display = 'inline-block';
          moonIcon.style.display = 'none';
        }
      }
    }

    // 2. Precision
    const precisionSlider = document.getElementById('setting-precision-slider');
    const precisionValue = document.getElementById('setting-precision-val');
    if (precisionSlider) {
      precisionSlider.value = state.precision;
    }
    if (precisionValue) {
      precisionValue.textContent = `${state.precision} digits`;
    }

    // 3. Angle unit
    const angleRadios = document.querySelectorAll('input[name="angle-choice"]');
    angleRadios.forEach((radio) => {
      radio.checked = (radio.value === state.angleUnit);
    });

    // Sync angle badge in scientific calculator
    if (window.CalcMaster.Scientific && typeof window.CalcMaster.Scientific.syncAngleUnit === 'function') {
      window.CalcMaster.Scientific.syncAngleUnit(state.angleUnit);
    }

    // 4. Number format
    const formatRadios = document.querySelectorAll('input[name="format-choice"]');
    formatRadios.forEach((radio) => {
      radio.checked = (radio.value === state.numberFormat);
    });

    // Render memory table
    renderMemoryTable();
  }

  /**
   * Initializes settings listeners and loads state
   */
  function init() {
    load();
    apply();

    // Theme Radios
    const themeRadios = document.querySelectorAll('input[name="theme-choice"]');
    themeRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        setTheme(e.target.value);
      });
    });

    // Precision Slider
    const precisionSlider = document.getElementById('setting-precision-slider');
    const precisionValue = document.getElementById('setting-precision-val');
    if (precisionSlider) {
      precisionSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.precision = val;
        if (precisionValue) precisionValue.textContent = `${val} digits`;
        save();
      });
    }

    // Angle Unit Radios
    const angleRadios = document.querySelectorAll('input[name="angle-choice"]');
    angleRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        setAngleUnit(e.target.value);
      });
    });

    // Number Format Radios
    const formatRadios = document.querySelectorAll('input[name="format-choice"]');
    formatRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        setNumberFormat(e.target.value);
      });
    });

    // Clear History Button
    const clearHistoryBtn = document.getElementById('btn-settings-clear-history');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to permanently delete all calculation history?')) {
          try {
            await window.CalcMaster.API.clearHistory();
            if (window.CalcMaster.History) {
              window.CalcMaster.History.render();
            }
            if (window.CalcMaster.App) {
              window.CalcMaster.App.showToast('Calculation history cleared successfully', 'success');
            }
          } catch (err) {
            if (window.CalcMaster.App) {
              window.CalcMaster.App.showToast('Failed to clear history: ' + err.message, 'error');
            }
          }
        }
      });
    }

    // Clear Memory Button
    const clearMemoryBtn = document.getElementById('btn-settings-clear-memory');
    if (clearMemoryBtn) {
      clearMemoryBtn.addEventListener('click', () => {
        if (window.CalcMaster.Memory) {
          window.CalcMaster.Memory.clearAll();
          renderMemoryTable();
        }
      });
    }

    // Quick Theme Toggle Button in Header
    const headerThemeBtn = document.getElementById('theme-toggle-btn');
    if (headerThemeBtn) {
      headerThemeBtn.addEventListener('click', () => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
      });
    }
  }

  function setTheme(theme) {
    state.theme = theme;
    save();
    apply();
    window.dispatchEvent(new CustomEvent('calcmaster:themechange', { detail: { theme: state.theme } }));
    if (window.CalcMaster.App) {
      window.CalcMaster.App.showToast(`Switched to ${theme} theme`, 'info');
    }
  }

  function getChartPalette() {
    const cs = getComputedStyle(document.documentElement);
    const token = (name) => cs.getPropertyValue(name).trim();
    const isLight = state.theme === 'light';
    return {
      muted: token('--text-muted') || (isLight ? '#6b635a' : '#94a3b8'),
      grid: isLight ? 'rgba(176, 149, 112, 0.28)' : 'rgba(148, 163, 184, 0.1)',
      accent: token('--accent-primary') || (isLight ? '#0d9488' : '#3b82f6'),
      accentSoft: isLight ? 'rgba(13, 148, 136, 0.7)' : 'rgba(59, 130, 246, 0.75)',
      rose: token('--accent-rose') || '#f43f5e',
      indigo: isLight ? '#0f766e' : '#8b5cf6',
      emerald: token('--accent-emerald') || '#10b981',
      amber: token('--accent-amber') || '#f59e0b',
      cyan: token('--accent-cyan') || '#06b6d4'
    };
  }

  function setPrecision(val) {
    state.precision = Math.max(6, Math.min(34, parseInt(val, 10) || 10));
    save();
    apply();
  }

  function setAngleUnit(unit) {
    state.angleUnit = unit === 'RAD' ? 'RAD' : 'DEG';
    save();
    apply();
    if (window.CalcMaster.App) {
      window.CalcMaster.App.showToast(`Angle unit set to ${state.angleUnit}`, 'info');
    }
  }

  function setNumberFormat(format) {
    state.numberFormat = format;
    save();
    apply();
  }

  function getPrecision() {
    return state.precision;
  }

  function getAngleUnit() {
    return state.angleUnit;
  }

  function getNumberFormat() {
    return state.numberFormat;
  }

  function getTheme() {
    return state.theme;
  }

  /**
   * Formats a raw number according to user precision and format choice
   */
  function formatOutput(num) {
    if (num === null || num === undefined || num === '') return '';
    const n = Number(num);
    if (isNaN(n)) return String(num);

    if (state.numberFormat === 'scientific') {
      return n.toExponential(Math.min(state.precision, 12));
    }

    // Standard format with precision limit
    if (Number.isInteger(n)) {
      return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    const precision = Math.min(state.precision, 16);
    // Remove floating rounding artifacts
    const rounded = parseFloat(n.toFixed(precision));
    return rounded.toLocaleString('en-US', { maximumFractionDigits: precision });
  }

  /**
   * Renders memory slots in the Settings UI
   */
  function renderMemoryTable() {
    const container = document.getElementById('settings-memory-table-body');
    if (!container || !window.CalcMaster.Memory) return;

    const slots = window.CalcMaster.Memory.getAllSlots();
    const activeSlot = window.CalcMaster.Memory.getActiveSlot();

    let html = '';
    Object.keys(slots).forEach((key) => {
      const val = slots[key];
      const isActive = key === activeSlot;
      html += `
        <tr class="${isActive ? 'memory-row-active' : ''}">
          <td>
            <strong>${key}</strong>
            ${isActive ? '<span class="badge badge-primary" style="margin-left: 6px;">Active</span>' : ''}
          </td>
          <td class="font-mono">${val}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-ghost" onclick="window.CalcMaster.Memory.setActiveSlot('${key}')" title="Make Active">
              Set Active
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="window.CalcMaster.Memory.setSlotValue('${key}', 0)" title="Clear Slot">
              Clear
            </button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = html;
  }

  return {
    init,
    load,
    save,
    apply,
    setTheme,
    setPrecision,
    setAngleUnit,
    setNumberFormat,
    getPrecision,
    getAngleUnit,
    getNumberFormat,
    getTheme,
    getChartPalette,
    formatOutput,
    renderMemoryTable
  };
})();
