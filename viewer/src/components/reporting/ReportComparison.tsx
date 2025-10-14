import React from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon
} from '@mui/icons-material'
import { format } from 'date-fns'
import type { ReportComparison, ReportDifference } from '@medical-imaging/shared-types'

interface ReportComparisonProps {
  comparison: ReportComparison
}

export const ReportComparison: React.FC<ReportComparisonProps> = ({
  comparison
}) => {
  const getDifferenceIcon = (type: ReportDifference['type']) => {
    switch (type) {
      case 'added':
        return <AddIcon color="success" />
      case 'removed':
        return <RemoveIcon color="error" />
      case 'modified':
        return <EditIcon color="warning" />
      default:
        return null
    }
  }

  const getDifferenceColor = (type: ReportDifference['type']) => {
    switch (type) {
      case 'added':
        return 'success'
      case 'removed':
        return 'error'
      case 'modified':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getSeverityColor = (severity: ReportDifference['significance']) => {
    switch (severity) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'default'
    }
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) {
      return 'Not specified'
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    
    return String(value)
  }

  const groupedDifferences = comparison.differences.reduce((acc, diff) => {
    if (!acc[diff.category]) {
      acc[diff.category] = []
    }
    acc[diff.category].push(diff)
    return acc
  }, {} as Record<string, ReportDifference[]>)

  const highSignificanceDifferences = comparison.differences.filter(
    diff => diff.significance === 'high'
  )

  return (
    <Box>
      {/* Summary */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Report Comparison Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Current Report: {comparison.currentReportId.slice(-8)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Prior Report: {comparison.priorReportId.slice(-8)}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Comparison Date: {format(new Date(comparison.createdAt), 'MMM dd, yyyy HH:mm')}
            </Typography>
          </Grid>
        </Grid>
        
        <Box display="flex" gap={1} mt={2}>
          <Chip
            label={`${comparison.differences.length} Changes`}
            color="primary"
            size="small"
          />
          <Chip
            label={`${highSignificanceDifferences.length} High Priority`}
            color={highSignificanceDifferences.length > 0 ? 'error' : 'default'}
            size="small"
          />
        </Box>
      </Paper>

      {/* High Priority Changes Alert */}
      {highSignificanceDifferences.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            High Priority Changes Detected
          </Typography>
          {highSignificanceDifferences.map((diff, index) => (
            <Typography key={index} variant="body2">
              • {diff.category}: {diff.field}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Detailed Differences */}
      {Object.entries(groupedDifferences).map(([category, differences]) => (
        <Paper key={category} sx={{ mb: 2 }}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              {category.charAt(0).toUpperCase() + category.slice(1)} Changes
            </Typography>
          </Box>
          
          <Divider />
          
          <List>
            {differences.map((diff, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <Box display="flex" alignItems="flex-start" width="100%" gap={2}>
                    <Box mt={0.5}>
                      {getDifferenceIcon(diff.type)}
                    </Box>
                    
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="subtitle2">
                          {diff.field}
                        </Typography>
                        <Chip
                          label={diff.type.toUpperCase()}
                          color={getDifferenceColor(diff.type)}
                          size="small"
                        />
                        <Chip
                          label={diff.significance.toUpperCase()}
                          color={getSeverityColor(diff.significance)}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      
                      <Grid container spacing={2}>
                        {diff.type !== 'added' && diff.priorValue !== undefined && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" color="text.secondary">
                              Previous Value:
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: 'grey.50' }}>
                              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                {formatValue(diff.priorValue)}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}
                        
                        {diff.type !== 'removed' && diff.currentValue !== undefined && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" color="text.secondary">
                              Current Value:
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: 'grey.50' }}>
                              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                {formatValue(diff.currentValue)}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Box>
                </ListItem>
                {index < differences.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      ))}

      {comparison.differences.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No Differences Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The current report is identical to the prior report
          </Typography>
        </Paper>
      )}
    </Box>
  )
}