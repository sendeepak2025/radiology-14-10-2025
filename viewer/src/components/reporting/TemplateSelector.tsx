import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material'
import type { ReportTemplate } from '@medical-imaging/shared-types'
import { reportingService } from '@/services/reportingService'
import { viewerService } from '@/services/viewerService'

interface TemplateSelectorProps {
  studyInstanceUID: string
  onTemplateSelected: (template: ReportTemplate) => void
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  studyInstanceUID,
  onTemplateSelected
}) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalityFilter, setModalityFilter] = useState('')
  const [bodyPartFilter, setBodyPartFilter] = useState('')
  const [studyModality, setStudyModality] = useState<string>('')

  useEffect(() => {
    loadTemplatesAndStudy()
  }, [studyInstanceUID])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchTerm, modalityFilter, bodyPartFilter])

  const loadTemplatesAndStudy = async () => {
    setLoading(true)
    
    try {
      // Load study to get modality
      const study = await viewerService.loadStudy(studyInstanceUID)
      setStudyModality(study.modality)
      
      // Load all active templates
      const allTemplates = await reportingService.getTemplates({ active: true })
      setTemplates(allTemplates)
      
      // Set default modality filter to study modality
      setModalityFilter(study.modality)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = templates

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by modality
    if (modalityFilter) {
      filtered = filtered.filter(template =>
        template.modality.includes(modalityFilter) || template.modality.includes('ALL')
      )
    }

    // Filter by body part
    if (bodyPartFilter) {
      filtered = filtered.filter(template =>
        !template.bodyPart || 
        template.bodyPart.includes(bodyPartFilter) || 
        template.bodyPart.includes('ALL')
      )
    }

    setFilteredTemplates(filtered)
  }

  const getUniqueModalities = () => {
    const modalities = new Set<string>()
    templates.forEach(template => {
      template.modality.forEach(mod => {
        if (mod !== 'ALL') modalities.add(mod)
      })
    })
    return Array.from(modalities).sort()
  }

  const getUniqueBodyParts = () => {
    const bodyParts = new Set<string>()
    templates.forEach(template => {
      template.bodyPart?.forEach(part => {
        if (part !== 'ALL') bodyParts.add(part)
      })
    })
    return Array.from(bodyParts).sort()
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Filters */}
      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search Templates"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Modality</InputLabel>
              <Select
                value={modalityFilter}
                label="Modality"
                onChange={(e) => setModalityFilter(e.target.value)}
              >
                <MenuItem value="">All Modalities</MenuItem>
                {getUniqueModalities().map(modality => (
                  <MenuItem key={modality} value={modality}>
                    {modality}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Body Part</InputLabel>
              <Select
                value={bodyPartFilter}
                label="Body Part"
                onChange={(e) => setBodyPartFilter(e.target.value)}
              >
                <MenuItem value="">All Body Parts</MenuItem>
                {getUniqueBodyParts().map(bodyPart => (
                  <MenuItem key={bodyPart} value={bodyPart}>
                    {bodyPart}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Template Cards */}
      <Grid container spacing={2}>
        {filteredTemplates.map((template) => (
          <Grid item xs={12} md={6} key={template.id}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 4
                },
                border: template.modality.includes(studyModality) ? 2 : 0,
                borderColor: template.modality.includes(studyModality) ? 'primary.main' : 'transparent'
              }}
              onClick={() => onTemplateSelected(template)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6" component="h3">
                    {template.name}
                  </Typography>
                  {template.modality.includes(studyModality) && (
                    <Chip 
                      label="Recommended" 
                      color="primary" 
                      size="small"
                    />
                  )}
                </Box>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {template.description}
                </Typography>
                
                <Box mb={2}>
                  <Typography variant="caption" display="block" gutterBottom>
                    Modalities:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {template.modality.map(modality => (
                      <Chip 
                        key={modality} 
                        label={modality} 
                        size="small" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
                
                {template.bodyPart && template.bodyPart.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Body Parts:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {template.bodyPart.map(bodyPart => (
                        <Chip 
                          key={bodyPart} 
                          label={bodyPart} 
                          size="small" 
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {template.sections.length} sections • v{template.version}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTemplateSelected(template)
                    }}
                  >
                    Select
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredTemplates.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No templates found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search criteria
          </Typography>
        </Box>
      )}
    </Box>
  )
}