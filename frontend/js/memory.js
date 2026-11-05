/**
 * CalcMaster Memory Module
 * Manages standard and named memory slots (M, M1, M2, M3) with persistence and indicators
 */

window.CalcMaster = window.CalcMaster || {};

window.CalcMaster.Memory = (() => {
  const STORAGE_KEY = 'calcmaster_memory';
  
  // Default memory state
  let memoryState = {
    activeSlot: 'M',
    slots: {
      M: 0,
      M1: 0,
      M2: 0,
      M3: 0
    }
  };

  /**
   * Initialize memory module from localStorage
   */
  function init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.slots) {
          memoryState.slots = { ...memoryState.slots, ...parsed.slots };
        }
        if (parsed.activeSlot && memoryState.slots.hasOwnProperty(parsed.activeSlot)) {
          memoryState.activeSlot = parsed.activeSlot;
        }
      }
    } catch (e) {
      console.error('Error loading memory from localStorage:', e);
    }

    updateUI();
  }

  /**
   * Persist state to localStorage
   */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
    } catch (e) {
      console.error('Failed to save memory to localStorage:', e);
    }
    updateUI();
  }

  /**
   * Updates memory badges in the DOM
   */
  function updateUI() {
    const hasVal = Boolean(memoryState.slots[memoryState.activeSlot] && memoryState.slots[memoryState.activeSlot] !== 0);
    
    // Update badge on Standard and Scientific calculators
    const indicators = document.querySelectorAll('.memory-indicator');
    indicators.forEach((badge) => {
      if (hasVal) {
        badge.classList.add('active');
        badge.textContent = `${memoryState.activeSlot}: ${formatMemoryValue(memoryState.slots[memoryState.activeSlot])}`;
        badge.style.display = 'inline-flex';
      } else {
        badge.classList.remove('active');
        badge.textContent = memoryState.activeSlot;
        badge.style.display = 'none';
      }
    });

    // Update settings memory table if present
    if (window.CalcMaster.Settings && typeof window.CalcMaster.Settings.renderMemoryTable === 'function') {
      window.CalcMaster.Settings.renderMemoryTable();
    }
  }

  function formatMemoryValue(num) {
    if (num === undefined || num === null) return '0';
    const n = Number(num);
    if (isNaN(n)) return '0';
    if (Math.abs(n) >= 1e9 || (Math.abs(n) < 1e-4 && n !== 0)) {
      return n.toExponential(4);
    }
    return String(parseFloat(n.toFixed(6)));
  }

  /**
   * Memory Clear (MC) - Clears the current active slot
   */
  function mc() {
    memoryState.slots[memoryState.activeSlot] = 0;
    save();
    if (window.CalcMaster.App) {
      window.CalcMaster.App.showToast(`Memory ${memoryState.activeSlot} cleared`, 'info');
    }
    return 0;
  }

  /**
   * Memory Recall (MR) - Returns current active slot value
   */
  function mr() {
    const val = memoryState.slots[memoryState.activeSlot] || 0;
    if (window.CalcMaster.App) {
      window.CalcMaster.App.showToast(`Recalled ${memoryState.activeSlot}: ${val}`, 'info');
    }
    return val;
  }

  /**
   * Memory Store (MS) - Sets active memory slot to input value
   */
  function ms(val) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    memoryState.slots[memoryState.activeSlot] = num;
    save();
    if (window.CalcMaster.App) {
      window.CalcMaster.App.showToast(`Stored in ${memoryState.activeSlot}: ${num}`, 'success');
    }
    return num;
  }

  /**
   * Memory Plus (M+) - Adds value to active memory slot
   */
  function mPlus(val) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    memoryState.slots[memoryState.activeSlot] = (memoryState.slots[memoryState.activeSlot] || 0) + num;
    save();
    if (window.CalcMaster.App) {
      window.CalcMaster.App.showToast(`Added to ${memoryState.activeSlot} (Total: ${memoryState.slots[memoryState.activeSlot]})`, 'success');
    }
    return memoryState.slots[memoryState.activeSlot];
  }

  /**
   * Memory Minus (M-) - Subtracts value from active memory slot
   */
  function mMinus(val) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    memoryState.slots[memoryState.activeSlot] = (memoryState.slots[memoryState.activeSlot] || 0) - num;
    save();
    if (window.CalcMaster.App) {
      window.CalcMaster.App.showToast(`Subtracted from ${memoryState.activeSlot} (Total: ${memoryState.slots[memoryState.activeSlot]})`, 'success');
    }
    return memoryState.slots[memoryState.activeSlot];
  }

  /**
   * Clear all memory slots
   */
  function clearAll() {
    Object.keys(memoryState.slots).forEach((key) => {
      memoryState.slots[key] = 0;
    });
    save();
    if (window.CalcMaster.App) {
      window.CalcMaster.App.showToast('All memory slots cleared', 'info');
    }
  }

  /**
   * Get value of specific slot
   */
  function getSlotValue(slot) {
    return memoryState.slots[slot] !== undefined ? memoryState.slots[slot] : 0;
  }

  /**
   * Set value of specific slot
   */
  function setSlotValue(slot, value) {
    if (memoryState.slots.hasOwnProperty(slot)) {
      memoryState.slots[slot] = Number(value) || 0;
      save();
    }
  }

  /**
   * Get active slot name
   */
  function getActiveSlot() {
    return memoryState.activeSlot;
  }

  /**
   * Switch active slot
   */
  function setActiveSlot(slot) {
    if (memoryState.slots.hasOwnProperty(slot)) {
      memoryState.activeSlot = slot;
      save();
    }
  }

  /**
   * Get all slots dictionary
   */
  function getAllSlots() {
    return { ...memoryState.slots };
  }

  return {
    init,
    mc,
    mr,
    ms,
    mPlus,
    mMinus,
    clearAll,
    getSlotValue,
    setSlotValue,
    getActiveSlot,
    setActiveSlot,
    getAllSlots,
    updateUI
  };
})();
