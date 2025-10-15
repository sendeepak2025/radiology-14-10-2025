import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography, Paper, Container } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary Component
 * Catches React component errors and displays user-friendly fallback UI
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send to error logging service (Sentry, LogRocket, etc.)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Placeholder for error logging service integration
    // When Sentry is integrated, use: Sentry.captureException(error, { extra: errorInfo });
    
    const errorLog = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // In production, send to backend error logging endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorLog),
      }).catch(console.error);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            
            <Typography variant="h4" gutterBottom color="error">
              Oops! Something went wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We're sorry for the inconvenience. The application encountered an unexpected error.
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Error Details (Development Only):
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'grey.100',
                    maxHeight: 200,
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  }}
                >
                  <Typography variant="body2" component="pre" sx={{ m: 0 }}>
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </Typography>
                </Paper>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              If this problem persists, please contact support with the error code: {Date.now().toString(36)}
            </Typography>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
