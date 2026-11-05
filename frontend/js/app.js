/**
 * CalcMaster Main Application Controller
 * Master orchestrator handling section routing, responsive navigation, toast notifications,
 * global keyboard routing, service worker registration, and module lifecycle
 */

window.CalcMaster = window.CalcMaster || {};

window.CalcMaster.App = (() => {
  let activeSection = 'standard';

  /**
   * Initializes CalcMaster Application
   */
  function init() {
    console.log('[CalcMaster] Initializing application modules...');

    // 1. Initialize Settings (theme, precision, format)
    if (window.CalcMaster.Settings) {
      window.CalcMaster.Settings.init();
    }

    // 2. Initialize Memory slots
    if (window.CalcMaster.Memory) {
      window.CalcMaster.Memory.init();
    }

    // 3. Initialize Standard Calculator
    if (window.CalcMaster.Calculator) {
      window.CalcMaster.Calculator.init();
    }

    // 4. Initialize Scientific Calculator
    if (window.CalcMaster.Scientific) {
      window.CalcMaster.Scientific.init();
    }

    // 5. Initialize Financial Calculator
    if (window.CalcMaster.Financial) {
      window.CalcMaster.Financial.init();
    }

    // 6. Initialize Statistics Calculator
    if (window.CalcMaster.Statistics) {
      window.CalcMaster.Statistics.init();
    }

    // 7. Initialize Unit Converter
    if (window.CalcMaster.Converter) {
      window.CalcMaster.Converter.init();
    }

    // 8. Initialize Calculation History
    if (window.CalcMaster.History) {
      window.CalcMaster.History.init();
    }

    // Setup Navigation & Global listeners
    setupNavigation();
    setupGlobalKeyboard();
    registerServiceWorker();

    console.log('[CalcMaster] Application initialized successfully');
  }

  /**
   * Setup Desktop Sidebar and Mobile Bottom Bar navigation
   */
  function setupNavigation() {
    // Both sidebar links and mobile bottom tab links
    const navItems = document.querySelectorAll('[data-nav-target]');
    navItems.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.dataset.navTarget;
        navigateTo(target);
      });
    });

    // Check URL hash for initial tab or default to 'standard'
    const initialHash = window.location.hash.replace('#', '');
    const validSections = ['standard', 'scientific', 'financial', 'statistics', 'converter', 'history', 'settings'];
    if (validSections.includes(initialHash)) {
      navigateTo(initialHash);
    } else {
      navigateTo('standard');
    }

    // Browser back/forward navigation support
    window.addEventListener('popstate', (e) => {
      const stateSection = e.state ? e.state.section : 'standard';
      if (validSections.includes(stateSection)) {
        navigateTo(stateSection, false);
      }
    });
  }

  /**
   * Switch between app sections
   */
  function navigateTo(sectionName, pushState = true) {
    activeSection = sectionName;

    // Update URL hash
    if (pushState && window.location.hash !== `#${sectionName}`) {
      window.history.pushState({ section: sectionName }, '', `#${sectionName}`);
    }

    // Update active nav links across desktop and mobile
    const allNavButtons = document.querySelectorAll('[data-nav-target]');
    allNavButtons.forEach((btn) => {
      if (btn.dataset.navTarget === sectionName) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      }
    });

    // Toggle Section visibility
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach((sec) => {
      if (sec.dataset.section === sectionName) {
        sec.style.display = 'block';
        sec.classList.add('section-active');
      } else {
        sec.style.display = 'none';
        sec.classList.remove('section-active');
      }
    });

    // Refresh module-specific views on display
    if (sectionName === 'history' && window.CalcMaster.History) {
      window.CalcMaster.History.render();
    } else if (sectionName === 'settings' && window.CalcMaster.Settings) {
      window.CalcMaster.Settings.renderMemoryTable();
    } else if (sectionName === 'financial') {
      window.dispatchEvent(new Event('resize'));
    }

    // Scroll to top of content
    const mainContent = document.getElementById('main-content-area');
    if (mainContent) mainContent.scrollTop = 0;
  }

  /**
   * Global Keyboard Routing
   */
  function setupGlobalKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept if focus is inside an input, textarea, or select
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      // Check active section
      if (activeSection === 'standard' && window.CalcMaster.Calculator) {
        window.CalcMaster.Calculator.handleKeyboard(e);
      } else if (activeSection === 'scientific' && window.CalcMaster.Scientific) {
        window.CalcMaster.Scientific.handleKeyboard(e);
      }
    });
  }

  /**
   * Toast notification system
   * @param {string} message
   * @param {'success'|'error'|'info'|'warning'} type
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-body">${message}</div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 250);
    });

    container.appendChild(toast);

    // Auto remove after 3.8s
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 250);
      }
    }, 3800);
  }

  /**
   * Loading Spinner Overlay Controller
   * @param {boolean} show
   */
  function showLoading(show = true) {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    if (show) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }

  /**
   * Progressive Web App service worker registration
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
          })
          .catch((err) => {
            console.log('[PWA] Service Worker registration skipped/failed:', err.message);
          });
      });
    }
  }

  // DOMContentLoaded hook
  document.addEventListener('DOMContentLoaded', init);

  return {
    init,
    navigateTo,
    showToast,
    showLoading,
    getActiveSection: () => activeSection
  };
})();
