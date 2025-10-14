import React, { useState } from 'react'
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Typography,
  Chip,
  Autocomplete
} from '@mui/material'
import type { ReportMeasurement, AnatomicalLocation } from '@medical-imaging/shared-types'

interface MeasurementEditorProps {
  measurement?: ReportMeasurement | null
  onSave: (measurement: ReportMeasurement) => void
  onCancel: () => void
}

const MEASUREMENT_TYPES = [
  'Length',
  'Width',
  'Height',
  'Diameter',
  'Area',
  'Volume',
  'Angle',
  'Distance',
  'Thickness',
  'Density (HU)',
  'Signal Intensity',
  'Other'
]

const UNITS = [
  'mm',
  'cm',
  'm',
  'mm²',
  'cm²',
  'm²',
  'mm³',
  'cm³',
  'm³',
  'degrees',
  'HU',
  'pixels',
  '%'
]

const BODY_PARTS = [
  'Head',
  'Neck',
  'Chest',
  'Abdomen',
  'Pelvis',
  'Spine',
  'Upper Extremity',
  'Lower Extremity',
  'Brain',
  'Heart',
  'Lungs',
  'Liver',
  'Kidneys',
  'Other'
]

const LATERALITY_OPTIONS = ['left', 'right', 'bilateral'] as const

export const MeasurementEditor: React.FC<MeasurementEditorProps> = ({
  measurement,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(measurement?.name || '')
  const [value, setValue] = useState(measurement?.value || 0)
  const [unit, setUnit] = useState(measurement?.unit || 'mm')
  const [method, setMethod] = useState(measurement?.method || '')
  const [normalRange, setNormalRange] = useState(measurement?.normalRange || { min: undefined, max: undefined })
  const [location, setLocation] = useState<AnatomicalLocation>(measurement?.location || {
    bodyPart: '',
    laterality: undefined,
    region: ''
  })

  const handleSave = () => {
    if (!name || value === undefined) {
      return
    }

    const newMeasurement: ReportMeasurement = {
      id: measurement?.id || Date.now().toString(),
      name,
      value,
      unit,
      method: method || undefined,
      normalRange: (normalRange.min !== undefined || normalRange.max !== undefined) ? normalRange : undefined,
      location: location.bodyPart ? location : undefined,
      aiGenerated: measurement?.aiGenerated || false
    }

    onSave(newMeasurement)
  }

  const handleLocationChange = (field: keyof AnatomicalLocation, value: any) => {
    setLocation(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNormalRangeChange = (field: 'min' | 'max', value: string) => {
    const numValue = value ? parseFloat(value) : undefined
    setNormalRange(prev => ({
      ...prev,
      [field]: numValue
    }))
  }

  const isValueNormal = () => {
    if (!normalRange.min && !normalRange.max) return null
    
    if (normalRange.min && value < normalRange.min) return false
    if (normalRange.max && value > normalRange.max) return false
    
    return true
  }

  const normalStatus = isValueNormal()

  return (
    <Box sx={{ pt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Autocomplete
            value={name}
            onChange={(_, newValue) => setName(newValue || '')}
            options={MEASUREMENT_TYPES}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Measurement Name"
                required
                fullWidth
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="number"
            label="Value"
            value={value}
            onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
            required
            inputProps={{ step: 0.1 }}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Unit</InputLabel>
            <Select
              value={unit}
              label="Unit"
              onChange={(e) => setUnit(e.target.value)}
            >
              {UNITS.map(u => (
                <MenuItem key={u} value={u}>
                  {u}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Measurement Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="e.g., manual caliper, automated segmentation"
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Normal Range (Optional)
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Minimum Normal Value"
            value={normalRange.min || ''}
            onChange={(e) => handleNormalRangeChange('min', e.target.value)}
            inputProps={{ step: 0.1 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Maximum Normal Value"
            value={normalRange.max || ''}
            onChange={(e) => handleNormalRangeChange('max', e.target.value)}
            inputProps={{ step: 0.1 }}
          />
        </Grid>

        {normalStatus !== null && (
          <Grid item xs={12}>
            <Chip
              label={normalStatus ? 'Within Normal Range' : 'Outside Normal Range'}
              color={normalStatus ? 'success' : 'warning'}
              size="small"
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Location (Optional)
          </Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <Autocomplete
            value={location.bodyPart}
            onChange={(_, newValue) => handleLocationChange('bodyPart', newValue || '')}
            options={BODY_PARTS}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Body Part"
                fullWidth
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Laterality</InputLabel>
            <Select
              value={location.laterality || ''}
              label="Laterality"
              onChange={(e) => handleLocationChange('laterality', e.target.value || undefined)}
            >
              <MenuItem value="">None</MenuItem>
              {LATERALITY_OPTIONS.map(lat => (
                <MenuItem key={lat} value={lat}>
                  {lat.charAt(0).toUpperCase() + lat.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Region"
            value={location.region || ''}
            onChange={(e) => handleLocationChange('region', e.target.value)}
            placeholder="e.g., upper lobe, anterior wall"
          />
        </Grid>

        {measurement?.aiGenerated && (
          <Grid item xs={12}>
            <Chip 
              label="AI Generated" 
              color="primary" 
              size="small" 
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
            <Button onClick={onCancel} variant="outlined">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained"
              disabled={!name || value === undefined}
            >
              Save Measurement
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}