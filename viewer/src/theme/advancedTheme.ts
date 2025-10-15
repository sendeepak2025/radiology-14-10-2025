import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * Advanced Medical Imaging Viewer Theme
 * Combines: Modern Minimal + Professional Medical + Dark Mode + Futuristic Tech
 */

const advancedTheme: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#00b4d8', // Medical blue
      light: '#48cae4',
      dark: '#0077b6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8338ec', // Accent purple
      light: '#a855f7',
      dark: '#6d28d9',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    background: {
      default: '#0a0e27', // Deep space blue
      paper: '#111827', // Dark slate
    },
    text: {
      primary: '#f3f4f6',
      secondary: '#9ca3af',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '3rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.75,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 0 40px rgba(0, 180, 216, 0.15)', // Glow effect
    '0 8px 32px 0 rgba(31, 38, 135, 0.37)', // Glassmorphism
    ...Array(17).fill('0 0 0 0 rgba(0,0,0,0)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#374151 #111827',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#374151',
            minHeight: 24,
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#4b5563',
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: '#111827',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        elevation1: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
        elevation2: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
        elevation3: {
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '0.9375rem',
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
          boxShadow: '0 4px 15px rgba(0, 180, 216, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #48cae4 0%, #00b4d8 100%)',
            boxShadow: '0 8px 25px rgba(0, 180, 216, 0.4)',
          },
        },
        outlined: {
          borderWidth: 2,
          borderColor: 'rgba(0, 180, 216, 0.5)',
          '&:hover': {
            borderWidth: 2,
            borderColor: '#00b4d8',
            backgroundColor: 'rgba(0, 180, 216, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 180, 216, 0.5)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.8125rem',
        },
        filled: {
          background: 'linear-gradient(135deg, rgba(0, 180, 216, 0.2) 0%, rgba(0, 119, 182, 0.2) 100%)',
          border: '1px solid rgba(0, 180, 216, 0.3)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 180, 216, 0.5)',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00b4d8',
                borderWidth: 2,
              },
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'rgba(10, 14, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backdropFilter: 'blur(10px)',
        },
        standardSuccess: {
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        },
        standardError: {
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        },
        standardWarning: {
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        },
        standardInfo: {
          background: 'rgba(0, 180, 216, 0.15)',
          border: '1px solid rgba(0, 180, 216, 0.3)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '4px 0',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'rgba(0, 180, 216, 0.1)',
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            background: 'linear-gradient(135deg, rgba(0, 180, 216, 0.2) 0%, rgba(131, 56, 236, 0.2) 100%)',
            border: '1px solid rgba(0, 180, 216, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(0, 180, 216, 0.3) 0%, rgba(131, 56, 236, 0.3) 100%)',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(10, 14, 39, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.8125rem',
          padding: '8px 12px',
          borderRadius: 8,
        },
        arrow: {
          color: 'rgba(17, 24, 39, 0.95)',
        },
      },
    },
  },
};

export const theme = createTheme(advancedTheme);
