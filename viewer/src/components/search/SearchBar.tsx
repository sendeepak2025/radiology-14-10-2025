import React, { useState, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Box,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFilterClick?: () => void;
  placeholder?: string;
  initialValue?: string;
  showFilterButton?: boolean;
  activeFiltersCount?: number;
}

/**
 * Search Bar Component
 * Full-text search with debouncing and filter toggle
 */
const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onFilterClick,
  placeholder = 'Search patients, studies, or descriptions...',
  initialValue = '',
  showFilterButton = true,
  activeFiltersCount = 0,
}) => {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      onSearch(value);
    }, 500),
    [onSearch]
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setSearchValue('');
    onSearch('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSearch(searchValue);
    }
  };

  return (
    <Paper
      elevation={isFocused ? 3 : 1}
      sx={{
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s',
      }}
    >
      <TextField
        fullWidth
        value={searchValue}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        variant="outlined"
        size="medium"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {searchValue && (
                  <IconButton
                    size="small"
                    onClick={handleClear}
                    aria-label="clear search"
                  >
                    <ClearIcon />
                  </IconButton>
                )}
                {showFilterButton && (
                  <IconButton
                    color={activeFiltersCount > 0 ? 'primary' : 'default'}
                    onClick={onFilterClick}
                    aria-label="open filters"
                    sx={{ position: 'relative' }}
                  >
                    <FilterIcon />
                    {activeFiltersCount > 0 && (
                      <Chip
                        label={activeFiltersCount}
                        size="small"
                        color="primary"
                        sx={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          height: 20,
                          minWidth: 20,
                          fontSize: '0.65rem',
                        }}
                      />
                    )}
                  </IconButton>
                )}
              </Box>
            </InputAdornment>
          ),
          sx: {
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
          },
        }}
      />
    </Paper>
  );
};

export default SearchBar;
