import React, { useState, useCallback, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Divider,
} from '@mui/material'
import {
  Straighten as RulerIcon,
  CropFree as RectangleIcon,
  RadioButtonUnchecked as CircleIcon,
  Timeline as AngleIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Add as AddIcon,
  SmartToy as AIIcon,
} from '@mui/icons-material'
import { Types } from '@cornerstonejs/core'
import { ToolGroupManager, annotation } from '@cornerstonejs/tools'

import type { AIFinding, AIResult } from '@/types/worklist'

interface Measurement {
  id: string
  type: 'length' | 'rectangle' | 'circle' | 'angle'
  value: number
  unit: string
  label?: string
  aiGenerated?: boolean
  aiConfidence?: number
  relatedFinding?: {
    finding: AIFinding
    result: AIResult
  }
}

interface MeasurementToolsProps {
  /** Viewport instance */
  viewport: Types.IStackViewport | Types.IVolumeViewport | null
  /** Tool group ID */
  toolGroupId: string
  /** AI findings that can generate measurements */
  aiFindings?: Array<{
    finding: AIFinding
    result: AIResult
  }>
  /** Callback when measurements change */
  onMeasurementsChange?: (measurements: Measurement[]) => void
  /** Whether the panel is visible */
  visible?: boolean
}

const MEASUREMENT_TOOLS = {
  length: {
    name: 'Length',
    icon: RulerIcon,
    toolName: 'Length',
    unit: 'mm',
  },
  rectangle: {
    name: 'Rectangle ROI',
    icon: RectangleIcon,
    toolName: 'RectangleROI',
    unit: 'mm²',
  },
  circle: {
    name: 'Circle ROI',
    icon: CircleIcon,
    toolName: 'CircleROI',
    unit: 'mm²',
  },
  angle: {
    name: 'Angle',
    icon: AngleIcon,
    toolName: 'Angle',
    unit: '°',
  },
} as const

export const MeasurementTools: React.FC<MeasurementToolsProps> = ({
  viewport,
  toolGroupId,
  aiFindings = [],
  onMeasurementsChange,
  visible = true,
}) => {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [measurementsVisible, setMeasurementsVisible] = useState(true)

  // Generate measurements from AI findings
  useEffect(() => {
    const aiMeasurements: Measurement[] = []
    
    aiFindings.forEach(({ finding, result }) => {
      if (finding.measurements) {
        Object.entries(finding.measurements).forEach(([key, value], index) => {
          aiMeasurements.push({
            id: `ai-${result.id}-${finding.type}-${index}`,
            type: 'length', // Default to length for AI measurements
            value,
            unit: 'mm',
            label: `${finding.type} - ${key}`,
            aiGenerated: true,
            aiConfidence: finding.confidence,
            relatedFinding: { finding, result },
          })
        })
      }
    })

    setMeasurements(prev => {
      // Remove old AI measurements and add new ones
      const manualMeasurements = prev.filter(m => !m.aiGenerated)
      return [...manualMeasurements, ...aiMeasurements]
    })
  }, [aiFindings])

  // Listen for annotation events
  useEffect(() => {
    if (!viewport) return

    const handleAnnotationAdded = (event: any) => {
      const { annotation: ann } = event.detail
      
      // Convert annotation to measurement
      const measurement: Measurement = {
        id: ann.annotationUID,
        type: getToolTypeFromAnnotation(ann),
        value: calculateMeasurementValue(ann),
        unit: getMeasurementUnit(ann),
        label: `Manual ${getToolTypeFromAnnotation(ann)}`,
        aiGenerated: false,
      }

      setMeasurements(prev => [...prev, measurement])
      onMeasurementsChange?.([...measurements, measurement])
    }

    const handleAnnotationRemoved = (event: any) => {
      const { annotationUID } = event.detail
      
      setMeasurements(prev => {
        const updated = prev.filter(m => m.id !== annotationUID)
        onMeasurementsChange?.(updated)
        return updated
      })
    }

    // Add event listeners
    viewport.element.addEventListener('CORNERSTONE_ANNOTATION_ADDED', handleAnnotationAdded)
    viewport.element.addEventListener('CORNERSTONE_ANNOTATION_REMOVED', handleAnnotationRemoved)

    return () => {
      viewport.element.removeEventListener('CORNERSTONE_ANNOTATION_ADDED', handleAnnotationAdded)
      viewport.element.removeEventListener('CORNERSTONE_ANNOTATION_REMOVED', handleAnnotationRemoved)
    }
  }, [viewport, measurements, onMeasurementsChange])

  const getToolTypeFromAnnotation = (ann: any): Measurement['type'] => {
    switch (ann.metadata?.toolName) {
      case 'Length':
        return 'length'
      case 'RectangleROI':
        return 'rectangle'
      case 'CircleROI':
        return 'circle'
      case 'Angle':
        return 'angle'
      default:
        return 'length'
    }
  }

  const calculateMeasurementValue = (ann: any): number => {
    // This would need to be implemented based on the annotation data structure
    // For now, return a placeholder value
    return Math.round(Math.random() * 100 * 100) / 100
  }

  const getMeasurementUnit = (ann: any): string => {
    const toolType = getToolTypeFromAnnotation(ann)
    return MEASUREMENT_TOOLS[toolType]?.unit || 'mm'
  }

  const handleToolSelect = useCallback((toolType: keyof typeof MEASUREMENT_TOOLS) => {
    if (!viewport) return

    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId)
    if (!toolGroup) return

    const toolName = MEASUREMENT_TOOLS[toolType].toolName

    // Deactivate current tool
    if (activeTool) {
      toolGroup.setToolPassive(activeTool)
    }

    // Activate new tool
    if (activeTool === toolName) {
      setActiveTool(null)
    } else {
      toolGroup.setToolActive(toolName, {
        bindings: [{ mouseButton: 1 }],
      })
      setActiveTool(toolName)
    }
  }, [viewport, toolGroupId, activeTool])

  const handleDeleteMeasurement = useCallback((measurementId: string) => {
    const measurement = measurements.find(m => m.id === measurementId)
    if (!measurement || measurement.aiGenerated) return

    // Remove annotation from viewport
    try {
      annotation.state.removeAnnotation(measurementId)
      viewport?.render()
    } catch (error) {
      console.warn('Failed to remove annotation:', error)
    }

    // Update measurements list
    setMeasurements(prev => {
      const updated = prev.filter(m => m.id !== measurementId)
      onMeasurementsChange?.(updated)
      return updated
    })
  }, [measurements, viewport, onMeasurementsChange])

  const handleToggleVisibility = useCallback(() => {
    setMeasurementsVisible(prev => !prev)
    
    // Toggle annotation visibility
    try {
      const annotationManager = annotation.state.getDefaultAnnotationManager()
      measurements.forEach(measurement => {
        if (!measurement.aiGenerated) {
          const ann = annotationManager.getAnnotation(measurement.id)
          if (ann) {
            ann.isVisible = !measurementsVisible
          }
        }
      })
      viewport?.render()
    } catch (error) {
      console.warn('Failed to toggle measurement visibility:', error)
    }
  }, [measurementsVisible, measurements, viewport])

  const handleGenerateAIMeasurements = useCallback(() => {
    // This would trigger AI-based measurement generation
    // For now, we'll simulate adding some measurements
    const newMeasurements: Measurement[] = [
      {
        id: `ai-generated-${Date.now()}`,
        type: 'length',
        value: 15.7,
        unit: 'mm',
        label: 'AI Detected Nodule Diameter',
        aiGenerated: true,
        aiConfidence: 0.89,
      },
    ]

    setMeasurements(prev => [...prev, ...newMeasurements])
    onMeasurementsChange?.([...measurements, ...newMeasurements])
  }, [measurements, onMeasurementsChange])

  if (!visible) {
    return null
  }

  const manualMeasurements = measurements.filter(m => !m.aiGenerated)
  const aiMeasurements = measurements.filter(m => m.aiGenerated)

  return (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 320,
        maxHeight: '60vh',
        bgcolor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <RulerIcon />
          Measurements
        </Typography>

        {/* Tool Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {Object.entries(MEASUREMENT_TOOLS).map(([key, tool]) => {
            const Icon = tool.icon
            const isActive = activeTool === tool.toolName
            
            return (
              <Tooltip key={key} title={tool.name}>
                <IconButton
                  size="small"
                  onClick={() => handleToolSelect(key as keyof typeof MEASUREMENT_TOOLS)}
                  sx={{
                    color: isActive ? 'primary.main' : 'white',
                    bgcolor: isActive ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
                    border: 1,
                    borderColor: isActive ? 'primary.main' : 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              </Tooltip>
            )
          })}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<AIIcon />}
            onClick={handleGenerateAIMeasurements}
            variant="outlined"
            sx={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            AI Measure
          </Button>
          
          <Tooltip title={measurementsVisible ? 'Hide measurements' : 'Show measurements'}>
            <IconButton
              size="small"
              onClick={handleToggleVisibility}
              sx={{ color: 'white' }}
            >
              {measurementsVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Measurements List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* AI Measurements */}
        {aiMeasurements.length > 0 && (
          <Box>
            <Box sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AIIcon fontSize="small" />
                AI Generated ({aiMeasurements.length})
              </Typography>
            </Box>
            <List dense>
              {aiMeasurements.map((measurement) => (
                <ListItem
                  key={measurement.id}
                  sx={{
                    borderBottom: 1,
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <AIIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {measurement.label}
                        </Typography>
                        {measurement.aiConfidence && (
                          <Chip
                            size="small"
                            label={`${Math.round(measurement.aiConfidence * 100)}%`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 18 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {measurement.value} {measurement.unit}
                        {measurement.relatedFinding && (
                          <> • {measurement.relatedFinding.finding.type}</>
                        )}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Manual Measurements */}
        {manualMeasurements.length > 0 && (
          <Box>
            {aiMeasurements.length > 0 && <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />}
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2">
                Manual Measurements ({manualMeasurements.length})
              </Typography>
            </Box>
            <List dense>
              {manualMeasurements.map((measurement) => {
                const tool = Object.values(MEASUREMENT_TOOLS).find(t => t.unit === measurement.unit)
                const Icon = tool?.icon || RulerIcon
                
                return (
                  <ListItem
                    key={measurement.id}
                    sx={{
                      borderBottom: 1,
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight="medium">
                          {measurement.label}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {measurement.value} {measurement.unit}
                        </Typography>
                      }
                    />

                    <IconButton
                      size="small"
                      onClick={() => handleDeleteMeasurement(measurement.id)}
                      sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                )
              })}
            </List>
          </Box>
        )}

        {/* Empty State */}
        {measurements.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <RulerIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No measurements available
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Select a measurement tool to start measuring
            </Typography>
          </Box>
        )}
      </Box>

      {/* Summary */}
      {measurements.length > 0 && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="caption" color="text.secondary">
            Total: {measurements.length} measurements
            {aiMeasurements.length > 0 && (
              <> • {aiMeasurements.length} AI-generated</>
            )}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

export default MeasurementTools