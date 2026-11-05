/**
 * CalcMaster Scientific Calculator Module
 * Full scientific math processor supporting trigonometry, logarithms, powers, factorials,
 * constants (π, e), angle mode switching (DEG/RAD), and memory integration
 */

window.CalcMaster = window.CalcMaster || {};

window.CalcMaster.Scientific = (() => {
  let expression = '';
  let result = '0';
  let isEvaluated = false;
  let isLoading = false;
  let angleMode = 'DEG'; // 'DEG' or 'RAD'

  // DOM Elements
  let exprDisplay;
  let resultDisplay;
  let previewDisplay;
  let angleBadge;
  let copyBtn;

  function init() {
    exprDisplay = document.getElementById('sci-expression');
    resultDisplay = document.getElementById('sci-result');
    previewDisplay = document.getElementById('sci-preview');
    angleBadge = document.getElementById('sci-angle-badge');
    copyBtn = document.getElementById('sci-copy-btn');

    // Sync angle mode from Settings if available
    if (window.CalcMaster.Settings) {
      angleMode = window.CalcMaster.Settings.getAngleUnit() || 'DEG';
    }

    setupKeypads();
    setupAngleToggle();
    setupMemoryBar();
    updateDisplay();
    updateAngleBadge();

    if (copyBtn) {
      copyBtn.addEventListener('click', copyResult);
    }
  }

  function setupAngleToggle() {
    const toggleBtn = document.getElementById('sci-btn-deg-rad');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        toggleAngleMode();
      });
    }

    if (angleBadge) {
      angleBadge.addEventListener('click', () => {
        toggleAngleMode();
      });
    }
  }

  function toggleAngleMode() {
    angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
    if (window.CalcMaster.Settings) {
      window.CalcMaster.Settings.setAngleUnit(angleMode);
    }
    updateAngleBadge();
    updatePreview();
  }

  function syncAngleUnit(unit) {
    angleMode = unit === 'RAD' ? 'RAD' : 'DEG';
    updateAngleBadge();
    updatePreview();
  }

  function updateAngleBadge() {
    if (angleBadge) {
      angleBadge.textContent = angleMode;
      angleBadge.className = `badge ${angleMode === 'DEG' ? 'badge-primary' : 'badge-warning'}`;
    }
    const toggleBtn = document.getElementById('sci-btn-deg-rad');
    if (toggleBtn) {
      toggleBtn.textContent = angleMode;
    }
  }

  function setupKeypads() {
    // Both scientific function grid and main keypad
    const sciKeypad = document.getElementById('sci-keypad');
    const funcKeypad = document.getElementById('sci-functions-keypad');

    const handleButtonClick = (e) => {
      const button = e.target.closest('button');
      if (!button) return;

      const action = button.dataset.action;
      const value = button.dataset.value;

      button.classList.add('btn-pressed');
      setTimeout(() => button.classList.remove('btn-pressed'), 120);

      handleInput(action, value);
    };

    if (sciKeypad) sciKeypad.addEventListener('click', handleButtonClick);
    if (funcKeypad) funcKeypad.addEventListener('click', handleButtonClick);
  }

  function setupMemoryBar() {
    const memoryBar = document.getElementById('sci-memory-bar');
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
      case 'function':
        insertFunction(value);
        break;
      case 'constant':
        insertConstant(value);
        break;
      case 'power':
        insertPower(value);
        break;
      case 'factorial':
        insertFactorial();
        break;
      case 'parenthesis':
        appendParenthesis(value);
        break;
      case 'toggle-angle':
        toggleAngleMode();
        break;
      case 'calculate':
        calculateResult();
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

    const tokens = expression.split(/[\s+\-×÷%^(),]/);
    const lastToken = tokens[tokens.length - 1];

    if (!lastToken.includes('.')) {
      if (!lastToken || lastToken === '') {
        expression += '0.';
      } else {
        expression += '.';
      }
    }
  }

  function insertFunction(fnName) {
    if (isEvaluated) {
      expression = `${fnName}(`;
      isEvaluated = false;
    } else {
      // If preceded by a number, multiply implicitly
      if (/[0-9πe)]$|^\d+$/.test(expression.trim())) {
        expression += ` × ${fnName}(`;
      } else {
        expression += `${fnName}(`;
      }
    }
  }

  function insertConstant(constName) {
    const sym = constName === 'pi' ? 'π' : 'e';
    if (isEvaluated) {
      expression = sym;
      isEvaluated = false;
    } else {
      if (/[0-9πe)]$|^\d+$/.test(expression.trim())) {
        expression += ` × ${sym}`;
      } else {
        expression += sym;
      }
    }
  }

  function insertPower(powerType) {
    if (isEvaluated) {
      expression = `(${result.replace(/,/g, '')})`;
      isEvaluated = false;
    }

    if (powerType === 'sq') {
      expression += '^2';
    } else if (powerType === 'cube') {
      expression += '^3';
    } else if (powerType === 'y') {
      expression += '^';
    } else if (powerType === 'inv') {
      expression += '^(-1)';
    } else if (powerType === 'ten') {
      if (/[0-9πe)]$|^\d+$/.test(expression.trim())) {
        expression += ' × 10^';
      } else {
        expression += '10^';
      }
    }
  }

  function insertFactorial() {
    if (isEvaluated) {
      expression = `(${result.replace(/,/g, '')})!`;
      isEvaluated = false;
    } else {
      expression += '!';
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

    // Check if ends with a function word like "sin(", "asin(", "sqrt("
    const funcMatch = expression.match(/([a-zA-Z0-9]+)\($/);
    if (funcMatch) {
      expression = expression.slice(0, -funcMatch[0].length);
      return;
    }

    // Check if ends with spaced operator
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

  function updatePreview() {
    if (!previewDisplay) return;
    if (!expression || isEvaluated || isLoading) {
      previewDisplay.textContent = '';
      return;
    }

    try {
      // Balance parentheses for preview
      let testExpr = expression;
      const openCount = (testExpr.match(/\(/g) || []).length;
      const closeCount = (testExpr.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        testExpr += ')'.repeat(openCount - closeCount);
      }

      // Quick fallback evaluation for preview
      const clean = testExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E')
        .replace(/\bsin\(/g, angleMode === 'DEG' ? 'Math.sin((Math.PI/180)*' : 'Math.sin(')
        .replace(/\bcos\(/g, angleMode === 'DEG' ? 'Math.cos((Math.PI/180)*' : 'Math.cos(')
        .replace(/\btan\(/g, angleMode === 'DEG' ? 'Math.tan((Math.PI/180)*' : 'Math.tan(')
        .replace(/\bln\(/g, 'Math.log(')
        .replace(/\blog\(/g, 'Math.log10(')
        .replace(/\bsqrt\(/g, 'Math.sqrt(')
        .replace(/\^/g, '**');

      // eslint-disable-next-line no-new-func
      const previewVal = Function(`"use strict"; return (${clean});`)();
      if (isFinite(previewVal) && !isNaN(previewVal)) {
        const formatted = window.CalcMaster.Settings ? window.CalcMaster.Settings.formatOutput(previewVal) : previewVal;
        previewDisplay.textContent = `= ${formatted}`;
        return;
      }
      previewDisplay.textContent = '';
    } catch (e) {
      previewDisplay.textContent = '';
    }
  }

  /**
   * Main calculation invocation via /api/scientific
   */
  async function calculateResult() {
    if (!expression || expression.trim() === '') return;

    isLoading = true;
    updateDisplay();
    if (resultDisplay) {
      resultDisplay.classList.add('evaluating');
    }

    // Auto-balance unclosed parentheses
    let balancedExpr = expression;
    const openCount = (balancedExpr.match(/\(/g) || []).length;
    const closeCount = (balancedExpr.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      balancedExpr += ')'.repeat(openCount - closeCount);
      expression = balancedExpr;
    }

    try {
      const data = await window.CalcMaster.API.calculateScientific(expression, angleMode === 'DEG');
      const rawRes = data.result;

      if (resultDisplay) {
        resultDisplay.classList.remove('has-error', 'evaluating');
        resultDisplay.classList.add('result-pop');
        setTimeout(() => resultDisplay.classList.remove('result-pop'), 300);
      }

      result = window.CalcMaster.Settings ? window.CalcMaster.Settings.formatOutput(rawRes) : String(rawRes);
      isEvaluated = true;

      await window.CalcMaster.API.saveHistoryItem({
        expression: `${expression} [${angleMode}]`,
        result,
        type: 'SCIENTIFIC',
        timestamp: new Date().toISOString()
      });

      if (window.CalcMaster.History && typeof window.CalcMaster.History.render === 'function') {
        window.CalcMaster.History.render();
      }
    } catch (err) {
      console.error('Scientific calculation error:', err);
      if (resultDisplay) resultDisplay.classList.add('has-error');
      result = 'Error';
      if (window.CalcMaster.App) {
        window.CalcMaster.App.showToast(err.message || 'Math error', 'error');
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
    } else if (e.key === '^') {
      handleInput('power', 'y');
    } else if (e.key === '!') {
      handleInput('factorial');
    } else if (e.key === '(' || e.key === ')') {
      handleInput('parenthesis', e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      handleInput('calculate');
    } else if (e.key === 'Backspace') {
      handleInput('delete');
    } else if (e.key === 'Escape') {
      handleInput('clear');
    } else if (e.key.toLowerCase() === 'p') {
      handleInput('constant', 'pi');
    } else if (e.key.toLowerCase() === 'e') {
      handleInput('constant', 'e');
    }
  }

  return {
    init,
    handleInput,
    handleKeyboard,
    insertValue,
    copyResult,
    toggleAngleMode,
    syncAngleUnit,
    getAngleMode: () => angleMode,
    getExpression: () => expression,
    setExpression: (val) => {
      expression = val;
      isEvaluated = false;
      updateDisplay();
    }
  };
})();
