import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'busWizard';

const defaultState = {
  busName: '',
  busCode: '',
  vehicleNumber: '',
  model: '',
  busType: '',
  totalSeats: '',
  amenityIds: [],
  blockedSeats: [],
  seatMarks: {}, // { [seatNumber]: { isLadiesOnly, isWindow, isAisle, isBlocked } }
};

const load = () => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultState;
  } catch {
    return defaultState;
  }
};

const BusWizardContext = createContext();

export const BusWizardProvider = ({ children }) => {
  const [wizardData, setWizardData] = useState(load);

  const updateWizard = (fields) => {
    setWizardData((prev) => {
      const next = { ...prev, ...fields };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetWizard = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setWizardData(defaultState);
  };

  return (
    <BusWizardContext.Provider value={{ wizardData, updateWizard, resetWizard }}>
      {children}
    </BusWizardContext.Provider>
  );
};

export const useBusWizard = () => {
  const context = useContext(BusWizardContext);
  if (!context) throw new Error('useBusWizard must be used within BusWizardProvider');
  return context;
};
