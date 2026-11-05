/**
 * CalcMaster History Module
 * Full audit log of all calculations across all modules with filtering, client search,
 * CSV & PDF export, item deletion, reuse dispatcher, and empty state illustrations
 */

window.CalcMaster = window.CalcMaster || {};

window.CalcMaster.History = (() => {
  let historyItems = [];
  let currentFilter = 'ALL';
  let searchQuery = '';
  let isLoading = false;

  function init() {
    setupControls();
    loadHistory();
  }

  function setupControls() {
    const filterSelect = document.getElementById('history-type-filter');
    const searchInput = document.getElementById('history-search-input');
    const clearAllBtn = document.getElementById('history-clear-all-btn');
    const exportCsvBtn = document.getElementById('history-export-csv-btn');
    const exportPdfBtn = document.getElementById('history-export-pdf-btn');
    const refreshBtn = document.getElementById('history-refresh-btn');

    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        render();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        render();
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', async () => {
        if (confirm('Clear all calculation history records? This action cannot be undone.')) {
          try {
            await window.CalcMaster.API.clearHistory();
            historyItems = [];
            render();
            if (window.CalcMaster.App) window.CalcMaster.App.showToast('All history cleared', 'info');
          } catch (err) {
            if (window.CalcMaster.App) window.CalcMaster.App.showToast('Failed to clear history: ' + err.message, 'error');
          }
        }
      });
    }

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        window.CalcMaster.API.downloadCSV();
      });
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => {
        window.CalcMaster.API.downloadPDF();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadHistory();
      });
    }
  }

  async function loadHistory() {
    isLoading = true;
    const container = document.getElementById('history-list-container');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="spinner"></div>
          <p class="text-muted" style="margin-top: 12px;">Loading history records...</p>
        </div>
      `;
    }

    try {
      const data = await window.CalcMaster.API.getHistory();
      historyItems = Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('Could not load server history:', err);
      // Fallback local storage
      historyItems = JSON.parse(localStorage.getItem('calcmaster_history') || '[]');
    } finally {
      isLoading = false;
      render();
    }
  }

  function getBadgeClass(type) {
    const t = (type || '').toUpperCase();
    switch (t) {
      case 'STANDARD':
        return 'badge-primary';
      case 'SCIENTIFIC':
        return 'badge-indigo';
      case 'FINANCIAL':
        return 'badge-emerald';
      case 'STATISTICS':
        return 'badge-purple';
      case 'CONVERSION':
        return 'badge-amber';
      default:
        return 'badge-secondary';
    }
  }

  function formatTimestamp(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  }

  function render() {
    const container = document.getElementById('history-list-container');
    const countBadge = document.getElementById('history-total-count');
    if (!container) return;

    // Filter by type
    let filtered = historyItems;
    if (currentFilter && currentFilter !== 'ALL') {
      filtered = filtered.filter(item => (item.type || '').toUpperCase() === currentFilter.toUpperCase());
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => {
        const expr = (item.expression || '').toLowerCase();
        const res = (item.result || '').toLowerCase();
        return expr.includes(searchQuery) || res.includes(searchQuery);
      });
    }

    if (countBadge) {
      countBadge.textContent = `${filtered.length} entries`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4>No Calculation History</h4>
          <p class="text-muted">
            ${searchQuery ? 'No calculations match your search criteria.' : 'Calculations from standard, scientific, financial, and converter modules will appear here automatically.'}
          </p>
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach((item) => {
      const type = item.type || 'STANDARD';
      const badgeClass = getBadgeClass(type);
      const timeStr = formatTimestamp(item.timestamp);

      html += `
        <div class="history-card" data-id="${item.id}">
          <div class="history-card-header">
            <span class="badge ${badgeClass}">${type}</span>
            <span class="history-timestamp">${timeStr}</span>
          </div>
          <div class="history-card-body">
            <div class="history-expression font-mono">${escapeHtml(item.expression)}</div>
            <div class="history-result font-mono">= ${escapeHtml(item.result)}</div>
          </div>
          <div class="history-card-actions">
            <button class="btn btn-sm btn-ghost btn-reuse" data-expr="${encodeURIComponent(item.expression)}" data-res="${encodeURIComponent(item.result)}" data-type="${type}" title="Reuse in calculator">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              Reuse
            </button>
            <button class="btn btn-sm btn-ghost btn-copy" data-val="${encodeURIComponent(item.result)}" title="Copy Result">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
            <button class="btn btn-sm btn-ghost btn-delete text-rose" data-id="${item.id}" title="Delete Record">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Attach card event listeners
    container.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = btn.dataset.id;
        try {
          await window.CalcMaster.API.deleteHistoryItem(id);
          historyItems = historyItems.filter(i => String(i.id) !== String(id));
          render();
          if (window.CalcMaster.App) window.CalcMaster.App.showToast('Item deleted', 'info');
        } catch (err) {
          if (window.CalcMaster.App) window.CalcMaster.App.showToast('Failed to delete item', 'error');
        }
      });
    });

    container.querySelectorAll('.btn-copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = decodeURIComponent(btn.dataset.val);
        navigator.clipboard.writeText(val).then(() => {
          if (window.CalcMaster.App) window.CalcMaster.App.showToast(`Copied ${val}`, 'success');
        });
      });
    });

    container.querySelectorAll('.btn-reuse').forEach((btn) => {
      btn.addEventListener('click', () => {
        const expr = decodeURIComponent(btn.dataset.expr);
        const type = btn.dataset.type;

        // Dispatch reuse
        if (type === 'SCIENTIFIC' && window.CalcMaster.Scientific) {
          window.CalcMaster.App.navigateTo('scientific');
          // Strip possible angle badge suffix e.g. " [DEG]"
          const cleanExpr = expr.replace(/\s\[(DEG|RAD)\]$/, '');
          window.CalcMaster.Scientific.setExpression(cleanExpr);
        } else if (window.CalcMaster.Calculator) {
          window.CalcMaster.App.navigateTo('standard');
          window.CalcMaster.Calculator.setExpression(expr);
        }
        if (window.CalcMaster.App) window.CalcMaster.App.showToast('Loaded into calculator', 'info');
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    init,
    loadHistory,
    render
  };
})();
