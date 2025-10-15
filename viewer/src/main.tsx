import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from 'react-error-boundary'
import { ThemeProvider, CssBaseline } from '@mui/material'

import App from './App'
import { store } from './store'
import { theme } from './theme/advancedTheme'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { ErrorFallback } from './components/ui/ErrorFallback'
import { errorLogger, ErrorSeverity } from './utils/errorLogger'

import './index.css'

// Enhanced error boundary error handler with centralized logging
const handleError = (error: Error, info: { componentStack: string }) => {
  console.error('Application error:', error)
  
  // Log to centralized error tracking
  errorLogger.log(error, ErrorSeverity.CRITICAL, {
    component: 'ErrorBoundary',
    additionalInfo: {
      componentStack: info.componentStack,
    },
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      <HelmetProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Provider store={store}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </Provider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)