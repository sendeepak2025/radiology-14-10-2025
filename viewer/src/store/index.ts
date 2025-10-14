import { configureStore } from '@reduxjs/toolkit'
import { combineReducers } from '@reduxjs/toolkit'

import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'
import worklistReducer from './slices/worklistSlice'
import viewerReducer from './slices/viewerSlice'
import settingsReducer from './slices/settingsSlice'
import toastReducer from './slices/toastSlice'

// Root reducer
const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  worklist: worklistReducer,
  viewer: viewerReducer,
  settings: settingsReducer,
  toast: toastReducer,
})

// Load preloaded auth state from storage
function loadAuthPreloadedState() {
  const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
  let user = null
  try { if (userStr) user = JSON.parse(userStr) } catch {}
  if (accessToken && refreshToken && user) {
    return {
      auth: {
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        lastActivity: Date.now(),
      }
    }
  }
  return undefined
}

// Configure store (with preloaded state)
export const store = configureStore({
  reducer: rootReducer,
  preloadedState: loadAuthPreloadedState(),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [],
      },
    }),
  devTools: true,
})

// Types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks
export { useAppDispatch, useAppSelector } from './hooks'