import React from 'react'
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  useTheme 
} from '@mui/material'
import { mockUsers, mockCredentials } from '../../services/mockAuthService'

export const TestCredentials: React.FC = () => {
  const theme = useTheme()

  // Only show in development
  if (!import.meta.env.DEV) {
    return null
  }

  return (
    <Box sx={{ mt: 3, mb: 2 }}>
      <Typography variant="h6" gutterBottom color="warning.main">
        Development Test Accounts
      </Typography>
      
      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Username</strong></TableCell>
              <TableCell><strong>Password</strong></TableCell>
              <TableCell><strong>Role</strong></TableCell>
              <TableCell><strong>Name</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {user.username}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {mockCredentials[user.username]}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {user.roles.map((role) => (
                      <Chip 
                        key={role} 
                        label={role} 
                        size="small" 
                        variant="outlined"
                        color={role === 'admin' ? 'error' : role === 'radiologist' ? 'primary' : 'default'}
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {user.firstName} {user.lastName}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        These test accounts are only available in development mode.
      </Typography>
    </Box>
  )
}