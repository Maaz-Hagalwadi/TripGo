import { createContext, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => (
  <ThemeContext.Provider value={{ isDark: false, toggle: () => {} }}>
    {children}
  </ThemeContext.Provider>
);
