import React, { useState, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Badge,
  LinearProgress,
  Divider,
  Button,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  SmartToy as AIIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  ZoomIn as ZoomInIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { format, parseISO } from 'date-fns'

import type { AIResult, AIFinding } from '@/types/worklist'

interface AIFindingsPanelProps {
  /** AI analysis results */
  aiResults: AIResult[]
  /** Whether the panel is visible */
  visible?: boolean
  /** Callback when panel visibility changes */
  onVisibilityChange?: (visible: boolean) => void
  /** Callback when a finding is selected for navigation */
  onFindingSelect?: (finding: AIFinding, result: AIResult) => void
  /** Callback when a finding location should be shown */
  onShowLocation?: (finding: AIFinding, result: AIResult) => void
  /** Selected finding ID */
  selectedFindingId?: string
}

const getSeverityIcon = (severity: AIFinding['severity']) => {
  switch (severity) {
    case 'CRITICAL':
      return <ErrorIcon color="error" />
    case 'HIGH':
      return <WarningIcon color="warning" />
    case 'MEDIUM':
      return <InfoIcon color="info" />
    case 'LOW':
      return <CheckCircleIcon color="success" />
    default:
      return <InfoIcon />
  }
}

const getSeverityColor = (severity: AIFinding['severity']) => {
  switch (severity) {
    case 'CRITICAL':
      return 'error'
    case 'HIGH':
      return 'warning'
    case 'MEDIUM':
      return 'info'
    case 'LOW':
      return 'success'
    default:
      return 'default'
  }
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'success'
  if (confidence >= 0.6) return 'warning'
  return 'error'
}

export const AIFindingsPanel: React.FC<AIFindingsPanelProps> = ({
  aiResults,
  visible = true,
  onVisibilityChange,
  onFindingSelect,
  onShowLocation,
  selectedFindingId,
}) => {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  const handleResultExpand = useCallback((resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(resultId)) {
        newSet.delete(resultId)
      } else {
        newSet.add(resultId)
      }
      return newSet
    })
  }, [])

  const handleFindingClick = useCallback((finding: AIFinding, result: AIResult) => {
    onFindingSelect?.(finding, result)
  }, [onFindingSelect])

  const handleShowLocation = useCallback((finding: AIFinding, result: AIResult, event: React.MouseEvent) => {
    event.stopPropagation()
    onShowLocation?.(finding, result)
  }, [onShowLocation])

  const formatProcessingTime = (timeMs: number) => {
    if (timeMs < 1000) return `${timeMs}ms`
    return `${(timeMs / 1000).toFixed(1)}s`
  }

  const getTotalFindings = () => {
    return aiResults.reduce((total, result) => total + result.findings.length, 0)
  }

  const getCriticalFindings = () => {
    return aiResults.reduce((total, result) => 
      total + result.findings.filter(f => f.severity === 'CRITICAL').length, 0
    )
  }

  const getHighFindings = () => {
    return aiResults.reduce((total, result) => 
      total + result.findings.filter(f => f.severity === 'HIGH').length, 0
    )
  }

  const getAverageConfidence = () => {
    const allFindings = aiResults.flatMap(r => r.findings)
    if (allFindings.length === 0) return 0
    const sum = allFindings.reduce((total, f) => total + f.confidence, 0)
    return sum / allFindings.length
  }

  if (!visible) {
    return null
  }

  if (!aiResults.length) {
    return (
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          p: 3,
          minWidth: 300,
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          zIndex: 1000,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon />
            AI Analysis
          </Typography>
          {onVisibilityChange && (
            <IconButton
              size="small"
              onClick={() => onVisibilityChange(false)}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          No AI analysis results available
        </Typography>
      </Paper>
    )
  }

  const totalFindings = getTotalFindings()
  const criticalFindings = getCriticalFindings()
  const highFindings = getHighFindings()
  const avgConfidence = getAverageConfidence()

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        width: 400,
        maxHeight: '80vh',
        bgcolor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon />
            AI Analysis Results
          </Typography>
          {onVisibilityChange && (
            <IconButton
              size="small"
              onClick={() => onVisibilityChange(false)}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        {/* Summary Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Findings
            </Typography>
            <Typography variant="h6">
              {totalFindings}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Avg Confidence
            </Typography>
            <Typography variant="h6" color={getConfidenceColor(avgConfidence)}>
              {Math.round(avgConfidence * 100)}%
            </Typography>
          </Box>
        </Box>

        {/* Severity Breakdown */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {criticalFindings > 0 && (
            <Chip
              size="small"
              icon={<ErrorIcon />}
              label={`${criticalFindings} Critical`}
              color="error"
              variant="outlined"
            />
          )}
          {highFindings > 0 && (
            <Chip
              size="small"
              icon={<WarningIcon />}
              label={`${highFindings} High`}
              color="warning"
              variant="outlined"
            />
          )}
          <Chip
            size="small"
            label={`${aiResults.length} Models`}
            variant="outlined"
            sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' }}
          />
        </Box>
      </Box>

      {/* Results List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {aiResults.map((result) => (
          <Accordion
            key={result.id}
            expanded={expandedResults.has(result.id)}
            onChange={() => handleResultExpand(result.id)}
            sx={{
              bgcolor: 'transparent',
              color: 'white',
              '&:before': { display: 'none' },
              '& .MuiAccordionSummary-root': {
                borderBottom: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
            >
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="medium">
                    {result.modelName}
                  </Typography>
                  <Badge
                    badgeContent={result.findings.length}
                    color="primary"
                    sx={{ '& .MuiBadge-badge': { bgcolor: 'primary.main' } }}
                  >
                    <AIIcon fontSize="small" />
                  </Badge>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    v{result.modelVersion}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatProcessingTime(result.processingTime)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(parseISO(result.createdAt), 'MMM dd, HH:mm')}
                  </Typography>
                </Box>

                {/* Confidence Bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Confidence:
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={result.confidence * 100}
                      sx={{
                        height: 4,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getConfidenceColor(result.confidence),
                        },
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color={getConfidenceColor(result.confidence)}>
                    {Math.round(result.confidence * 100)}%
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ p: 0 }}>
              <List dense>
                {result.findings.map((finding, index) => (
                  <ListItem
                    key={`${result.id}-${index}`}
                    button
                    selected={selectedFindingId === `${result.id}-${index}`}
                    onClick={() => handleFindingClick(finding, result)}
                    sx={{
                      borderBottom: index < result.findings.length - 1 ? 1 : 0,
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(25, 118, 210, 0.2)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getSeverityIcon(finding.severity)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {finding.type}
                          </Typography>
                          <Chip
                            size="small"
                            label={finding.severity}
                            color={getSeverityColor(finding.severity)}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 18 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                            {finding.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Confidence: {Math.round(finding.confidence * 100)}%
                            </Typography>
                            {finding.measurements && Object.keys(finding.measurements).length > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                • Measurements: {Object.keys(finding.measurements).length}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      }
                    />

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {finding.location && (
                        <Tooltip title="Show Location">
                          <IconButton
                            size="small"
                            onClick={(e) => handleShowLocation(finding, result, e)}
                            sx={{ color: 'white' }}
                          >
                            <ZoomInIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          sx={{ color: 'white' }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItem>
                ))}
              </List>

              {/* Measurements Summary */}
              {result.findings.some(f => f.measurements) && (
                <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Measurements Summary
                  </Typography>
                  {result.findings
                    .filter(f => f.measurements)
                    .map((finding, index) => (
                      <Box key={index} sx={{ mb: 1 }}>
                        <Typography variant="caption" fontWeight="medium">
                          {finding.type}:
                        </Typography>
                        {Object.entries(finding.measurements!).map(([key, value]) => (
                          <Typography key={key} variant="caption" display="block" sx={{ ml: 1 }}>
                            {key}: {value} mm
                          </Typography>
                        ))}
                      </Box>
                    ))}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Footer Actions */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          sx={{
            color: 'white',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          Export Results
        </Button>
      </Box>
    </Paper>
  )
}

export default AIFindingsPanel