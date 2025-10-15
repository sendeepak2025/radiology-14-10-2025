import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  FilterAlt as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export interface StudyFilters {
  patientName?: string;
  patientID?: string;
  studyDateFrom?: string;
  studyDateTo?: string;
  modality?: string[];
  studyDescription?: string;
  accessionNumber?: string;
}

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  filters: StudyFilters;
  onFiltersChange: (filters: StudyFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

const MODALITY_OPTIONS = [
  { value: 'CT', label: 'CT - Computed Tomography' },
  { value: 'MR', label: 'MR - Magnetic Resonance' },
  { value: 'US', label: 'US - Ultrasound' },
  { value: 'XA', label: 'XA - X-Ray Angiography' },
  { value: 'CR', label: 'CR - Computed Radiography' },
  { value: 'DX', label: 'DX - Digital Radiography' },
  { value: 'MG', label: 'MG - Mammography' },
  { value: 'PT', label: 'PT - Positron Emission Tomography' },
  { value: 'NM', label: 'NM - Nuclear Medicine' },
  { value: 'RF', label: 'RF - Radiofluoroscopy' },
];

/**
 * Filter Panel Component
 * Advanced filtering options in a drawer
 */
const FilterPanel: React.FC<FilterPanelProps> = ({
  open,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  onClear,
}) => {
  const [localFilters, setLocalFilters] = useState<StudyFilters>(filters);

  const handleFilterChange = (key: keyof StudyFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleModalityToggle = (modality: string) => {
    const currentModalities = localFilters.modality || [];
    const newModalities = currentModalities.includes(modality)
      ? currentModalities.filter((m) => m !== modality)
      : [...currentModalities, modality];
    
    handleFilterChange('modality', newModalities.length > 0 ? newModalities : undefined);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply();
  };

  const handleClear = () => {
    const emptyFilters: StudyFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    onClear();
  };

  const activeFilterCount = Object.keys(localFilters).filter(
    key => localFilters[key as keyof StudyFilters] !== undefined && 
           localFilters[key as keyof StudyFilters] !== '' &&
           (Array.isArray(localFilters[key as keyof StudyFilters]) 
             ? (localFilters[key as keyof StudyFilters] as any[]).length > 0 
             : true)
  ).length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 400 },
          maxWidth: '100%',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon color="primary" />
            <Typography variant="h6">Filters</Typography>
            {activeFilterCount > 0 && (
              <Chip
                label={activeFilterCount}
                size="small"
                color="primary"
              />
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Filters */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Stack spacing={3}>
            {/* Patient Information */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Patient Information</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Patient Name"
                    value={localFilters.patientName || ''}
                    onChange={(e) => handleFilterChange('patientName', e.target.value || undefined)}
                    placeholder="e.g., John Doe"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Patient ID"
                    value={localFilters.patientID || ''}
                    onChange={(e) => handleFilterChange('patientID', e.target.value || undefined)}
                    placeholder="e.g., PAT12345"
                    size="small"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Study Date Range */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Study Date</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Stack spacing={2}>
                    <DatePicker
                      label="From Date"
                      value={localFilters.studyDateFrom ? new Date(localFilters.studyDateFrom) : null}
                      onChange={(date) => {
                        const formatted = date ? date.toISOString().split('T')[0].replace(/-/g, '') : undefined;
                        handleFilterChange('studyDateFrom', formatted);
                      }}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                    <DatePicker
                      label="To Date"
                      value={localFilters.studyDateTo ? new Date(localFilters.studyDateTo) : null}
                      onChange={(date) => {
                        const formatted = date ? date.toISOString().split('T')[0].replace(/-/g, '') : undefined;
                        handleFilterChange('studyDateTo', formatted);
                      }}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Stack>
                </LocalizationProvider>
              </AccordionDetails>
            </Accordion>

            {/* Modality */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Modality</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {MODALITY_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.value}
                      onClick={() => handleModalityToggle(option.value)}
                      color={(localFilters.modality || []).includes(option.value) ? 'primary' : 'default'}
                      variant={(localFilters.modality || []).includes(option.value) ? 'filled' : 'outlined'}
                      size="small"
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Study Details */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Study Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Study Description"
                    value={localFilters.studyDescription || ''}
                    onChange={(e) => handleFilterChange('studyDescription', e.target.value || undefined)}
                    placeholder="e.g., Chest CT"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Accession Number"
                    value={localFilters.accessionNumber || ''}
                    onChange={(e) => handleFilterChange('accessionNumber', e.target.value || undefined)}
                    placeholder="e.g., ACC12345"
                    size="small"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </Box>

        {/* Footer Actions */}
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClear}
            disabled={activeFilterCount === 0}
          >
            Clear All
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default FilterPanel;
