import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import {
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';

interface QuickFilter {
  label: string;
  icon?: React.ReactNode;
  filter: any;
}

interface QuickFiltersProps {
  onFilterSelect: (filter: any) => void;
}

/**
 * Quick Filters Component
 * Pre-defined filter shortcuts for common searches
 */
const QuickFilters: React.FC<QuickFiltersProps> = ({ onFilterSelect }) => {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0].replace(/-/g, '');
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0].replace(/-/g, '');
  const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0].replace(/-/g, '');

  const quickFilters: QuickFilter[] = [
    {
      label: 'Today',
      icon: <TodayIcon fontSize="small" />,
      filter: { studyDateFrom: today, studyDateTo: today },
    },
    {
      label: 'Yesterday',
      icon: <TodayIcon fontSize="small" />,
      filter: { studyDateFrom: yesterday, studyDateTo: yesterday },
    },
    {
      label: 'Last 7 Days',
      icon: <DateRangeIcon fontSize="small" />,
      filter: { studyDateFrom: lastWeek },
    },
    {
      label: 'Last 30 Days',
      icon: <DateRangeIcon fontSize="small" />,
      filter: { studyDateFrom: lastMonth },
    },
    {
      label: 'CT Scans',
      icon: <CategoryIcon fontSize="small" />,
      filter: { modality: ['CT'] },
    },
    {
      label: 'MRI Scans',
      icon: <CategoryIcon fontSize="small" />,
      filter: { modality: ['MR'] },
    },
    {
      label: 'X-Rays',
      icon: <CategoryIcon fontSize="small" />,
      filter: { modality: ['CR', 'DX'] },
    },
    {
      label: 'Ultrasound',
      icon: <CategoryIcon fontSize="small" />,
      filter: { modality: ['US'] },
    },
  ];

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Quick Filters
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {quickFilters.map((quickFilter, index) => (
          <Chip
            key={index}
            label={quickFilter.label}
            icon={quickFilter.icon}
            onClick={() => onFilterSelect(quickFilter.filter)}
            variant="outlined"
            size="small"
            sx={{
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
              },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};

export default QuickFilters;
