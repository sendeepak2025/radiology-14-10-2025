import type { 
  User, 
  LoginCredentials, 
  LoginResponse, 
  RefreshTokenResponse 
} from '../types/auth'

// Mock users for development/testing
const mockUsers: User[] = [
  {
    id: 'admin-001',
    username: 'admin',
    email: 'admin@medicalviewer.com',
    firstName: 'Admin',
    lastName: 'User',
    roles: ['admin', 'radiologist', 'user'],
    permissions: [
      'studies:read',
      'studies:write',
      'studies:delete',
      'users:read',
      'users:write',
      'users:delete',
      'analytics:read',
      'settings:write',
      'reports:read',
      'reports:write'
    ],
    isActive: true,
    isVerified: true,
    mfaEnabled: false,
    lastLogin: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'doctor-001',
    username: 'doctor',
    email: 'doctor@medicalviewer.com',
    firstName: 'Dr. John',
    lastName: 'Smith',
    roles: ['radiologist', 'user'],
    permissions: [
      'studies:read',
      'studies:write',
      'analytics:read',
      'reports:read',
      'reports:write'
    ],
    isActive: true,
    isVerified: true,
    mfaEnabled: false,
    lastLogin: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tech-001',
    username: 'tech',
    email: 'tech@medicalviewer.com',
    firstName: 'Tech',
    lastName: 'User',
    roles: ['technician', 'user'],
    permissions: [
      'studies:read',
      'studies:write'
    ],
    isActive: true,
    isVerified: true,
    mfaEnabled: false,
    lastLogin: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  }
]

// Mock credentials (username: password)
const mockCredentials: Record<string, string> = {
  'admin': 'admin123',
  'doctor': 'doctor123',
  'tech': 'tech123'
}

class MockAuthService {
  private currentUser: User | null = null
  private accessToken: string | null = null
  private refreshTokenValue: string | null = null

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800))

    const { username, password } = credentials
    
    // Check credentials
    if (!mockCredentials[username] || mockCredentials[username] !== password) {
      throw new Error('Invalid username or password')
    }

    // Find user
    const user = mockUsers.find(u => u.username === username)
    if (!user) {
      throw new Error('User not found')
    }

    if (!user.isActive) {
      throw new Error('Account is disabled')
    }

    // Generate mock tokens (simple JWT-like structure for testing)
    const tokenPayload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
    }
    
    this.accessToken = `mock.${btoa(JSON.stringify(tokenPayload))}.signature`
    this.refreshTokenValue = `mock-refresh-token-${Date.now()}`
    this.currentUser = { ...user }

    // Update last login
    this.currentUser.lastLogin = new Date().toISOString()

    console.log('Mock login successful:', { username, user: this.currentUser })

    return {
      success: true,
      accessToken: this.accessToken,
      refreshToken: this.refreshTokenValue,
      user: this.currentUser
    }
  }

  async logout(): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200))
    
    this.currentUser = null
    this.accessToken = null
    this.refreshTokenValue = null
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300))

    if (!this.currentUser || this.refreshTokenValue !== refreshToken) {
      throw new Error('Invalid refresh token')
    }

    // Generate new tokens
    this.accessToken = `mock-access-token-${Date.now()}`
    this.refreshTokenValue = `mock-refresh-token-${Date.now()}`

    return {
      success: true,
      accessToken: this.accessToken,
      refreshToken: this.refreshTokenValue,
      user: this.currentUser
    }
  }

  async getCurrentUser(): Promise<User> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200))

    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    return this.currentUser
  }

  async updateProfile(profileData: Partial<User>): Promise<User> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400))

    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    // Update user data
    this.currentUser = {
      ...this.currentUser,
      ...profileData,
      updatedAt: new Date().toISOString()
    }

    return this.currentUser
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))

    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const storedPassword = mockCredentials[this.currentUser.username]
    if (storedPassword !== currentPassword) {
      throw new Error('Current password is incorrect')
    }

    // Update password
    mockCredentials[this.currentUser.username] = newPassword
  }

  async validateToken(): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return this.accessToken !== null && this.currentUser !== null
  }

  setAuthToken(token: string): void {
    this.accessToken = token
  }

  clearAuthToken(): void {
    this.accessToken = null
  }

  getStoredToken(): string | null {
    return this.accessToken
  }

  // Development helper methods
  getAllUsers(): User[] {
    return mockUsers
  }

  getCredentials(): Record<string, string> {
    return mockCredentials
  }
}

export const mockAuthService = new MockAuthService()

// Export for development use
export { mockUsers, mockCredentials }