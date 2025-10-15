import { useState, useEffect } from 'react';
import { StudyFilters } from '../components/search/FilterPanel';

interface SavedFilter {
  id: string;
  name: string;
  filters: StudyFilters;
  createdAt: string;
}

const STORAGE_KEY = 'savedStudyFilters';

/**
 * Custom hook for managing saved filter presets
 */
export const useSavedFilters = () => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Load saved filters from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSavedFilters(parsed);
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    }
  }, []);

  // Save filter preset
  const saveFilter = (name: string, filters: StudyFilters): SavedFilter => {
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return newFilter;
  };

  // Delete filter preset
  const deleteFilter = (id: string) => {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Update filter preset
  const updateFilter = (id: string, name: string, filters: StudyFilters) => {
    const updated = savedFilters.map((f) =>
      f.id === id ? { ...f, name, filters } : f
    );
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Clear all saved filters
  const clearAll = () => {
    setSavedFilters([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    updateFilter,
    clearAll,
  };
};
