// Save filter state to sessionStorage
export const saveFilterState = (page: string, state: any) => {
  try {
    sessionStorage.setItem(`filter_state_${page}`, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save filter state:', e);
  }
};

// Load filter state from sessionStorage
export const loadFilterState = (page: string) => {
  try {
    const saved = sessionStorage.getItem(`filter_state_${page}`);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.warn('Failed to load filter state:', e);
    return null;
  }
};

// Clear filter state from sessionStorage
export const clearFilterState = (page: string) => {
  try {
    sessionStorage.removeItem(`filter_state_${page}`);
  } catch (e) {
    console.warn('Failed to clear filter state:', e);
  }
}; 