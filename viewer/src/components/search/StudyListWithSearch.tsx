import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Pagination,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material';

import SearchBar from './SearchBar';
import FilterPanel, { StudyFilters } from './FilterPanel';
import searchService, { PaginationParams } from '../../services/searchService';

interface Study {
  studyInstanceUID: string;
  patientName: string;
  patientID?: string;
  studyDate: string;
  modality: string;
  studyDescription?: string;
  numberOfInstances?: number;
}

/**
 * Study List with Search and Filters
 * Complete search interface with pagination
 */
const StudyListWithSearch: React.FC = () => {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<StudyFilters>({});
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Sort state
  const [sortBy, setSortBy] = useState('studyDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  /**
   * Fetch studies with current filters and pagination
   */
  const fetchStudies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const paginationParams: PaginationParams = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder,
      };

      let response;

      if (searchQuery.trim()) {
        // Full-text search
        response = await searchService.fullTextSearch(searchQuery, paginationParams);
      } else {
        // Filter-based search
        response = await searchService.searchStudies(filters, paginationParams);
      }

      setStudies(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.totalItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load studies');
      console.error('Error fetching studies:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, sortBy, sortOrder, searchQuery, filters]);

  // Fetch studies on mount and when dependencies change
  useEffect(() => {
    fetchStudies();
  }, [fetchStudies]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleFiltersChange = (newFilters: StudyFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    setCurrentPage(1); // Reset to first page
    setFilterPanelOpen(false);
    fetchStudies();
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (event: any) => {
    setPageSize(parseInt(event.target.value));
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchStudies();
  };

  // Count active filters
  const activeFiltersCount = Object.keys(filters).filter(
    key => filters[key as keyof StudyFilters] !== undefined && 
           filters[key as keyof StudyFilters] !== '' &&
           (Array.isArray(filters[key as keyof StudyFilters]) 
             ? (filters[key as keyof StudyFilters] as any[]).length > 0 
             : true)
  ).length;

  // Render study item
  const renderStudyItem = (study: Study) => (
    <Paper
      key={study.studyInstanceUID}
      sx={{
        p: 2,
        mb: 1,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
      }}
      onClick={() => {
        // Navigate to study viewer
        window.location.href = `/viewer/${study.studyInstanceUID}`;
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3}>
          <Typography variant="subtitle2" color="primary">
            {study.patientName || 'Unknown Patient'}
          </Typography>
          {study.patientID && (
            <Typography variant="caption" color="text.secondary">
              ID: {study.patientID}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12} sm={2}>
          <Chip label={study.modality} size="small" color="primary" variant="outlined" />
        </Grid>
        <Grid item xs={12} sm={2}>
          <Typography variant="body2">
            {study.studyDate ? 
              new Date(
                study.studyDate.substring(0, 4) + '-' +
                study.studyDate.substring(4, 6) + '-' +
                study.studyDate.substring(6, 8)
              ).toLocaleDateString() 
              : 'N/A'}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {study.studyDescription || 'No description'}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={1}>
          <Chip 
            label={`${study.numberOfInstances || 0} img`} 
            size="small" 
            variant="outlined"
          />
        </Grid>
      </Grid>
    </Paper>
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Search */}
      <Box sx={{ mb: 2 }}>
        <SearchBar
          onSearch={handleSearch}
          onFilterClick={() => setFilterPanelOpen(true)}
          activeFiltersCount={activeFiltersCount}
          initialValue={searchQuery}
        />
      </Box>

      {/* Active Filters Display */}
      {(activeFiltersCount > 0 || searchQuery) && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {searchQuery && (
            <Chip
              label={`Search: "${searchQuery}"`}
              onDelete={() => handleSearch('')}
              color="primary"
              size="small"
            />
          )}
          {filters.modality && filters.modality.length > 0 && (
            <Chip
              label={`Modality: ${filters.modality.join(', ')}`}
              onDelete={() => handleFiltersChange({ ...filters, modality: undefined })}
              size="small"
            />
          )}
          {filters.patientName && (
            <Chip
              label={`Patient: ${filters.patientName}`}
              onDelete={() => handleFiltersChange({ ...filters, patientName: undefined })}
              size="small"
            />
          )}
          {(filters.studyDateFrom || filters.studyDateTo) && (
            <Chip
              label={`Date: ${filters.studyDateFrom || 'Any'} - ${filters.studyDateTo || 'Any'}`}
              onDelete={() => handleFiltersChange({ 
                ...filters, 
                studyDateFrom: undefined,
                studyDateTo: undefined 
              })}
              size="small"
            />
          )}
        </Box>
      )}

      {/* Toolbar */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {totalItems} {totalItems === 1 ? 'study' : 'studies'} found
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Per Page</InputLabel>
            <Select value={pageSize} onChange={handlePageSizeChange} label="Per Page">
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={viewMode === 'list' ? 'Grid View' : 'List View'}>
            <IconButton 
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              size="small"
            >
              {viewMode === 'list' ? <ViewModuleIcon /> : <ViewListIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Study List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && studies.length === 0 && (
          <Alert severity="info">
            No studies found. Try adjusting your search or filters.
          </Alert>
        )}

        {!loading && !error && studies.length > 0 && (
          <Box>
            {studies.map(renderStudyItem)}
          </Box>
        )}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
            size="large"
          />
        </Box>
      )}

      {/* Filter Panel */}
      <FilterPanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />
    </Box>
  );
};

export default StudyListWithSearch;
