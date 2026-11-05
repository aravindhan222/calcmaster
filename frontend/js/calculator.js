/**
 * CalcMaster Standard Calculator Module
 * Complete arithmetic engine with real-time preview, memory integration, keyboard support,
 * error handling, and animation effects
 */

window.CalcMaster = window.CalcMaster || {};

window.CalcMaster.Calculator = (() => {
  let expression = '';
  let result = '0';
  let isEvaluated = false;
  let isLoading = false;
  let recentHistory = [];

  // DOM Elements cache
  let exprDisplay;
  let resultDisplay;
  let previewDisplay;
  let copyBtn;
  let recentList;

  function init() {
    exprDisplay = document.getElementById('std-expression');
    resultDisplay = document.getElementById('std-result');
    previewDisplay = document.getElementById('std-preview');
    copyBtn = document.getElementById('std-copy-btn');
    recentList = document.getElementById('std-recent-list');

    setupKeypad();
    setupMemoryBar();
    loadRecentHistory();
    updateDisplay();

    if (copyBtn) {
      copyBtn.addEventListener('click', copyResult);
    }
  }

  function setupKeypad() {
    const keypad = document.getElementById('std-keypad');
    if (!keypad) return;

    keypad.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;

      const action = button.dataset.action;
      const value = button.dataset.value;

      button.classList.add('btn-pressed');
      setTimeout(() => button.classList.remove('btn-pressed'), 120);

      handleInput(action, value);
    });
  }

  function setupMemoryBar() {
    const memoryBar = document.getElementById('std-memory-bar');
    if (!memoryBar) return;

    memoryBar.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button || !window.CalcMaster.Memory) return;

      const action = button.dataset.memAction;
      const currentVal = getCurrentDisplayNumber();

      switch (action) {
        case 'MC':
          window.CalcMaster.Memory.mc();
          break;
        case 'MR':
          const recalled = window.CalcMaster.Memory.mr();
          insertValue(recalled.toString());
          break;
        case 'MS':
          window.CalcMaster.Memory.ms(currentVal);
          break;
        case 'M+':
          window.CalcMaster.Memory.mPlus(currentVal);
          break;
        case 'M-':
          window.CalcMaster.Memory.mMinus(currentVal);
          break;
      }
    });
  }

  function getCurrentDisplayNumber() {
    if (result && result !== 'Error' && result !== '0') {
      return parseFloat(result.replace(/,/g, '')) || 0;
    }
    const match = expression.match(/[-+]?[0-9]*\.?[0-9]+$/);
    return match ? parseFloat(match[0]) : 0;
  }

  function handleInput(action, value) {
    if (isLoading) return;

    switch (action) {
      case 'digit':
        appendDigit(value);
        break;
      case 'operator':
        appendOperator(value);
        break;
      case 'decimal':
        appendDecimal();
        break;
      case 'clear':
        allClear();
        break;
      case 'delete':
        deleteLast();
        break;
      case 'negate':
        toggleSign();
        break;
      case 'percent':
        applyPercentage();
        break;
      case 'parenthesis':
        appendParenthesis(value);
        break;
      case 'calculate':
        calculateResult();
        break;
      case 'copy':
        copyResult();
        break;
      default:
        if (value) appendDigit(value);
        break;
    }

    updateDisplay();
    updatePreview();
  }

  function appendDigit(digit) {
    if (isEvaluated) {
      // Start fresh expression with new digit if evaluated
      expression = digit;
      result = '0';
      isEvaluated = false;
    } else {
      if (expression === '0') {
        expression = digit;
      } else {
        expression += digit;
      }
    }
  }

  function appendOperator(op) {
    if (isEvaluated) {
      // Continue chaining with previous result
      expression = (result !== 'Error' ? result.replace(/,/g, '') : '0') + ` ${op} `;
      isEvaluated = false;
    } else {
      if (!expression || expression === '0') {
        if (op === '-') {
          expression = '-';
          return;
        }
        expression = '0' + ` ${op} `;
        return;
      }

      // If ends with an operator, replace it
      const trailingOpRegex = /\s[+\-×÷%^]\s$/;
      if (trailingOpRegex.test(expression)) {
        expression = expression.replace(trailingOpRegex, ` ${op} `);
      } else {
        expression += ` ${op} `;
      }
    }
  }

  function appendDecimal() {
    if (isEvaluated) {
      expression = '0.';
      isEvaluated = false;
      return;
    }

    // Get current number chunk
    const tokens = expression.split(/\s[+\-×÷%^]\s|\(|\)/);
    const lastToken = tokens[tokens.length - 1];

    if (!lastToken.includes('.')) {
      if (!lastToken || lastToken === '') {
        expression += '0.';
      } else {
        expression += '.';
      }
    }
  }

  function appendParenthesis(char) {
    if (isEvaluated) {
      expression = char === '(' ? '(' : '';
      isEvaluated = false;
      return;
    }

    if (char) {
      expression += char;
    } else {
      // Smart parenthesis toggle
      const openCount = (expression.match(/\(/g) || []).length;
      const closeCount = (expression.match(/\)/g) || []).length;
      if (openCount > closeCount && !expression.endsWith('(') && !expression.endsWith(' ')) {
        expression += ')';
      } else {
        expression += '(';
      }
    }
  }

  function allClear() {
    expression = '';
    result = '0';
    isEvaluated = false;
    if (resultDisplay) resultDisplay.classList.remove('has-error');
  }

  function deleteLast() {
    if (isEvaluated) {
      expression = '';
      isEvaluated = false;
      return;
    }

    if (!expression) return;

    // If ends with operator spaced out, remove the whole operator space
    if (/\s[+\-×÷%^]\s$/.test(expression)) {
      expression = expression.slice(0, -3);
    } else {
      expression = expression.slice(0, -1);
    }
  }

  function toggleSign() {
    if (isEvaluated && result !== 'Error') {
      const val = -parseFloat(result.replace(/,/g, ''));
      expression = val.toString();
      result = val.toString();
      return;
    }

    if (!expression) {
      expression = '-';
      return;
    }

    // Find the last number token
    const match = expression.match(/([+\-×÷(]\s*|^)(-?[0-9.]+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const toggled = numStr.startsWith('-') ? numStr.substring(1) : '-' + numStr;
      expression = expression.substring(0, match.index) + prefix + toggled;
    } else {
      expression = `-(${expression})`;
    }
  }

  function applyPercentage() {
    if (isEvaluated && result !== 'Error') {
      const val = parseFloat(result.replace(/,/g, '')) / 100;
      expression = val.toString();
      result = val.toString();
      return;
    }

    const match = expression.match(/([0-9.]+)$/);
    if (match) {
      const val = parseFloat(match[1]) / 100;
      expression = expression.slice(0, match.index) + val.toString();
    }
  }

  function insertValue(val) {
    if (isEvaluated) {
      expression = val;
      isEvaluated = false;
    } else {
      expression += val;
    }
    updateDisplay();
    updatePreview();
  }

  /**
   * Real-time preview computation
   */
  function updatePreview() {
    if (!previewDisplay) return;
    if (!expression || isEvaluated || isLoading) {
      previewDisplay.textContent = '';
      return;
    }

    // Attempt lightweight preview
    try {
      const clean = expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/');
      // Only evaluate if ends with a number or parenthesis
      if (/[0-9.)]$/.test(clean.trim())) {
        // eslint-disable-next-line no-new-func
        const previewVal = Function(`"use strict"; return (${clean});`)();
        if (isFinite(previewVal) && !isNaN(previewVal)) {
          const formatted = window.CalcMaster.Settings ? window.CalcMaster.Settings.formatOutput(previewVal) : previewVal;
          previewDisplay.textContent = `= ${formatted}`;
          return;
        }
      }
      previewDisplay.textContent = '';
    } catch (e) {
      previewDisplay.textContent = '';
    }
  }

  /**
   * Main calculation invocation via /api/calculate
   */
  async function calculateResult() {
    if (!expression || expression.trim() === '') return;

    isLoading = true;
    updateDisplay();
    if (resultDisplay) {
      resultDisplay.classList.add('evaluating');
    }

    try {
      const data = await window.CalcMaster.API.calculate(expression, false);
      const rawRes = data.result;

      // Animate result change
      if (resultDisplay) {
        resultDisplay.classList.remove('has-error', 'evaluating');
        resultDisplay.classList.add('result-pop');
        setTimeout(() => resultDisplay.classList.remove('result-pop'), 300);
      }

      result = window.CalcMaster.Settings ? window.CalcMaster.Settings.formatOutput(rawRes) : String(rawRes);
      isEvaluated = true;

      // Save to recent list & full history
      addRecentHistory(expression, result);
      await window.CalcMaster.API.saveHistoryItem({
        expression,
        result,
        type: 'STANDARD',
        timestamp: new Date().toISOString()
      });

      // Update history UI if module initialized
      if (window.CalcMaster.History && typeof window.CalcMaster.History.render === 'function') {
        window.CalcMaster.History.render();
      }
    } catch (err) {
      console.error('Calculation error:', err);
      if (resultDisplay) resultDisplay.classList.add('has-error');
      result = 'Error';
      if (window.CalcMaster.App) {
        window.CalcMaster.App.showToast(err.message || 'Invalid syntax', 'error');
      }
    } finally {
      isLoading = false;
      updateDisplay();
      if (previewDisplay) previewDisplay.textContent = '';
    }
  }

  function updateDisplay() {
    if (exprDisplay) {
      exprDisplay.textContent = expression || '';
      exprDisplay.scrollLeft = exprDisplay.scrollWidth;
    }
    if (resultDisplay) {
      resultDisplay.textContent = isLoading ? '...' : (result || '0');
    }
  }

  function copyResult() {
    const textToCopy = (result && result !== 'Error') ? result.replace(/,/g, '') : expression;
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
      if (window.CalcMaster.App) {
        window.CalcMaster.App.showToast(`Copied "${textToCopy}" to clipboard`, 'success');
      }
      if (copyBtn) {
        copyBtn.classList.add('btn-success');
        setTimeout(() => copyBtn.classList.remove('btn-success'), 1000);
      }
    }).catch(() => {
      // Fallback copy
      const input = document.createElement('input');
      input.value = textToCopy;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      if (window.CalcMaster.App) {
        window.CalcMaster.App.showToast(`Copied "${textToCopy}" to clipboard`, 'success');
      }
    });
  }

  function addRecentHistory(expr, res) {
    recentHistory.unshift({ expr, res });
    if (recentHistory.length > 5) recentHistory.pop();
    saveRecentHistory();
    renderRecentList();
  }

  function saveRecentHistory() {
    try {
      localStorage.setItem('calcmaster_std_recent', JSON.stringify(recentHistory));
    } catch (e) {
      console.warn('Could not save recent history', e);
    }
  }

  function loadRecentHistory() {
    try {
      const saved = localStorage.getItem('calcmaster_std_recent');
      if (saved) {
        recentHistory = JSON.parse(saved);
        renderRecentList();
      }
    } catch (e) {
      recentHistory = [];
    }
  }

  function renderRecentList() {
    if (!recentList) return;
    if (!recentHistory.length) {
      recentList.innerHTML = '<span class="text-muted text-xs">No recent calculations</span>';
      return;
    }

    recentList.innerHTML = recentHistory.map((item, idx) => `
      <button class="recent-chip" data-index="${idx}" title="Click to reuse">
        <span class="recent-expr">${item.expr}</span> = <span class="recent-res">${item.res}</span>
      </button>
    `).join('');

    recentList.querySelectorAll('.recent-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const idx = parseInt(chip.dataset.index, 10);
        const item = recentHistory[idx];
        if (item) {
          expression = item.expr;
          result = item.res;
          isEvaluated = true;
          updateDisplay();
        }
      });
    });
  }

  /**
   * Keyboard handler routed from app.js
   */
  function handleKeyboard(e) {
    if (e.key >= '0' && e.key <= '9') {
      handleInput('digit', e.key);
    } else if (e.key === '.') {
      handleInput('decimal');
    } else if (e.key === '+') {
      handleInput('operator', '+');
    } else if (e.key === '-') {
      handleInput('operator', '-');
    } else if (e.key === '*' || e.key === 'x') {
      handleInput('operator', '×');
    } else if (e.key === '/') {
      e.preventDefault();
      handleInput('operator', '÷');
    } else if (e.key === '%') {
      handleInput('percent');
    } else if (e.key === '(' || e.key === ')') {
      handleInput('parenthesis', e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      handleInput('calculate');
    } else if (e.key === 'Backspace') {
      handleInput('delete');
    } else if (e.key === 'Escape') {
      handleInput('clear');
    }
  }

  return {
    init,
    handleInput,
    handleKeyboard,
    insertValue,
    copyResult,
    getExpression: () => expression,
    setExpression: (val) => {
      expression = val;
      isEvaluated = false;
      updateDisplay();
    }
  };
})();
