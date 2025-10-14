import React, { useState, useEffect } from 'react'
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
import type { ReportFinding, FindingSeverity, AnatomicalLocation } from '@medical-imaging/shared-types'

interface FindingEditorProps {
  finding?: ReportFinding | null
  onSave: (finding: ReportFinding) => void
  onCancel: () => void
}

const FINDING_TYPES = [
  'Mass',
  'Nodule',
  'Lesion',
  'Fracture',
  'Hemorrhage',
  'Edema',
  'Inflammation',
  'Calcification',
  'Cyst',
  'Tumor',
  'Pneumonia',
  'Atelectasis',
  'Pleural Effusion',
  'Pneumothorax',
  'Other'
]

const SEVERITIES: FindingSeverity[] = ['normal', 'mild', 'moderate', 'severe', 'critical']

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

export const FindingEditor: React.FC<FindingEditorProps> = ({
  finding,
  onSave,
  onCancel
}) => {
  const [type, setType] = useState(finding?.type || '')
  const [description, setDescription] = useState(finding?.description || '')
  const [severity, setSeverity] = useState<FindingSeverity>(finding?.severity || 'normal')
  const [confidence, setConfidence] = useState(finding?.confidence || 1.0)
  const [location, setLocation] = useState<AnatomicalLocation>(finding?.location || {
    bodyPart: '',
    laterality: undefined,
    region: ''
  })
  const [snomedCode, setSnomedCode] = useState(finding?.snomedCode || '')
  const [radlexCode, setRadlexCode] = useState(finding?.radlexCode || '')

  const handleSave = () => {
    if (!type || !description) {
      return
    }

    const newFinding: ReportFinding = {
      id: finding?.id || Date.now().toString(),
      type,
      description,
      severity,
      confidence,
      location: location.bodyPart ? location : undefined,
      snomedCode: snomedCode || undefined,
      radlexCode: radlexCode || undefined,
      aiGenerated: finding?.aiGenerated || false,
      aiModelName: finding?.aiModelName,
      aiConfidence: finding?.aiConfidence
    }

    onSave(newFinding)
  }

  const handleLocationChange = (field: keyof AnatomicalLocation, value: any) => {
    setLocation(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Box sx={{ pt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Autocomplete
            value={type}
            onChange={(_, newValue) => setType(newValue || '')}
            options={FINDING_TYPES}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Finding Type"
                required
                fullWidth
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Severity</InputLabel>
            <Select
              value={severity}
              label="Severity"
              onChange={(e) => setSeverity(e.target.value as FindingSeverity)}
            >
              {SEVERITIES.map(sev => (
                <MenuItem key={sev} value={sev}>
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Describe the finding in detail..."
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Location
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

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Confidence"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, max: 1, step: 0.1 }}
            helperText="Confidence level (0.0 - 1.0)"
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Coding (Optional)
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="SNOMED CT Code"
            value={snomedCode}
            onChange={(e) => setSnomedCode(e.target.value)}
            placeholder="e.g., 404684003"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="RadLex Code"
            value={radlexCode}
            onChange={(e) => setRadlexCode(e.target.value)}
            placeholder="e.g., RID39154"
          />
        </Grid>

        {finding?.aiGenerated && (
          <Grid item xs={12}>
            <Box display="flex" gap={1} alignItems="center">
              <Chip 
                label="AI Generated" 
                color="primary" 
                size="small" 
              />
              {finding.aiModelName && (
                <Chip 
                  label={`Model: ${finding.aiModelName}`} 
                  variant="outlined" 
                  size="small" 
                />
              )}
              {finding.aiConfidence && (
                <Chip 
                  label={`AI Confidence: ${(finding.aiConfidence * 100).toFixed(1)}%`} 
                  variant="outlined" 
                  size="small" 
                />
              )}
            </Box>
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
              disabled={!type || !description}
            >
              Save Finding
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}