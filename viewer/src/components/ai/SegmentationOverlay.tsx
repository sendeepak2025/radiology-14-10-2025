import React, { useEffect, useRef, useCallback, useState } from 'react'
import { Box, IconButton, Tooltip, Slider, Typography, Paper, Chip } from '@mui/material'
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Opacity as OpacityIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material'
import { Types, Enums } from '@cornerstonejs/core'
import { segmentation } from '@cornerstonejs/tools'

interface SegmentationData {
  segmentationId: string
  volumeId: string
  label: string
  color: [number, number, number, number] // RGBA
  confidence?: number
  category?: string
  description?: string
}

interface SegmentationOverlayProps {
  /** Viewport instance */
  viewport: Types.IVolumeViewport | null
  /** Segmentation data to render */
  segmentations: SegmentationData[]
  /** Whether overlays are visible */
  visible?: boolean
  /** Global opacity for all segmentations */
  opacity?: number
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void
  /** Callback when opacity changes */
  onOpacityChange?: (opacity: number) => void
  /** Callback when segmentation selection changes */
  onSegmentationSelect?: (segmentationId: string | null) => void
  /** Selected segmentation ID */
  selectedSegmentationId?: string | null
}

const DEFAULT_COLORS: [number, number, number, number][] = [
  [255, 0, 0, 255],     // Red
  [0, 255, 0, 255],     // Green
  [0, 0, 255, 255],     // Blue
  [255, 255, 0, 255],   // Yellow
  [255, 0, 255, 255],   // Magenta
  [0, 255, 255, 255],   // Cyan
  [255, 128, 0, 255],   // Orange
  [128, 0, 255, 255],   // Purple
]

export const SegmentationOverlay: React.FC<SegmentationOverlayProps> = ({
  viewport,
  segmentations,
  visible = true,
  opacity = 0.5,
  onVisibilityChange,
  onOpacityChange,
  onSegmentationSelect,
  selectedSegmentationId,
}) => {
  const [localOpacity, setLocalOpacity] = useState(opacity)
  const [localVisible, setLocalVisible] = useState(visible)
  const segmentationRefs = useRef<Map<string, any>>(new Map())

  // Initialize segmentations
  useEffect(() => {
    if (!viewport || !segmentations.length) return

    const initializeSegmentations = async () => {
      try {
        for (const seg of segmentations) {
          // Check if segmentation already exists
          if (segmentationRefs.current.has(seg.segmentationId)) {
            continue
          }

          // Add segmentation to viewport
          await segmentation.addSegmentations([
            {
              segmentationId: seg.segmentationId,
              representation: {
                type: Enums.SegmentationRepresentations.Labelmap,
                data: {
                  volumeId: seg.volumeId,
                },
              },
            },
          ])

          // Configure segmentation appearance
          const segmentationRepresentation = {
            segmentationId: seg.segmentationId,
            type: Enums.SegmentationRepresentations.Labelmap,
            config: {
              renderInactiveSegmentations: true,
              representations: {
                [Enums.SegmentationRepresentations.Labelmap]: {
                  renderOutline: true,
                  outlineWidth: 2,
                  renderFill: true,
                  fillAlpha: localOpacity,
                  outlineOpacity: 1,
                },
              },
            },
          }

          // Add to viewport
          await segmentation.addSegmentationRepresentations(viewport.id, [
            segmentationRepresentation,
          ])

          // Set segment colors
          const segmentationStateManager = segmentation.state.getSegmentation(seg.segmentationId)
          if (segmentationStateManager) {
            const colorLUT = segmentation.state.getColorLUT(segmentationStateManager.colorLUTIndex)
            if (colorLUT) {
              // Set color for segment index 1 (assuming single segment per segmentation)
              colorLUT[1] = seg.color
              segmentation.state.setColorLUT(segmentationStateManager.colorLUTIndex, colorLUT)
            }
          }

          segmentationRefs.current.set(seg.segmentationId, segmentationRepresentation)
        }

        viewport.render()
      } catch (error) {
        console.error('Failed to initialize segmentations:', error)
      }
    }

    initializeSegmentations()

    return () => {
      // Cleanup segmentations on unmount
      segmentationRefs.current.forEach((_, segmentationId) => {
        try {
          segmentation.removeSegmentation(segmentationId)
        } catch (error) {
          console.warn('Failed to remove segmentation:', segmentationId, error)
        }
      })
      segmentationRefs.current.clear()
    }
  }, [viewport, segmentations, localOpacity])

  // Update visibility
  useEffect(() => {
    if (!viewport) return

    segmentationRefs.current.forEach((segRep, segmentationId) => {
      try {
        segmentation.config.setGlobalConfig({
          representations: {
            [Enums.SegmentationRepresentations.Labelmap]: {
              renderInactiveSegmentations: localVisible,
            },
          },
        })
      } catch (error) {
        console.warn('Failed to update segmentation visibility:', error)
      }
    })

    viewport.render()
  }, [viewport, localVisible])

  // Update opacity
  useEffect(() => {
    if (!viewport) return

    segmentationRefs.current.forEach((segRep, segmentationId) => {
      try {
        segmentation.config.setSegmentationRepresentationConfig(
          viewport.id,
          segmentationId,
          {
            representations: {
              [Enums.SegmentationRepresentations.Labelmap]: {
                fillAlpha: localOpacity,
              },
            },
          }
        )
      } catch (error) {
        console.warn('Failed to update segmentation opacity:', error)
      }
    })

    viewport.render()
  }, [viewport, localOpacity])

  const handleVisibilityToggle = useCallback(() => {
    const newVisible = !localVisible
    setLocalVisible(newVisible)
    onVisibilityChange?.(newVisible)
  }, [localVisible, onVisibilityChange])

  const handleOpacityChange = useCallback((_: Event, value: number | number[]) => {
    const newOpacity = Array.isArray(value) ? value[0] : value
    setLocalOpacity(newOpacity)
    onOpacityChange?.(newOpacity)
  }, [onOpacityChange])

  const handleSegmentationClick = useCallback((segmentationId: string) => {
    const newSelection = selectedSegmentationId === segmentationId ? null : segmentationId
    onSegmentationSelect?.(newSelection)
  }, [selectedSegmentationId, onSegmentationSelect])

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'default'
    if (confidence >= 0.8) return 'success'
    if (confidence >= 0.6) return 'warning'
    return 'error'
  }

  if (!segmentations.length) {
    return null
  }

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        p: 2,
        minWidth: 280,
        maxWidth: 320,
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaletteIcon fontSize="small" />
          AI Segmentations ({segmentations.length})
        </Typography>
        
        <Tooltip title={localVisible ? 'Hide overlays' : 'Show overlays'}>
          <IconButton
            size="small"
            onClick={handleVisibilityToggle}
            sx={{ color: 'white' }}
          >
            {localVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Opacity Control */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <OpacityIcon fontSize="small" />
          <Typography variant="caption">
            Opacity: {Math.round(localOpacity * 100)}%
          </Typography>
        </Box>
        <Slider
          value={localOpacity}
          onChange={handleOpacityChange}
          min={0}
          max={1}
          step={0.1}
          size="small"
          sx={{
            color: 'white',
            '& .MuiSlider-thumb': {
              bgcolor: 'white',
            },
            '& .MuiSlider-track': {
              bgcolor: 'white',
            },
            '& .MuiSlider-rail': {
              bgcolor: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        />
      </Box>

      {/* Segmentation List */}
      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
        {segmentations.map((seg, index) => (
          <Box
            key={seg.segmentationId}
            sx={{
              p: 1,
              mb: 1,
              border: 1,
              borderColor: selectedSegmentationId === seg.segmentationId ? 'primary.main' : 'rgba(255, 255, 255, 0.2)',
              borderRadius: 1,
              cursor: 'pointer',
              bgcolor: selectedSegmentationId === seg.segmentationId ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
            onClick={() => handleSegmentationClick(seg.segmentationId)}
          >
            {/* Color indicator and label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  bgcolor: `rgba(${seg.color[0]}, ${seg.color[1]}, ${seg.color[2]}, 1)`,
                  borderRadius: 0.5,
                  border: 1,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                }}
              />
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 'medium' }}>
                {seg.label}
              </Typography>
              {seg.confidence && (
                <Chip
                  size="small"
                  label={`${Math.round(seg.confidence * 100)}%`}
                  color={getConfidenceColor(seg.confidence)}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Box>

            {/* Category and description */}
            {seg.category && (
              <Typography variant="caption" color="text.secondary" display="block">
                Category: {seg.category}
              </Typography>
            )}
            {seg.description && (
              <Typography variant="caption" color="text.secondary" display="block">
                {seg.description}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

export default SegmentationOverlay