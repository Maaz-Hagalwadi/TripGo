import { createContext, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => (
  <ThemeContext.Provider value={{ isDark: true, toggle: () => {} }}>
    {children}
  </ThemeContext.Provider>
);
