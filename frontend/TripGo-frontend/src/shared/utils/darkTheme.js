import { createTheme } from '@mui/material';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0B1F3A',
    },
    background: {
      default: '#050505',
      paper: '#1A1A1A',
    },
    text: {
      primary: '#ffffff',
      secondary: '#94a3b8',
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            backgroundColor: '#1A1A1A',
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.05)' },
            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
            '&.Mui-focused fieldset': { borderColor: '#0B1F3A' },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 800,
        },
      },
    },
  },
});
