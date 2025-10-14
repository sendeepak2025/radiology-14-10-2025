import { setupServer } from 'msw/node'
import { rest } from 'msw'

// Mock API handlers
export const handlers = [
  // Auth endpoints
  rest.post('/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['radiologist'],
          permissions: ['studies:read', 'studies:write'],
          isActive: true,
          isVerified: true,
          mfaEnabled: false,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      })
    )
  }),

  rest.post('/auth/logout', (req, res, ctx) => {
    return res(ctx.json({ success: true }))
  }),

  rest.get('/auth/users/me', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['radiologist'],
          permissions: ['studies:read', 'studies:write'],
          isActive: true,
          isVerified: true,
          mfaEnabled: false,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      })
    )
  }),

  // Worklist endpoints
  rest.get('/api/worklist', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          studies: [],
          total: 0,
          page: 0,
          pageSize: 25,
        },
      })
    )
  }),
]

// Setup server
export const server = setupServer(...handlers)