import React from 'react'
import { Box, Typography } from '@mui/material'
import { Helmet } from 'react-helmet-async'

const SettingsPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Settings - Medical Imaging Viewer</title>
      </Helmet>
      
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Settings interface will be implemented in future iterations.
        </Typography>
      </Box>
    </>
  )
}

export default SettingsPage