// In-memory global store to preserve bulk dataset predictions across SPA route navigation
// without hitting browser sessionStorage 5MB quota limits.

let datasetState = null;
let selectedCustomer = null;

export const datasetStore = {
  getState: () => datasetState,
  setState: (newState) => {
    datasetState = { ...datasetState, ...newState };
  },
  clearState: () => {
    datasetState = null;
    selectedCustomer = null;
    try {
      sessionStorage.removeItem('datasetAnalysisState');
      sessionStorage.removeItem('selectedDatasetCustomer');
    } catch {
      // ignore
    }
  },
  getSelectedCustomer: () => selectedCustomer,
  setSelectedCustomer: (cust) => {
    selectedCustomer = cust;
    try {
      // Also try saving a lightweight copy in sessionStorage as backup
      sessionStorage.setItem('selectedDatasetCustomer', JSON.stringify(cust));
    } catch {
      // ignore quota exceeded
    }
  },
  clearSelectedCustomer: () => {
    selectedCustomer = null;
    try {
      sessionStorage.removeItem('selectedDatasetCustomer');
    } catch {
      // ignore
    }
  },
};
