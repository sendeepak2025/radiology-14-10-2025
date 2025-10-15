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
          scrollbarColor: '#D1D1D6 #F5F5F7',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 14,
            height: 14,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 7,
            backgroundColor: '#D1D1D6',
            minHeight: 24,
            border: '3px solid #F5F5F7',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#B8B8BD',
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: '#F5F5F7',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(0, 0, 0, 0.06)',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        },
        elevation2: {
          boxShadow: '0 2px 6px -1px rgba(0, 0, 0, 0.1)',
        },
        elevation3: {
          boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: '1.0625rem',
          fontWeight: 500,
          textTransform: 'none',
          letterSpacing: '-0.01em',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(0.98)',
          },
          '&:active': {
            transform: 'scale(0.96)',
          },
        },
        contained: {
          backgroundColor: '#007AFF',
          boxShadow: '0 1px 3px 0 rgba(0, 122, 255, 0.3)',
          '&:hover': {
            backgroundColor: '#0051D5',
            boxShadow: '0 2px 6px 0 rgba(0, 122, 255, 0.4)',
          },
        },
        outlined: {
          borderWidth: 1.5,
          borderColor: '#007AFF',
          color: '#007AFF',
          '&:hover': {
            borderWidth: 1.5,
            backgroundColor: 'rgba(0, 122, 255, 0.08)',
          },
        },
        text: {
          color: '#007AFF',
          '&:hover': {
            backgroundColor: 'rgba(0, 122, 255, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.875rem',
          letterSpacing: '-0.01em',
        },
        filled: {
          backgroundColor: 'rgba(0, 122, 255, 0.1)',
          color: '#007AFF',
          border: 'none',
        },
        outlined: {
          borderColor: 'rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#FFFFFF',
            transition: 'all 0.2s ease-in-out',
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.12)',
              borderWidth: 1.5,
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#007AFF',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FAFAFA',
          borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 16px 32px -8px rgba(0, 0, 0, 0.14)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: 'none',
        },
        standardSuccess: {
          backgroundColor: 'rgba(52, 199, 89, 0.1)',
          color: '#248A3D',
        },
        standardError: {
          backgroundColor: 'rgba(255, 59, 48, 0.1)',
          color: '#D70015',
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 149, 0, 0.1)',
          color: '#C93400',
        },
        standardInfo: {
          backgroundColor: 'rgba(0, 122, 255, 0.1)',
          color: '#0051D5',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 0',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 122, 255, 0.1)',
            color: '#007AFF',
            '&:hover': {
              backgroundColor: 'rgba(0, 122, 255, 0.15)',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          color: '#000000',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.88)',
          fontSize: '0.8125rem',
          padding: '6px 10px',
          borderRadius: 6,
        },
        arrow: {
          color: 'rgba(0, 0, 0, 0.88)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            transform: 'scale(0.95)',
          },
        },
      },
    },
  },
};

export const theme = createTheme(advancedTheme);
