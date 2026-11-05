/**
 * CalcMaster API Client
 * Robust Fetch API wrapper for all CalcMaster backend endpoints
 * Connects to http://localhost:8080 with graceful fallback and error handling
 */

window.CalcMaster = window.CalcMaster || {};

window.CalcMaster.API = (() => {
  // Configurable base URL
  const API_BASE = 'http://localhost:8080';
  const REQUEST_TIMEOUT_MS = 6000;

  /**
   * Helper function to perform fetch with timeout and JSON error parsing
   */
  async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    // Merge default headers
    const precision = window.CalcMaster.Settings ? window.CalcMaster.Settings.getPrecision() : 10;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Precision': String(precision),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        throw new Error('Server request timed out. Please check if backend is running.');
      }
      throw err;
    }
  }

  /**
   * Safe parser for JSON responses
   */
  async function parseJsonResponse(response) {
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { raw: text };
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || `HTTP error ${response.status}: ${response.statusText}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // ==========================================
  // Fallback Mathematical Evaluators (Offline)
  // ==========================================
  function safeClientEval(expr, degrees = false) {
    // Sanitized fallback evaluator if backend is offline
    try {
      let sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E');

      // Functions mapping
      if (degrees) {
        sanitized = sanitized
          .replace(/\bsin\(([^)]+)\)/g, 'Math.sin(($1) * Math.PI / 180)')
          .replace(/\bcos\(([^)]+)\)/g, 'Math.cos(($1) * Math.PI / 180)')
          .replace(/\btan\(([^)]+)\)/g, 'Math.tan(($1) * Math.PI / 180)')
          .replace(/\basin\(([^)]+)\)/g, '(Math.asin($1) * 180 / Math.PI)')
          .replace(/\bacos\(([^)]+)\)/g, '(Math.acos($1) * 180 / Math.PI)')
          .replace(/\batan\(([^)]+)\)/g, '(Math.atan($1) * 180 / Math.PI)');
      } else {
        sanitized = sanitized
          .replace(/\bsin\(/g, 'Math.sin(')
          .replace(/\bcos\(/g, 'Math.cos(')
          .replace(/\btan\(/g, 'Math.tan(')
          .replace(/\basin\(/g, 'Math.asin(')
          .replace(/\bacos\(/g, 'Math.acos(')
          .replace(/\batan\(/g, 'Math.atan(');
      }

      sanitized = sanitized
        .replace(/\bln\(/g, 'Math.log(')
        .replace(/\blog\(/g, 'Math.log10(')
        .replace(/\bsqrt\(/g, 'Math.sqrt(')
        .replace(/√\(([^)]+)\)/g, 'Math.sqrt($1)')
        .replace(/√([0-9.]+)/g, 'Math.sqrt($1)')
        .replace(/\^/g, '**');

      // Factorial helper
      sanitized = sanitized.replace(/(\d+)!/g, (match, n) => {
        let num = parseInt(n, 10);
        let res = 1;
        for (let i = 2; i <= num; i++) res *= i;
        return String(res);
      });

      // Allowed characters check
      if (!/^[0-9+\-*/().\s,MathPIE!*]+$/.test(sanitized)) {
        throw new Error('Invalid mathematical expression');
      }

      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized});`)();
      if (!isFinite(result) || isNaN(result)) {
        throw new Error('Mathematical error (division by zero or overflow)');
      }
      return result;
    } catch (err) {
      throw new Error(err.message || 'Calculation error');
    }
  }

  // ==========================================
  // Public API Methods
  // ==========================================

  /**
   * Standard arithmetic calculation
   * POST /api/calculate
   * @param {string} expression
   * @param {boolean} degreesMode
   */
  async function calculate(expression, degreesMode = false) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/calculate`, {
        method: 'POST',
        body: JSON.stringify({ expression, degreesMode })
      });
      return await parseJsonResponse(response);
    } catch (err) {
      console.warn('API /api/calculate unreachable, using client engine:', err.message);
      // Fallback calculation
      const result = safeClientEval(expression, degreesMode);
      return {
        expression,
        result,
        degreesMode,
        isFallback: true
      };
    }
  }

  /**
   * Scientific calculation
   * POST /api/scientific
   * @param {string} expression
   * @param {boolean} degreesMode
   */
  async function calculateScientific(expression, degreesMode = false) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/scientific`, {
        method: 'POST',
        body: JSON.stringify({ expression, degreesMode })
      });
      return await parseJsonResponse(response);
    } catch (err) {
      console.warn('API /api/scientific unreachable, using client engine:', err.message);
      const result = safeClientEval(expression, degreesMode);
      return {
        expression,
        result,
        degreesMode,
        isFallback: true
      };
    }
  }

  /**
   * Calculate EMI & Amortization
   * POST /api/financial/emi
   * @param {number} principal
   * @param {number} annualRate
   * @param {number} tenureMonths
   * @param {string} currency
   */
  async function calculateEmi(principal, annualRate, tenureMonths, currency = 'INR') {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/financial/emi`, {
        method: 'POST',
        body: JSON.stringify({ principal, annualRate, tenureMonths, currency })
      });
      return await parseJsonResponse(response);
    } catch (err) {
      console.warn('API /api/financial/emi unreachable, using client fallback');
      // Standard Equated Monthly Installment calculation
      // E = P * r * (1 + r)^n / ((1 + r)^n - 1)
      const P = Number(principal);
      const r = (Number(annualRate) / 12) / 100;
      const n = Number(tenureMonths);

      let emi = 0;
      if (r === 0) {
        emi = P / n;
      } else {
        const factor = Math.pow(1 + r, n);
        emi = (P * r * factor) / (factor - 1);
      }

      const totalPayment = emi * n;
      const totalInterest = totalPayment - P;

      // Generate amortization breakdown
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

      return {
        principal: P,
        annualRate,
        tenureMonths: n,
        currency,
        emi,
        totalInterest,
        totalPayment,
        schedule,
        isFallback: true
      };
    }
  }

  /**
   * Calculate Compound Interest
   * POST /api/financial/compound-interest
   * @param {number} principal
   * @param {number} annualRate
   * @param {number} years
   * @param {number} compoundsPerYear
   * @param {string} currency
   */
  async function calculateCompoundInterest(principal, annualRate, years, compoundsPerYear = 12, currency = 'INR') {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/financial/compound-interest`, {
        method: 'POST',
        body: JSON.stringify({ principal, annualRate, years, compoundsPerYear, currency })
      });
      return await parseJsonResponse(response);
    } catch (err) {
      console.warn('API /api/financial/compound-interest unreachable, using client fallback');
      const P = Number(principal);
      const r = Number(annualRate) / 100;
      const t = Number(years);
      const n = Number(compoundsPerYear) || 1;

      // A = P(1 + r/n)^(n*t)
      const futureValue = P * Math.pow(1 + (r / n), n * t);
      const totalInterest = futureValue - P;

      // Yearly progression
      const yearly = [];
      for (let y = 1; y <= Math.ceil(t); y++) {
        const yrVal = P * Math.pow(1 + (r / n), n * y);
        yearly.push({
          year: y,
          balance: yrVal,
          interestEarned: yrVal - P
        });
      }

      return {
        principal: P,
        annualRate,
        years: t,
        compoundsPerYear: n,
        currency,
        futureValue,
        totalInterest,
        yearly,
        isFallback: true
      };
    }
  }

  /**
   * Calculate Simple Interest
   * POST /api/financial/simple-interest
   * @param {number} principal
   * @param {number} annualRate
   * @param {number} years
   * @param {string} currency
   */
  async function calculateSimpleInterest(principal, annualRate, years, currency = 'INR') {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/financial/simple-interest`, {
        method: 'POST',
        body: JSON.stringify({ principal, annualRate, years, currency })
      });
      return await parseJsonResponse(response);
    } catch (err) {
      console.warn('API /api/financial/simple-interest unreachable, using client fallback');
      const P = Number(principal);
      const R = Number(annualRate);
      const T = Number(years);
      const interest = (P * R * T) / 100;
      const totalAmount = P + interest;

      return {
        principal: P,
        annualRate: R,
        years: T,
        currency,
        interest,
        totalAmount,
        isFallback: true
      };
    }
  }

  /**
   * Calculate Descriptive Statistics
   * POST /api/statistics
   * @param {number[]} dataArray
   */
  async function calculateStatistics(dataArray) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/statistics`, {
        method: 'POST',
        body: JSON.stringify({ data: dataArray })
      });
      return await parseJsonResponse(response);
    } catch (err) {
      console.warn('API /api/statistics unreachable, using client fallback');
      if (!dataArray || dataArray.length === 0) {
        throw new Error('Data array cannot be empty');
      }

      const arr = [...dataArray].sort((a, b) => a - b);
      const count = arr.length;
      const sum = arr.reduce((acc, val) => acc + val, 0);
      const mean = sum / count;

      // Median
      let median;
      const mid = Math.floor(count / 2);
      if (count % 2 === 0) {
        median = (arr[mid - 1] + arr[mid]) / 2;
      } else {
        median = arr[mid];
      }

      // Mode
      const counts = {};
      let maxFreq = 0;
      arr.forEach((v) => {
        counts[v] = (counts[v] || 0) + 1;
        if (counts[v] > maxFreq) maxFreq = counts[v];
      });

      let mode = [];
      if (maxFreq > 1) {
        Object.keys(counts).forEach((k) => {
          if (counts[k] === maxFreq) mode.push(Number(k));
        });
      } else {
        mode = ['No unique mode'];
      }

      const min = arr[0];
      const max = arr[count - 1];
      const range = max - min;

      // Variance and StdDev
      const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (count > 1 ? count - 1 : 1);
      const stdDev = Math.sqrt(variance);

      return {
        count,
        sum,
        mean,
        median,
        mode,
        variance,
        stdDev,
        min,
        max,
        range,
        sortedData: arr,
        isFallback: true
      };
    }
  }

  /**
   * Unit Conversion
   * POST /api/convert
   * @param {number} value
   * @param {string} fromUnit
   * @param {string} toUnit
   * @param {string} category
   */
  async function convertUnit(value, fromUnit, toUnit, category) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/convert`, {
        method: 'POST',
        body: JSON.stringify({ value, fromUnit, toUnit, category })
      });
      return await parseJsonResponse(response);
    } catch (err) {
      console.warn('API /api/convert unreachable, using client fallback');
      const val = Number(value);
      if (isNaN(val)) throw new Error('Invalid numeric value');

      // Conversion factors
      const rates = {
        LENGTH: {
          mm: 0.001,
          cm: 0.01,
          m: 1,
          km: 1000,
          inch: 0.0254,
          ft: 0.3048,
          yd: 0.9144,
          mile: 1609.344
        },
        MASS: {
          mg: 0.000001,
          g: 0.001,
          kg: 1,
          tonne: 1000,
          oz: 0.0283495,
          lb: 0.453592
        },
        DATA: {
          B: 1,
          KB: 1024,
          MB: 1024 ** 2,
          GB: 1024 ** 3,
          TB: 1024 ** 4
        }
      };

      let result;
      let formula = '';

      if (category === 'TEMPERATURE') {
        // Temperature logic
        let kelvin;
        if (fromUnit === 'Celsius') kelvin = val + 273.15;
        else if (fromUnit === 'Fahrenheit') kelvin = (val - 32) * (5 / 9) + 273.15;
        else kelvin = val;

        if (toUnit === 'Celsius') {
          result = kelvin - 273.15;
          formula = fromUnit === 'Fahrenheit' ? '°C = (°F - 32) × 5/9' : '°C = K - 273.15';
        } else if (toUnit === 'Fahrenheit') {
          result = (kelvin - 273.15) * (9 / 5) + 32;
          formula = fromUnit === 'Celsius' ? '°F = (°C × 9/5) + 32' : '°F = (K - 273.15) × 9/5 + 32';
        } else {
          result = kelvin;
          formula = fromUnit === 'Celsius' ? 'K = °C + 273.15' : 'K = (°F - 32) × 5/9 + 273.15';
        }
      } else if (rates[category]) {
        const catRates = rates[category];
        const fromFactor = catRates[fromUnit];
        const toFactor = catRates[toUnit];
        if (!fromFactor || !toFactor) throw new Error('Unsupported conversion units');
        const inBase = val * fromFactor;
        result = inBase / toFactor;
        formula = `1 ${fromUnit} = ${(fromFactor / toFactor).toPrecision(6)} ${toUnit}`;
      } else {
        throw new Error('Unsupported category');
      }

      return {
        value: val,
        fromUnit,
        toUnit,
        category,
        result,
        formula,
        isFallback: true
      };
    }
  }

  /**
   * Fetch calculation history
   * GET /api/history?type=
   * @param {string} type
   */
  async function getHistory(type = '') {
    try {
      const url = type && type !== 'ALL' ? `${API_BASE}/api/history?type=${encodeURIComponent(type)}` : `${API_BASE}/api/history`;
      const response = await fetchWithTimeout(url, { method: 'GET' });
      return await parseJsonResponse(response);
    } catch (err) {
      console.warn('API /api/history unreachable, falling back to localStorage history:', err.message);
      const local = JSON.parse(localStorage.getItem('calcmaster_history') || '[]');
      if (type && type !== 'ALL') {
        return local.filter(item => (item.type || '').toUpperCase() === type.toUpperCase());
      }
      return local;
    }
  }

  /**
   * Delete single history item
   * DELETE /api/history/{id}
   * @param {string|number} id
   */
  async function deleteHistoryItem(id) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/history/${id}`, {
        method: 'DELETE'
      });
      return await parseJsonResponse(response);
    } catch (err) {
      console.warn('API delete history fallback to local store');
      let local = JSON.parse(localStorage.getItem('calcmaster_history') || '[]');
      local = local.filter(item => String(item.id) !== String(id));
      localStorage.setItem('calcmaster_history', JSON.stringify(local));
      return { success: true };
    }
  }

  /**
   * Clear all history
   * DELETE /api/history
   */
  async function clearHistory() {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/history`, {
        method: 'DELETE'
      });
      // Also clear local fallback
      localStorage.removeItem('calcmaster_history');
      return await parseJsonResponse(response);
    } catch (err) {
      console.warn('API clear history fallback to local store');
      localStorage.removeItem('calcmaster_history');
      return { success: true };
    }
  }

  /**
   * Save record to history (helper to sync local and server)
   */
  async function saveHistoryItem(item) {
    const record = {
      id: item.id || Date.now().toString(),
      expression: item.expression || '',
      result: String(item.result !== undefined ? item.result : ''),
      type: (item.type || 'STANDARD').toUpperCase(),
      timestamp: item.timestamp || new Date().toISOString()
    };

    // Always keep in local storage as well for instant responsiveness
    try {
      const local = JSON.parse(localStorage.getItem('calcmaster_history') || '[]');
      local.unshift(record);
      if (local.length > 100) local.pop();
      localStorage.setItem('calcmaster_history', JSON.stringify(local));
    } catch (e) {
      console.error('Failed saving local history backup', e);
    }

    return record;
  }

  /**
   * Download CSV export
   * GET /api/export/csv
   */
  function downloadCSV() {
    // Attempt direct API download, fallback to generating client-side CSV
    const downloadUrl = `${API_BASE}/api/export/csv`;
    fetch(downloadUrl)
      .then(res => {
        if (!res.ok) throw new Error('API CSV export failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calcmaster_history_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        console.warn('Generating client-side CSV download fallback');
        const local = JSON.parse(localStorage.getItem('calcmaster_history') || '[]');
        let csvContent = 'data:text/csv;charset=utf-8,ID,Type,Expression,Result,Timestamp\n';
        local.forEach(row => {
          const cleanExpr = `"${(row.expression || '').replace(/"/g, '""')}"`;
          const cleanRes = `"${(row.result || '').replace(/"/g, '""')}"`;
          csvContent += `${row.id},${row.type || 'STANDARD'},${cleanExpr},${cleanRes},${row.timestamp}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `calcmaster_history_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
  }

  /**
   * Download PDF export
   * GET /api/export/pdf
   */
  function downloadPDF() {
    const downloadUrl = `${API_BASE}/api/export/pdf`;
    fetch(downloadUrl)
      .then(res => {
        if (!res.ok) throw new Error('API PDF export failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calcmaster_history_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        console.warn('PDF export API offline. Triggering print dialog for user export');
        window.print();
      });
  }

  return {
    API_BASE,
    calculate,
    calculateScientific,
    calculateEmi,
    calculateCompoundInterest,
    calculateSimpleInterest,
    calculateStatistics,
    convertUnit,
    getHistory,
    deleteHistoryItem,
    clearHistory,
    saveHistoryItem,
    downloadCSV,
    downloadPDF
  };
})();
