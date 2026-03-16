import { createTheme } from '@mui/material/styles';

export function createAppTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: mode === 'light'
        ? { main: '#1565C0', light: '#1E88E5', dark: '#0D47A1' }
        : { main: '#42A5F5', light: '#90CAF9', dark: '#1565C0' },
      secondary: {
        main: '#FF6F00',
      },
      ...(mode === 'light' ? {
        background: {
          default: '#F5F7FA',
          paper: '#FFFFFF',
        },
      } : {
        background: {
          default: '#121212',
          paper: '#1E1E1E',
        },
      }),
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  });
}
