/**
 * CalcMaster Statistics Calculator Module
 * Descriptive statistics engine with frequency distribution histogram,
 * scatter distribution chart, preset datasets, and animated metric cards
 */

window.CalcMaster = window.CalcMaster || {};

window.CalcMaster.Statistics = (() => {
  let barChart = null;
  let scatterChart = null;

  const SAMPLE_DATASETS = {
    examScores: [72, 85, 91, 68, 77, 85, 94, 62, 88, 79, 85, 90, 74, 82, 89],
    salesData: [1200, 1450, 1300, 1750, 1900, 2100, 1850, 2300, 2400, 2200],
    normalDist: [10.2, 11.5, 9.8, 10.5, 12.1, 10.0, 9.5, 11.0, 10.8, 10.1, 9.9, 11.3]
  };

  let lastDataset = [];

  function init() {
    setupEventListeners();
    // Pre-populate with sample data on first load
    loadSample('examScores');

    window.addEventListener('calcmaster:themechange', () => {
      if (lastDataset.length) {
        renderBarChart(lastDataset);
        renderScatterChart(lastDataset);
      }
    });
  }

  function palette() {
    if (window.CalcMaster.Settings && typeof window.CalcMaster.Settings.getChartPalette === 'function') {
      return window.CalcMaster.Settings.getChartPalette();
    }
    return {
      muted: '#94a3b8',
      grid: 'rgba(148, 163, 184, 0.1)',
      accent: '#3b82f6',
      accentSoft: 'rgba(59, 130, 246, 0.75)',
      indigo: '#8b5cf6'
    };
  }

  function setupEventListeners() {
    const calcBtn = document.getElementById('stats-calculate-btn');
    const clearBtn = document.getElementById('stats-clear-btn');
    const sampleSelect = document.getElementById('stats-sample-select');

    if (calcBtn) {
      calcBtn.addEventListener('click', calculate);
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const textarea = document.getElementById('stats-input');
        if (textarea) textarea.value = '';
        clearMetrics();
      });
    }

    if (sampleSelect) {
      sampleSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          loadSample(e.target.value);
        }
      });
    }
  }

  function loadSample(key) {
    const textarea = document.getElementById('stats-input');
    if (textarea && SAMPLE_DATASETS[key]) {
      textarea.value = SAMPLE_DATASETS[key].join(', ');
      calculate();
    }
  }

  function parseInputNumbers(text) {
    if (!text || !text.trim()) return [];
    // Split by comma, space, semicolon, or newline
    return text
      .split(/[\s,;\n\r]+/)
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(Number)
      .filter(n => !isNaN(n) && isFinite(n));
  }

  async function calculate() {
    const textarea = document.getElementById('stats-input');
    if (!textarea) return;

    const dataArray = parseInputNumbers(textarea.value);

    if (dataArray.length === 0) {
      if (window.CalcMaster.App) {
        window.CalcMaster.App.showToast('Please enter at least one valid numeric data point', 'error');
      }
      return;
    }

    try {
      if (window.CalcMaster.App) window.CalcMaster.App.showLoading(true);

      const stats = await window.CalcMaster.API.calculateStatistics(dataArray);
      lastDataset = dataArray;

      // Render metrics
      renderMetrics(stats);

      // Render charts
      renderBarChart(dataArray);
      renderScatterChart(dataArray);

      // Save to history
      await window.CalcMaster.API.saveHistoryItem({
        expression: `Stats [N=${stats.count}]: ${dataArray.slice(0, 5).join(', ')}${dataArray.length > 5 ? '...' : ''}`,
        result: `Mean: ${formatStat(stats.mean)}, StdDev: ${formatStat(stats.stdDev)}`,
        type: 'STATISTICS',
        timestamp: new Date().toISOString()
      });

      if (window.CalcMaster.App) {
        window.CalcMaster.App.showToast(`Analyzed ${stats.count} data points successfully`, 'success');
      }
    } catch (err) {
      console.error('Stats error:', err);
      if (window.CalcMaster.App) {
        window.CalcMaster.App.showToast(err.message || 'Error processing statistics', 'error');
      }
    } finally {
      if (window.CalcMaster.App) window.CalcMaster.App.showLoading(false);
    }
  }

  function formatStat(num) {
    if (num === undefined || num === null) return '—';
    if (Array.isArray(num)) {
      return num.length ? num.map(n => typeof n === 'number' ? formatStat(n) : n).join(', ') : 'None';
    }
    const n = Number(num);
    if (isNaN(n)) return String(num);
    if (Number.isInteger(n)) return n.toLocaleString();
    return parseFloat(n.toFixed(4)).toLocaleString();
  }

  function renderMetrics(stats) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = formatStat(val);
        el.classList.add('result-pop');
        setTimeout(() => el.classList.remove('result-pop'), 300);
      }
    };

    setVal('stat-count', stats.count);
    setVal('stat-sum', stats.sum);
    setVal('stat-mean', stats.mean);
    setVal('stat-median', stats.median);
    setVal('stat-mode', stats.mode);
    setVal('stat-variance', stats.variance);
    setVal('stat-stddev', stats.stdDev);
    setVal('stat-min', stats.min);
    setVal('stat-max', stats.max);
    setVal('stat-range', stats.range);
  }

  function clearMetrics() {
    const fields = [
      'stat-count', 'stat-sum', 'stat-mean', 'stat-median', 'stat-mode',
      'stat-variance', 'stat-stddev', 'stat-min', 'stat-max', 'stat-range'
    ];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });

    if (barChart) {
      barChart.destroy();
      barChart = null;
    }
    if (scatterChart) {
      scatterChart.destroy();
      scatterChart = null;
    }
  }

  function renderBarChart(data) {
    const canvas = document.getElementById('stats-bar-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const colors = palette();

    if (barChart) barChart.destroy();

    // Create histogram bins
    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    let labels = [];
    let counts = [];

    if (min === max || sorted.length < 5) {
      // Frequency of unique items
      const freq = {};
      sorted.forEach(v => freq[v] = (freq[v] || 0) + 1);
      labels = Object.keys(freq);
      counts = Object.values(freq);
    } else {
      // Histogram with 6 bins
      const binCount = Math.min(8, Math.max(4, Math.floor(Math.sqrt(sorted.length))));
      const binWidth = (max - min) / binCount;
      const bins = Array(binCount).fill(0);
      labels = Array(binCount).fill('').map((_, i) => {
        const start = min + i * binWidth;
        const end = start + binWidth;
        return `${start.toFixed(1)} - ${end.toFixed(1)}`;
      });

      sorted.forEach((val) => {
        let binIdx = Math.floor((val - min) / binWidth);
        if (binIdx >= binCount) binIdx = binCount - 1;
        bins[binIdx]++;
      });
      counts = bins;
    }

    barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Frequency',
          data: counts,
          backgroundColor: colors.accentSoft,
          borderColor: colors.accent,
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Count: ${ctx.raw}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: colors.grid },
            ticks: { color: colors.muted, font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: colors.grid },
            ticks: { color: colors.muted, precision: 0 }
          }
        }
      }
    });
  }

  function renderScatterChart(data) {
    const canvas = document.getElementById('stats-scatter-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const colors = palette();

    if (scatterChart) scatterChart.destroy();

    const scatterData = data.map((val, idx) => ({ x: idx + 1, y: val }));

    scatterChart = new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Value Sequence',
          data: scatterData,
          backgroundColor: colors.indigo,
          borderColor: colors.indigo,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Item #${ctx.raw.x}: ${ctx.raw.y}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Data Point Index', color: colors.muted },
            grid: { color: colors.grid },
            ticks: { color: colors.muted }
          },
          y: {
            title: { display: true, text: 'Value', color: colors.muted },
            grid: { color: colors.grid },
            ticks: { color: colors.muted }
          }
        }
      }
    });
  }

  return {
    init,
    calculate,
    loadSample
  };
})();
