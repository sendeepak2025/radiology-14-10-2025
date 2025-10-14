import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useAuth } from '../../hooks/useAuth'
import authReducer from '../../store/slices/authSlice'

// Create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: initialState,
  })
}

// Test wrapper
const createWrapper = (initialState = {}) => {
  const store = createTestStore(initialState)
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )
}

describe('useAuth', () => {
  it('should return initial auth state', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBe(null)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should return authenticated state when user is logged in', () => {
    const authenticatedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['radiologist'],
          permissions: ['studies:read', 'studies:write'],
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
        isLoading: false,
        error: null,
        lastActivity: Date.now(),
      },
    }

    const wrapper = createWrapper(authenticatedState)
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(authenticatedState.auth.user)
    expect(result.current.accessToken).toBe('mock-token')
  })

  it('should check permissions correctly', () => {
    const authenticatedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['radiologist'],
          permissions: ['studies:read', 'studies:write', 'reports:*'],
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
        isLoading: false,
        error: null,
        lastActivity: Date.now(),
      },
    }

    const wrapper = createWrapper(authenticatedState)
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Exact permission match
    expect(result.current.hasPermission('studies:read')).toBe(true)
    expect(result.current.hasPermission('studies:write')).toBe(true)

    // Wildcard permission match
    expect(result.current.hasPermission('reports:read')).toBe(true)
    expect(result.current.hasPermission('reports:write')).toBe(true)

    // No permission
    expect(result.current.hasPermission('admin:delete')).toBe(false)
  })

  it('should check roles correctly', () => {
    const authenticatedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['radiologist', 'viewer'],
          permissions: ['studies:read'],
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
        isLoading: false,
        error: null,
        lastActivity: Date.now(),
      },
    }

    const wrapper = createWrapper(authenticatedState)
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.hasRole('radiologist')).toBe(true)
    expect(result.current.hasRole('viewer')).toBe(true)
    expect(result.current.hasRole('admin')).toBe(false)

    expect(result.current.hasAnyRole(['radiologist', 'admin'])).toBe(true)
    expect(result.current.hasAnyRole(['admin', 'superuser'])).toBe(false)
  })
})