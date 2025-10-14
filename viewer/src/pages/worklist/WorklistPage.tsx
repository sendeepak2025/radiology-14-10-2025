import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Drawer,
  useMediaQuery,
  useTheme,
  Fab,
  Badge,
  Snackbar,
  Alert,
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'

import WorklistTable from '@/components/worklist/WorklistTable'
import WorklistFilters from '@/components/worklist/WorklistFilters'
import PatientContextPanel from '@/components/worklist/PatientContextPanel'
import { useStudyCache } from '@/hooks/useStudyCache'
import type { Study, WorklistFilters as Filters, SortOptions } from '@/types/worklist'

const WorklistPage: React.FC = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  // State
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null)
  const [filters, setFilters] = useState<Partial<Filters>>({})
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'studyDate',
    direction: 'desc',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [patientPanelOpen, setPatientPanelOpen] = useState(!isMobile)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  }>({
    open: false,
    message: '',
    severity: 'info',
  })

  // Study cache hook
  const {
    studies,
    total,
    loading,
    error,
    loadWorklist,
    refreshWorklist,
    updateStudy,
    getCacheStats,
  } = useStudyCache({
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    maxCacheSize: 200,
    prefetchRelated: true,
  })

  // Load initial worklist
  useEffect(() => {
    loadWorklist({
      page,
      pageSize,
      filters,
      sort: sortOptions,
      search: searchTerm,
    })
  }, [page, pageSize, filters, sortOptions, searchTerm, loadWorklist])

  // Handle study selection
  const handleStudySelect = useCallback((study: Study) => {
    setSelectedStudy(study)
    if (isMobile) {
      setPatientPanelOpen(true)
    }
    
    // Navigate to viewer if double-clicked (simulated by checking if already selected)
    if (selectedStudy?.studyInstanceUID === study.studyInstanceUID) {
      navigate(`/viewer/${study.studyInstanceUID}`)
    }
  }, [selectedStudy, isMobile, navigate])

  // Handle study assignment
  const handleStudyAssign = useCallback(async (study: Study) => {
    try {
      // This would typically open an assignment dialog
      // For now, we'll simulate assigning to current user
      const updatedStudy = await import('@/services/worklistService').then(
        ({ worklistService }) => worklistService.assignStudy(study.studyInstanceUID, 'current-user')
      )
      
      updateStudy(study.studyInstanceUID, updatedStudy)
      
      setSnackbar({
        open: true,
        message: `Study assigned successfully`,
        severity: 'success',
      })
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to assign study',
        severity: 'error',
      })
    }
  }, [updateStudy])

  // Handle priority change
  const handlePriorityChange = useCallback(async (study: Study, priority: Study['priority']) => {
    try {
      const updatedStudy = await import('@/services/worklistService').then(
        ({ worklistService }) => worklistService.updateStudyPriority(study.studyInstanceUID, priority)
      )
      
      updateStudy(study.studyInstanceUID, updatedStudy)
      
      setSnackbar({
        open: true,
        message: `Priority updated to ${priority}`,
        severity: 'success',
      })
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to update priority',
        severity: 'error',
      })
    }
  }, [updateStudy])

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: Partial<Filters>) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }, [])

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
    setPage(1) // Reset to first page when searching
  }, [])

  // Handle sort change
  const handleSortChange = useCallback((sort: SortOptions) => {
    setSortOptions(sort)
    setPage(1) // Reset to first page when sorting changes
  }, [])

  // Handle page change
  const handlePageChange = useCallback((_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage)
  }, [])

  // Handle page size change
  const handlePageSizeChange = useCallback((event: any) => {
    setPageSize(event.target.value)
    setPage(1) // Reset to first page when page size changes
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refreshWorklist()
    setSnackbar({
      open: true,
      message: 'Worklist refreshed',
      severity: 'success',
    })
  }, [refreshWorklist])

  // Calculate total pages
  const totalPages = Math.ceil(total / pageSize)

  // Get active filter count
  const activeFilterCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== null && v !== '')
    }
    return value !== null && value !== undefined && value !== ''
  }).length

  return (
    <>
      <Helmet>
        <title>Worklist - Medical Imaging Viewer</title>
      </Helmet>
      
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Worklist
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {total} studies • Page {page} of {totalPages}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!isMobile && (
                <Button
                  startIcon={<FilterIcon />}
                  onClick={() => setFilterDrawerOpen(true)}
                  variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
                >
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </Button>
              )}
              
              <Button
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
              
              {!isMobile && (
                <Button
                  startIcon={<PersonIcon />}
                  onClick={() => setPatientPanelOpen(!patientPanelOpen)}
                  variant={patientPanelOpen ? 'contained' : 'outlined'}
                >
                  Patient Context
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Worklist */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Filters (Desktop) */}
            {!isMobile && (
              <WorklistFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onSearch={handleSearch}
                searchTerm={searchTerm}
                loading={loading}
              />
            )}
            
            {/* Table */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <WorklistTable
                studies={studies}
                loading={loading}
                sortOptions={sortOptions}
                onSortChange={handleSortChange}
                onStudySelect={handleStudySelect}
                onStudyAssign={handleStudyAssign}
                onPriorityChange={handlePriorityChange}
                selectedStudyId={selectedStudy?.studyInstanceUID}
              />
            </Box>
            
            {/* Pagination */}
            <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Per Page</InputLabel>
                  <Select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    label="Per Page"
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </FormControl>
                
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                  disabled={loading}
                />
              </Box>
            </Paper>
          </Box>

          {/* Patient Context Panel (Desktop) */}
          {!isMobile && patientPanelOpen && (
            <Box sx={{ width: 400, borderLeft: 1, borderColor: 'divider' }}>
              <PatientContextPanel
                study={selectedStudy}
                onClose={() => setPatientPanelOpen(false)}
              />
            </Box>
          )}
        </Box>

        {/* Mobile FABs */}
        {isMobile && (
          <>
            <Fab
              color="primary"
              sx={{ position: 'fixed', bottom: 80, right: 16 }}
              onClick={() => setFilterDrawerOpen(true)}
            >
              <Badge badgeContent={activeFilterCount} color="error">
                <FilterIcon />
              </Badge>
            </Fab>
            
            {selectedStudy && (
              <Fab
                color="secondary"
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
                onClick={() => setPatientPanelOpen(true)}
              >
                <PersonIcon />
              </Fab>
            )}
          </>
        )}

        {/* Filter Drawer (Mobile) */}
        <Drawer
          anchor="bottom"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          PaperProps={{
            sx: { maxHeight: '80vh' },
          }}
        >
          <Box sx={{ p: 2 }}>
            <WorklistFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onSearch={handleSearch}
              searchTerm={searchTerm}
              loading={loading}
            />
          </Box>
        </Drawer>

        {/* Patient Context Drawer (Mobile) */}
        <Drawer
          anchor="right"
          open={patientPanelOpen && isMobile}
          onClose={() => setPatientPanelOpen(false)}
          PaperProps={{
            sx: { width: '100%', maxWidth: 400 },
          }}
        >
          <PatientContextPanel
            study={selectedStudy}
            onClose={() => setPatientPanelOpen(false)}
          />
        </Drawer>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Error Display */}
        {error && (
          <Snackbar open={!!error} autoHideDuration={6000}>
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          </Snackbar>
        )}
      </Box>
    </>
  )
}

export default WorklistPage