import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * Apple-Inspired Medical Imaging Viewer Theme
 * Clean, Minimal, Professional - Following Apple's Design Language
 */

const advancedTheme: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#007AFF', // Apple Blue
      light: '#5AC8FA',
      dark: '#0051D5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#5856D6', // Apple Purple
      light: '#AF52DE',
      dark: '#3634A3',
      contrastText: '#ffffff',
    },
    success: {
      main: '#34C759', // Apple Green
      light: '#30D158',
      dark: '#248A3D',
    },
    warning: {
      main: '#FF9500', // Apple Orange
      light: '#FFCC00',
      dark: '#C93400',
    },
    error: {
      main: '#FF3B30', // Apple Red
      light: '#FF6961',
      dark: '#D70015',
    },
    background: {
      default: '#F5F5F7', // Apple Light Gray
      paper: '#FFFFFF', // Pure white
    },
    text: {
      primary: '#000000',
      secondary: '#6E6E73',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '3rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#000000',
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.015em',
      color: '#000000',
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: '#000000',
    },
    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#000000',
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#000000',
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#000000',
    },
    subtitle1: {
      fontSize: '1.0625rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#000000',
    },
    subtitle2: {
      fontSize: '0.9375rem',
      fontWeight: 500,
      lineHeight: 1.5,
      color: '#6E6E73',
    },
    body1: {
      fontSize: '1.0625rem',
      lineHeight: 1.47,
      letterSpacing: '-0.01em',
      color: '#000000',
    },
    body2: {
      fontSize: '0.9375rem',
      lineHeight: 1.43,
      letterSpacing: '-0.01em',
      color: '#6E6E73',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '-0.01em',
    },
    caption: {
      fontSize: '0.8125rem',
      lineHeight: 1.4,
      color: '#6E6E73',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    '0 2px 6px -1px rgba(0, 0, 0, 0.1)',
    '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
    '0 8px 16px -4px rgba(0, 0, 0, 0.1)',
    '0 12px 24px -6px rgba(0, 0, 0, 0.12)',
    '0 16px 32px -8px rgba(0, 0, 0, 0.14)',
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
