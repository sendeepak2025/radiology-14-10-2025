import axios, { AxiosResponse } from 'axios'
import type { 
  User, 
  LoginCredentials, 
  LoginResponse, 
  RefreshTokenResponse 
} from '../types/auth'
import { mockAuthService } from './mockAuthService'

class AuthService {
  private baseURL = '/auth'

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Always call backend API; remove mock in dev
    const response: AxiosResponse<LoginResponse> = await axios.post(
      `${this.baseURL}/login`,
      credentials,
      { withCredentials: true }
    )
    
    if (response.data.success) {
      // Store tokens in axios defaults
      this.setAuthToken(response.data.accessToken)
      // Persist tokens and user if rememberMe
      if (credentials.rememberMe) {
        localStorage.setItem('accessToken', response.data.accessToken)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        localStorage.setItem('user', JSON.stringify(response.data.user))
      } else {
        sessionStorage.setItem('accessToken', response.data.accessToken)
        sessionStorage.setItem('refreshToken', response.data.refreshToken)
        sessionStorage.setItem('user', JSON.stringify(response.data.user))
      }
    }
    
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/logout`, undefined, { withCredentials: true })
    } finally {
      this.clearAuthToken()
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      sessionStorage.removeItem('user')
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response: AxiosResponse<RefreshTokenResponse> = await axios.post(
      `${this.baseURL}/refresh`,
      { refreshToken },
      { withCredentials: true }
    )
    
    if (response.data.success) {
      this.setAuthToken(response.data.accessToken)
      // Update persisted tokens
      if (localStorage.getItem('refreshToken')) {
        localStorage.setItem('accessToken', response.data.accessToken)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        localStorage.setItem('user', JSON.stringify(response.data.user))
      } else {
        sessionStorage.setItem('accessToken', response.data.accessToken)
        sessionStorage.setItem('refreshToken', response.data.refreshToken)
        sessionStorage.setItem('user', JSON.stringify(response.data.user))
      }
    }
    
    return response.data
  }

  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<{ success: boolean; data: User }> = await axios.get(
      `${this.baseURL}/users/me`,
      { withCredentials: true }
    )
    
    return response.data.data
  }

  async updateProfile(profileData: Partial<User>): Promise<User> {
    const response: AxiosResponse<{ success: boolean; data: User }> = await axios.put(
      `${this.baseURL}/users/me`,
      profileData
    )
    
    return response.data.data
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await axios.post(`${this.baseURL}/users/me/change-password`, {
      currentPassword,
      newPassword
    })
  }

  async validateToken(): Promise<boolean> {
    try {
      // Use mock service in development
      if (import.meta.env.DEV) {
        return await mockAuthService.validateToken()
      }

      await axios.post(`${this.baseURL}/validate`)
      return true
    } catch {
      return false
    }
  }

  setAuthToken(token: string): void {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  clearAuthToken(): void {
    delete axios.defaults.headers.common['Authorization']
  }

  getStoredToken(): string | null {
    // Read from persisted storage
    return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
  }
}

export const authService = new AuthService()

// Axios interceptors for token management
axios.interceptors.request.use(
  (config) => {
    // Add correlation ID for request tracking
    config.headers['x-correlation-id'] = crypto.randomUUID()
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

axios.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Dispatch refresh token action
      // This would be handled by the auth slice
      const event = new CustomEvent('auth:token-expired')
      window.dispatchEvent(event)
    }

    return Promise.reject(error)
  }
)