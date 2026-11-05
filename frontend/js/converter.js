/**
 * CalcMaster Unit Converter Module
 * High-precision converter supporting Length, Mass, Temperature, Data, Speed, and Time
 * with real-time debounced conversion, unit swapping, formula explanation, and history integration
 */

window.CalcMaster = window.CalcMaster || {};

window.CalcMaster.Converter = (() => {
  // Unit IDs must match backend ConverterService exactly:
  // LENGTH: mm, cm, m, km, in, ft, yd, mi
  // MASS: mg, g, kg, t, oz, lb
  // TEMPERATURE: C, F, K
  // DATA: b, kb, mb, gb, tb (lowercase)
  const UNITS = {
    LENGTH: {
      defaultFrom: 'm',
      defaultTo: 'ft',
      units: [
        { id: 'mm', label: 'Millimeter (mm)' },
        { id: 'cm', label: 'Centimeter (cm)' },
        { id: 'm', label: 'Meter (m)' },
        { id: 'km', label: 'Kilometer (km)' },
        { id: 'in', label: 'Inch (in)' },
        { id: 'ft', label: 'Foot (ft)' },
        { id: 'yd', label: 'Yard (yd)' },
        { id: 'mi', label: 'Mile (mi)' }
      ]
    },
    MASS: {
      defaultFrom: 'kg',
      defaultTo: 'lb',
      units: [
        { id: 'mg', label: 'Milligram (mg)' },
        { id: 'g', label: 'Gram (g)' },
        { id: 'kg', label: 'Kilogram (kg)' },
        { id: 't', label: 'Metric Ton (t)' },
        { id: 'oz', label: 'Ounce (oz)' },
        { id: 'lb', label: 'Pound (lb)' }
      ]
    },
    TEMPERATURE: {
      defaultFrom: 'C',
      defaultTo: 'F',
      units: [
        { id: 'C', label: 'Celsius (°C)' },
        { id: 'F', label: 'Fahrenheit (°F)' },
        { id: 'K', label: 'Kelvin (K)' }
      ]
    },
    DATA: {
      defaultFrom: 'gb',
      defaultTo: 'mb',
      units: [
        { id: 'b', label: 'Byte (B)' },
        { id: 'kb', label: 'Kilobyte (KB)' },
        { id: 'mb', label: 'Megabyte (MB)' },
        { id: 'gb', label: 'Gigabyte (GB)' },
        { id: 'tb', label: 'Terabyte (TB)' }
      ]
    }
  };

  let debounceTimer = null;

  function init() {
    setupCategories();
    setupEventListeners();
    updateUnitDropdowns('LENGTH');
    convert();
  }

  function setupCategories() {
    const categorySelect = document.getElementById('convert-category-select');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        const cat = e.target.value;
        updateUnitDropdowns(cat);
        convert();
      });
    }

    // Category pills / buttons if present
    const categoryPills = document.querySelectorAll('.converter-cat-pill');
    categoryPills.forEach(pill => {
      pill.addEventListener('click', () => {
        categoryPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const cat = pill.dataset.category;
        if (categorySelect) categorySelect.value = cat;
        updateUnitDropdowns(cat);
        convert();
      });
    });
  }

  function setupEventListeners() {
    const valueInput = document.getElementById('convert-value-input');
    const fromSelect = document.getElementById('convert-from-select');
    const toSelect = document.getElementById('convert-to-select');
    const swapBtn = document.getElementById('convert-swap-btn');
    const copyBtn = document.getElementById('convert-copy-btn');
    const convertBtn = document.getElementById('convert-submit-btn');

    if (valueInput) {
      valueInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(convert, 300);
      });
    }

    if (fromSelect) fromSelect.addEventListener('change', convert);
    if (toSelect) toSelect.addEventListener('change', convert);

    if (swapBtn) {
      swapBtn.addEventListener('click', () => {
        swapUnits();
      });
    }

    if (convertBtn) {
      convertBtn.addEventListener('click', (e) => {
        e.preventDefault();
        convert();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const resText = document.getElementById('convert-result-val').textContent;
        navigator.clipboard.writeText(resText).then(() => {
          if (window.CalcMaster.App) window.CalcMaster.App.showToast(`Copied ${resText}`, 'success');
        });
      });
    }
  }

  function updateUnitDropdowns(category) {
    const fromSelect = document.getElementById('convert-from-select');
    const toSelect = document.getElementById('convert-to-select');
    if (!fromSelect || !toSelect || !UNITS[category]) return;

    const catData = UNITS[category];
    const optionsHtml = catData.units
      .map(u => `<option value="${u.id}">${u.label}</option>`)
      .join('');

    fromSelect.innerHTML = optionsHtml;
    toSelect.innerHTML = optionsHtml;

    fromSelect.value = catData.defaultFrom;
    toSelect.value = catData.defaultTo;
  }

  function swapUnits() {
    const fromSelect = document.getElementById('convert-from-select');
    const toSelect = document.getElementById('convert-to-select');
    if (!fromSelect || !toSelect) return;

    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;

    // Rotate swap icon micro-animation
    const swapIcon = document.getElementById('convert-swap-icon');
    if (swapIcon) {
      swapIcon.classList.add('icon-spin');
      setTimeout(() => swapIcon.classList.remove('icon-spin'), 400);
    }

    convert();
  }

  async function convert() {
    const categorySelect = document.getElementById('convert-category-select');
    const valueInput = document.getElementById('convert-value-input');
    const fromSelect = document.getElementById('convert-from-select');
    const toSelect = document.getElementById('convert-to-select');
    const resultVal = document.getElementById('convert-result-val');
    const formulaEl = document.getElementById('convert-formula-text');

    if (!valueInput || !fromSelect || !toSelect || !resultVal) return;

    const val = parseFloat(valueInput.value);
    const category = categorySelect ? categorySelect.value : 'LENGTH';
    const fromUnit = fromSelect.value;
    const toUnit = toSelect.value;

    if (isNaN(val)) {
      resultVal.textContent = '0';
      if (formulaEl) formulaEl.textContent = 'Enter a value to convert';
      return;
    }

    try {
      const data = await window.CalcMaster.API.convertUnit(val, fromUnit, toUnit, category);

      const formattedRes = typeof data.result === 'number'
        ? (Number.isInteger(data.result) ? data.result.toLocaleString() : parseFloat(data.result.toPrecision(8)).toLocaleString())
        : data.result;

      resultVal.textContent = `${formattedRes} ${toUnit}`;
      resultVal.classList.add('result-pop');
      setTimeout(() => resultVal.classList.remove('result-pop'), 250);

      if (formulaEl) {
        formulaEl.textContent = data.formula || `${val} ${fromUnit} = ${formattedRes} ${toUnit}`;
      }

    } catch (err) {
      console.error('Convert error:', err);
      resultVal.textContent = 'Error';
      if (formulaEl) formulaEl.textContent = err.message || 'Conversion error';
    }
  }

  return {
    init,
    convert,
    swapUnits
  };
})();
