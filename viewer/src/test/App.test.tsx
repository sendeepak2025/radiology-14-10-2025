import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { configureStore } from '@reduxjs/toolkit'
import App from '../App'
import authReducer from '../store/slices/authSlice'
import uiReducer from '../store/slices/uiSlice'
import worklistReducer from '../store/slices/worklistSlice'
import viewerReducer from '../store/slices/viewerSlice'
import settingsReducer from '../store/slices/settingsSlice'

// Create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      worklist: worklistReducer,
      viewer: viewerReducer,
      settings: settingsReducer,
    },
    preloadedState: initialState,
  })
}

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; initialState?: any }> = ({ 
  children, 
  initialState = {} 
}) => {
  const store = createTestStore(initialState)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  )
}

describe('App', () => {
  it('renders login page when not authenticated', () => {
    render(
      <TestWrapper initialState={{ auth: { isAuthenticated: false, isLoading: false } }}>
        <App />
      </TestWrapper>
    )

    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('renders dashboard when authenticated', () => {
    const authenticatedState = {
      auth: {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          roles: ['radiologist'],
          permissions: ['studies:read'],
        },
      },
    }

    render(
      <TestWrapper initialState={authenticatedState}>
        <App />
      </TestWrapper>
    )

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
  })

  it('shows loading screen when authentication is loading', () => {
    render(
      <TestWrapper initialState={{ auth: { isAuthenticated: false, isLoading: true } }}>
        <App />
      </TestWrapper>
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})