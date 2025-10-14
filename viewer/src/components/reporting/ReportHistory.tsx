import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  CircularProgress
} from '@mui/material'
import {
  Compare as CompareIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import { format } from 'date-fns'
import type { StructuredReport, ReportStatus } from '@medical-imaging/shared-types'
import { reportingService } from '@/services/reportingService'

interface ReportHistoryProps {
  patientId?: string
  studyInstanceUID?: string
  onCompareWithCurrent?: (reportId: string) => void
  onViewReport?: (report: StructuredReport) => void
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({
  patientId,
  studyInstanceUID,
  onCompareWithCurrent,
  onViewReport
}) => {
  const [reports, setReports] = useState<StructuredReport[]>([])
  const [filteredReports, setFilteredReports] = useState<StructuredReport[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    modality: '',
    bodyPart: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  })

  useEffect(() => {
    loadReportHistory()
  }, [studyInstanceUID])

  useEffect(() => {
    applyFilters()
  }, [reports, filters])

  const loadReportHistory = async () => {
    setLoading(true)
    
    try {
      // Use studyInstanceUID if available, otherwise fall back to patientId
      const history = studyInstanceUID 
        ? await reportingService.getReportsByStudy(studyInstanceUID)
        : patientId 
        ? await reportingService.getReportHistory(patientId, { limit: 50 })
        : []
      setReports(history)
    } catch (error) {
      console.error('Failed to load report history:', error)
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = reports

    if (filters.modality) {
      // Note: We'd need to join with study data to filter by modality
      // For now, this is a placeholder
    }

    if (filters.status) {
      filtered = filtered.filter(report => (report.status || report.reportStatus) === filters.status)
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter(report => new Date(report.createdAt || report.reportDate) >= fromDate)
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      filtered = filtered.filter(report => new Date(report.createdAt || report.reportDate) <= toDate)
    }

    setFilteredReports(filtered)
  }

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'draft': return 'default'
      case 'in_progress': return 'primary'
      case 'preliminary': return 'warning'
      case 'final': return 'success'
      case 'amended': return 'info'
      case 'corrected': return 'info'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat': return 'error'
      case 'urgent': return 'warning'
      case 'routine': return 'default'
      default: return 'default'
    }
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
      {/* Filter Controls */}
      <Box mb={2}>
        <Button
          startIcon={<FilterIcon />}
          onClick={() => setShowFilters(!showFilters)}
          variant="outlined"
          size="small"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </Box>

      {showFilters && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Filter Reports
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="preliminary">Preliminary</MenuItem>
                  <MenuItem value="final">Final</MenuItem>
                  <MenuItem value="amended">Amended</MenuItem>
                  <MenuItem value="corrected">Corrected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="From Date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="To Date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setFilters({
                  modality: '',
                  bodyPart: '',
                  status: '',
                  dateFrom: '',
                  dateTo: ''
                })}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Report List */}
      <Paper>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            Report History ({filteredReports.length} reports)
          </Typography>
        </Box>
        
        <Divider />
        
        {filteredReports.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography variant="body1" color="text.secondary">
              No reports found for this study
            </Typography>
          </Box>
        ) : (
          <List>
            {filteredReports.map((report, index) => (
              <React.Fragment key={report.id || index}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="subtitle1">
                          Report #{report.id ? report.id.slice(-8) : 'N/A'}
                        </Typography>
                        <Chip
                          label={(report.status || report.reportStatus || 'draft').replace('_', ' ').toUpperCase()}
                          color={getStatusColor(report.status || report.reportStatus || 'draft')}
                          size="small"
                        />
                        <Chip
                          label={(report.priority || 'routine').toUpperCase()}
                          color={getPriorityColor(report.priority || 'routine')}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Created: {format(new Date(report.createdAt || report.reportDate), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                        {(report.finalizedAt || report.signedAt) && (
                          <Typography variant="body2" color="text.secondary">
                            Finalized: {format(new Date(report.finalizedAt || report.signedAt), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        )}
                        {report.studyInstanceUID && (
                          <Typography variant="body2" color="text.secondary">
                            Study: {report.studyInstanceUID.slice(-12)}
                          </Typography>
                        )}
                        {report.impression && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Impression:</strong> {report.impression.slice(0, 100)}
                            {report.impression.length > 100 && '...'}
                          </Typography>
                        )}
                        {report.findings && report.findings.length > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            {report.findings.length} finding(s), {report.measurements?.length || 0} measurement(s)
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" gap={1}>
                      {onViewReport && (
                        <IconButton
                          edge="end"
                          onClick={() => onViewReport(report)}
                          title="View Report"
                        >
                          <ViewIcon />
                        </IconButton>
                      )}
                      {onCompareWithCurrent && (report.status === 'final' || report.reportStatus === 'final') && report.id && (
                        <IconButton
                          edge="end"
                          onClick={() => onCompareWithCurrent(report.id)}
                          title="Compare with Current"
                        >
                          <CompareIcon />
                        </IconButton>
                      )}
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < filteredReports.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  )
}
