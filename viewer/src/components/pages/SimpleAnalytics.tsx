import React from 'react'
import { Box, Typography, Button, Paper, Grid } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export const SimpleAnalytics: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'info.main', 
        color: 'info.contrastText', 
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          📊 Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            {user?.firstName} {user?.lastName}
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => navigate('/dashboard')}
            sx={{ 
              color: 'info.contrastText', 
              borderColor: 'info.contrastText',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Performance Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Comprehensive analytics and reporting for medical imaging operations
        </Typography>

        {/* Analytics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h3" color="primary.main" gutterBottom>156</Typography>
              <Typography variant="h6">Studies This Week</Typography>
              <Typography variant="body2" color="success.main">+23% from last week</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h3" color="secondary.main" gutterBottom>89%</Typography>
              <Typography variant="h6">AI Accuracy</Typography>
              <Typography variant="body2" color="success.main">+2% improvement</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main" gutterBottom>12.5</Typography>
              <Typography variant="h6">Avg. Read Time (min)</Typography>
              <Typography variant="body2" color="success.main">-8% faster</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h3" color="info.main" gutterBottom>94%</Typography>
              <Typography variant="h6">Report Completion</Typography>
              <Typography variant="body2" color="success.main">On target</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Detailed Analytics */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="primary.main">
                📈 Study Volume Trends
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Weekly study volume analysis
              </Typography>
              <Box sx={{ height: 200, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  [Chart: Study Volume Over Time]
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="secondary.main">
                🎯 AI Performance Metrics
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                AI analysis accuracy and efficiency
              </Typography>
              <Box sx={{ height: 200, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  [Chart: AI Accuracy Trends]
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="warning.main">
                ⏱️ Turnaround Times
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Study processing and reporting times
              </Typography>
              <Box sx={{ height: 200, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  [Chart: Processing Times]
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="info.main">
                🏥 Modality Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Study types and modality usage
              </Typography>
              <Box sx={{ height: 200, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  [Chart: Modality Breakdown]
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Status */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.dark">
            📊 <strong>Analytics Status:</strong> Real-time data updated | 
            <strong> User:</strong> {user?.username} | 
            <strong> Access:</strong> {user?.roles?.includes('admin') ? 'Full Analytics' : 'Standard Reports'}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}