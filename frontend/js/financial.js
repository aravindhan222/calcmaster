/**
 * CalcMaster Financial Calculator Module
 * Handles EMI, Compound Interest, and Simple Interest calculations with Chart.js visualizations,
 * paginated amortization tables, currency formatting, and form validations
 */

window.CalcMaster = window.CalcMaster || {};

window.CalcMaster.Financial = (() => {
  let activeTab = 'emi'; // 'emi', 'compound', 'simple'

  // Chart instances
  let emiPieChart = null;
  let emiLineChart = null;
  let compoundChart = null;
  let simpleChart = null;

  // Pagination for EMI amortization table
  let amortizationSchedule = [];
  let currentPage = 1;
  const PAGE_SIZE = 12;
  let lastEmiChart = null;
  let lastCompoundChart = null;
  let lastSimpleChart = null;

  const CURRENCY_SYMBOLS = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };

  function init() {
    setupSubtabs();
    setupEmiForm();
    setupCompoundForm();
    setupSimpleForm();

    // Run initial demo calculation for EMI so the view looks vibrant immediately
    calculateEmi();

    window.addEventListener('calcmaster:themechange', () => {
      if (lastEmiChart) {
        renderEmiCharts(lastEmiChart.principal, lastEmiChart.totalInterest, lastEmiChart.schedule, lastEmiChart.currency);
      }
      if (lastCompoundChart) {
        renderCompoundChart(lastCompoundChart.principal, lastCompoundChart.totalInterest, lastCompoundChart.currency);
      }
      if (lastSimpleChart) {
        renderSimpleChart(lastSimpleChart.principal, lastSimpleChart.interest, lastSimpleChart.currency);
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
      rose: '#f43f5e',
      emerald: '#10b981',
      indigo: '#6366f1',
      amber: '#f59e0b',
      cyan: '#06b6d4'
    };
  }

  function getCurrencySymbol(code) {
    return CURRENCY_SYMBOLS[code] || '$';
  }

  function formatCurrency(amount, currencyCode = 'INR') {
    const sym = getCurrencySymbol(currencyCode);
    const num = Number(amount) || 0;
    return `${sym} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function setupSubtabs() {
    const tabs = document.querySelectorAll('.financial-subtab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.dataset.financialTab;

        document.querySelectorAll('.financial-pane').forEach((pane) => {
          pane.style.display = pane.id === `financial-pane-${activeTab}` ? 'block' : 'none';
        });

        // Trigger chart resize
        window.dispatchEvent(new Event('resize'));
      });
    });
  }

  // ==========================================
  // 1. EMI Calculator
  // ==========================================
  function setupEmiForm() {
    const form = document.getElementById('emi-form');
    const resetBtn = document.getElementById('emi-reset-btn');
    const prevPageBtn = document.getElementById('amortization-prev-page');
    const nextPageBtn = document.getElementById('amortization-next-page');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateEmi();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        document.getElementById('emi-principal').value = '1000000';
        document.getElementById('emi-rate').value = '8.5';
        document.getElementById('emi-tenure').value = '120';
        calculateEmi();
      });
    }

    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderAmortizationPage();
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(amortizationSchedule.length / PAGE_SIZE);
        if (currentPage < totalPages) {
          currentPage++;
          renderAmortizationPage();
        }
      });
    }

    const copyEmiBtn = document.getElementById('emi-copy-result-btn');
    if (copyEmiBtn) {
      copyEmiBtn.addEventListener('click', () => {
        const emiText = document.getElementById('emi-monthly-val').textContent;
        navigator.clipboard.writeText(emiText).then(() => {
          if (window.CalcMaster.App) {
            window.CalcMaster.App.showToast(`EMI ${emiText} copied to clipboard`, 'success');
          }
        });
      });
    }
  }

  async function calculateEmi() {
    const principalInput = document.getElementById('emi-principal');
    const rateInput = document.getElementById('emi-rate');
    const tenureInput = document.getElementById('emi-tenure');
    const currencySelect = document.getElementById('emi-currency');

    if (!principalInput || !rateInput || !tenureInput) return;

    const principal = parseFloat(principalInput.value);
    const annualRate = parseFloat(rateInput.value);
    const tenureMonths = parseInt(tenureInput.value, 10);
    const currency = currencySelect ? currencySelect.value : 'INR';

    // Validation
    if (isNaN(principal) || principal <= 0) {
      if (window.CalcMaster.App) window.CalcMaster.App.showToast('Please enter a valid principal loan amount', 'error');
      return;
    }
    if (isNaN(annualRate) || annualRate < 0 || annualRate > 100) {
      if (window.CalcMaster.App) window.CalcMaster.App.showToast('Interest rate must be between 0% and 100%', 'error');
      return;
    }
    if (isNaN(tenureMonths) || tenureMonths < 1 || tenureMonths > 480) {
      if (window.CalcMaster.App) window.CalcMaster.App.showToast('Tenure must be between 1 and 480 months', 'error');
      return;
    }

    try {
      if (window.CalcMaster.App) window.CalcMaster.App.showLoading(true);

      const data = await window.CalcMaster.API.calculateEmi(principal, annualRate, tenureMonths, currency);

      // Populate summary cards
      document.getElementById('emi-monthly-val').textContent = formatCurrency(data.emi, currency);
      document.getElementById('emi-principal-val').textContent = formatCurrency(data.principal, currency);
      document.getElementById('emi-interest-val').textContent = formatCurrency(data.totalInterest, currency);
      document.getElementById('emi-total-val').textContent = formatCurrency(data.totalPayment, currency);

      // Save to history
      await window.CalcMaster.API.saveHistoryItem({
        expression: `Loan: ${formatCurrency(principal, currency)} @ ${annualRate}% for ${tenureMonths}m`,
        result: `EMI: ${formatCurrency(data.emi, currency)}`,
        type: 'FINANCIAL',
        timestamp: new Date().toISOString()
      });

      // Update Amortization schedule
      amortizationSchedule = data.schedule || generateSchedule(principal, annualRate, tenureMonths, data.emi);
      currentPage = 1;
      renderAmortizationPage();

      // Render Charts
      renderEmiCharts(data.principal, data.totalInterest, amortizationSchedule, currency);
    } catch (err) {
      console.error('Error in EMI calculation:', err);
      if (window.CalcMaster.App) window.CalcMaster.App.showToast(err.message || 'Error calculating EMI', 'error');
    } finally {
      if (window.CalcMaster.App) window.CalcMaster.App.showLoading(false);
    }
  }

  function generateSchedule(P, rate, n, emi) {
    const r = (rate / 12) / 100;
    const schedule = [];
    let balance = P;

    for (let month = 1; month <= n; month++) {
      const interestPaid = balance * r;
      const principalPaid = emi - interestPaid;
      balance = Math.max(0, balance - principalPaid);
      schedule.push({
        month,
        payment: emi,
        principalPaid,
        interestPaid,
        balance
      });
    }
    return schedule;
  }

  function renderAmortizationPage() {
    const tableBody = document.getElementById('amortization-table-body');
    const pageIndicator = document.getElementById('amortization-page-info');
    const currencySelect = document.getElementById('emi-currency');
    const currency = currencySelect ? currencySelect.value : 'INR';

    if (!tableBody) return;

    const totalPages = Math.max(1, Math.ceil(amortizationSchedule.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    if (pageIndicator) {
      pageIndicator.textContent = `Page ${currentPage} of ${totalPages} (${amortizationSchedule.length} Months)`;
    }

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageItems = amortizationSchedule.slice(startIndex, startIndex + PAGE_SIZE);

    let html = '';
    pageItems.forEach((row) => {
      html += `
        <tr>
          <td><span class="badge badge-secondary">Month ${row.month}</span></td>
          <td class="font-mono">${formatCurrency(row.payment, currency)}</td>
          <td class="font-mono text-emerald">${formatCurrency(row.principalPaid, currency)}</td>
          <td class="font-mono text-rose">${formatCurrency(row.interestPaid, currency)}</td>
          <td class="font-mono font-semibold">${formatCurrency(row.balance, currency)}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  }

  function renderEmiCharts(principal, totalInterest, schedule, currency) {
    lastEmiChart = { principal, totalInterest, schedule, currency };
    const colors = palette();
    // 1. Donut Pie Chart
    const pieCanvas = document.getElementById('emi-pie-chart');
    if (pieCanvas && typeof Chart !== 'undefined') {
      if (emiPieChart) emiPieChart.destroy();

      emiPieChart = new Chart(pieCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Principal Loan', 'Total Interest'],
          datasets: [{
            data: [principal, totalInterest],
            backgroundColor: [colors.accent, colors.rose],
            borderColor: [colors.accent, colors.rose],
            borderWidth: 2,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: colors.muted,
                font: { family: 'Inter', size: 12, weight: '500' },
                padding: 16
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const val = context.raw || 0;
                  const total = principal + totalInterest;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${context.label}: ${formatCurrency(val, currency)} (${pct}%)`;
                }
              }
            }
          },
          cutout: '70%'
        }
      });
    }

    // 2. Line Chart of Principal Balance over Time
    const lineCanvas = document.getElementById('emi-line-chart');
    if (lineCanvas && typeof Chart !== 'undefined' && schedule.length) {
      if (emiLineChart) emiLineChart.destroy();

      // Sample every N months if schedule is long
      const step = schedule.length > 36 ? Math.ceil(schedule.length / 24) : 1;
      const sampled = schedule.filter((_, idx) => idx % step === 0 || idx === schedule.length - 1);

      emiLineChart = new Chart(lineCanvas, {
        type: 'line',
        data: {
          labels: sampled.map(s => `M${s.month}`),
          datasets: [{
            label: 'Remaining Principal Balance',
            data: sampled.map(s => s.balance),
            borderColor: colors.accent,
            backgroundColor: colors.accent + '1a',
            fill: true,
            tension: 0.3,
            borderWidth: 2.5,
            pointRadius: 2,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Balance: ${formatCurrency(ctx.raw, currency)}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: colors.grid },
              ticks: { color: colors.muted }
            },
            y: {
              grid: { color: colors.grid },
              ticks: {
                color: colors.muted,
                callback: (val) => `${getCurrencySymbol(currency)} ${Number(val).toLocaleString()}`
              }
            }
          }
        }
      });
    }
  }

  // ==========================================
  // 2. Compound Interest Calculator
  // ==========================================
  function setupCompoundForm() {
    const form = document.getElementById('ci-form');
    const resetBtn = document.getElementById('ci-reset-btn');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateCompound();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        document.getElementById('ci-principal').value = '500000';
        document.getElementById('ci-rate').value = '10';
        document.getElementById('ci-years').value = '5';
        document.getElementById('ci-frequency').value = '12';
        calculateCompound();
      });
    }

    const copyBtn = document.getElementById('ci-copy-result-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const val = document.getElementById('ci-future-val').textContent;
        navigator.clipboard.writeText(val).then(() => {
          if (window.CalcMaster.App) window.CalcMaster.App.showToast(`Copied ${val}`, 'success');
        });
      });
    }
  }

  async function calculateCompound() {
    const pInput = document.getElementById('ci-principal');
    const rInput = document.getElementById('ci-rate');
    const yInput = document.getElementById('ci-years');
    const fInput = document.getElementById('ci-frequency');
    const cInput = document.getElementById('ci-currency');

    if (!pInput || !rInput || !yInput) return;

    const principal = parseFloat(pInput.value);
    const annualRate = parseFloat(rInput.value);
    const years = parseFloat(yInput.value);
    const frequency = parseInt(fInput ? fInput.value : 12, 10);
    const currency = cInput ? cInput.value : 'INR';

    if (isNaN(principal) || principal <= 0 || isNaN(annualRate) || isNaN(years) || years <= 0) {
      if (window.CalcMaster.App) window.CalcMaster.App.showToast('Please check your compound interest inputs', 'error');
      return;
    }

    try {
      if (window.CalcMaster.App) window.CalcMaster.App.showLoading(true);

      const data = await window.CalcMaster.API.calculateCompoundInterest(principal, annualRate, years, frequency, currency);

      document.getElementById('ci-future-val').textContent = formatCurrency(data.futureValue, currency);
      document.getElementById('ci-principal-val').textContent = formatCurrency(data.principal, currency);
      document.getElementById('ci-interest-val').textContent = formatCurrency(data.totalInterest, currency);

      await window.CalcMaster.API.saveHistoryItem({
        expression: `Compound: ${formatCurrency(principal, currency)} @ ${annualRate}% for ${years}y`,
        result: `Total: ${formatCurrency(data.futureValue, currency)}`,
        type: 'FINANCIAL',
        timestamp: new Date().toISOString()
      });

      renderCompoundChart(data.principal, data.totalInterest, currency);
    } catch (err) {
      if (window.CalcMaster.App) window.CalcMaster.App.showToast(err.message, 'error');
    } finally {
      if (window.CalcMaster.App) window.CalcMaster.App.showLoading(false);
    }
  }

  function renderCompoundChart(principal, totalInterest, currency) {
    lastCompoundChart = { principal, totalInterest, currency };
    const colors = palette();
    const canvas = document.getElementById('ci-pie-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (compoundChart) compoundChart.destroy();

    compoundChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Initial Principal', 'Compound Interest'],
        datasets: [{
          data: [principal, totalInterest],
          backgroundColor: [colors.emerald, colors.indigo],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: colors.muted }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw, currency)}`
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  // ==========================================
  // 3. Simple Interest Calculator
  // ==========================================
  function setupSimpleForm() {
    const form = document.getElementById('si-form');
    const resetBtn = document.getElementById('si-reset-btn');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateSimple();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        document.getElementById('si-principal').value = '200000';
        document.getElementById('si-rate').value = '7';
        document.getElementById('si-years').value = '3';
        calculateSimple();
      });
    }

    const copyBtn = document.getElementById('si-copy-result-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const val = document.getElementById('si-total-val').textContent;
        navigator.clipboard.writeText(val).then(() => {
          if (window.CalcMaster.App) window.CalcMaster.App.showToast(`Copied ${val}`, 'success');
        });
      });
    }
  }

  async function calculateSimple() {
    const pInput = document.getElementById('si-principal');
    const rInput = document.getElementById('si-rate');
    const yInput = document.getElementById('si-years');
    const cInput = document.getElementById('si-currency');

    if (!pInput || !rInput || !yInput) return;

    const principal = parseFloat(pInput.value);
    const annualRate = parseFloat(rInput.value);
    const years = parseFloat(yInput.value);
    const currency = cInput ? cInput.value : 'INR';

    if (isNaN(principal) || principal <= 0 || isNaN(annualRate) || isNaN(years) || years <= 0) {
      if (window.CalcMaster.App) window.CalcMaster.App.showToast('Please check your simple interest inputs', 'error');
      return;
    }

    try {
      if (window.CalcMaster.App) window.CalcMaster.App.showLoading(true);

      const data = await window.CalcMaster.API.calculateSimpleInterest(principal, annualRate, years, currency);

      document.getElementById('si-total-val').textContent = formatCurrency(data.totalAmount, currency);
      document.getElementById('si-interest-val').textContent = formatCurrency(data.interest, currency);
      document.getElementById('si-principal-val').textContent = formatCurrency(data.principal, currency);

      await window.CalcMaster.API.saveHistoryItem({
        expression: `Simple: ${formatCurrency(principal, currency)} @ ${annualRate}% for ${years}y`,
        result: `Total: ${formatCurrency(data.totalAmount, currency)}`,
        type: 'FINANCIAL',
        timestamp: new Date().toISOString()
      });

      renderSimpleChart(data.principal, data.interest, currency);
    } catch (err) {
      if (window.CalcMaster.App) window.CalcMaster.App.showToast(err.message, 'error');
    } finally {
      if (window.CalcMaster.App) window.CalcMaster.App.showLoading(false);
    }
  }

  function renderSimpleChart(principal, interest, currency) {
    lastSimpleChart = { principal, interest, currency };
    const colors = palette();
    const canvas = document.getElementById('si-pie-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (simpleChart) simpleChart.destroy();

    simpleChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Principal', 'Simple Interest'],
        datasets: [{
          data: [principal, interest],
          backgroundColor: [colors.cyan, colors.amber],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: colors.muted }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw, currency)}`
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  return {
    init,
    calculateEmi,
    calculateCompound,
    calculateSimple
  };
})();
