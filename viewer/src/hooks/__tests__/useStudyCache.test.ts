import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useStudyCache } from '../useStudyCache'
import type { Study, WorklistResponse } from '@/types/worklist'

// Mock the worklistService
const mockWorklistService = {
  getWorklist: vi.fn(),
  getStudyDetails: vi.fn(),
  updateStudyPriority: vi.fn(),
  assignStudy: vi.fn(),
}

vi.mock('@/services/worklistService', () => ({
  worklistService: mockWorklistService,
}))

const mockStudy: Study = {
  studyInstanceUID: '1.2.3.4.5',
  patientID: 'P001',
  patientName: 'John Doe',
  studyDate: '2024-01-15',
  studyDescription: 'CT Chest',
  modality: 'CT',
  numberOfSeries: 3,
  numberOfInstances: 150,
  priority: 'ROUTINE',
  status: 'SCHEDULED',
  aiStatus: 'PENDING',
  createdAt: '2024-01-15T14:00:00Z',
  updatedAt: '2024-01-15T14:00:00Z',
}

const mockWorklistResponse: WorklistResponse = {
  studies: [mockStudy],
  total: 1,
  page: 1,
  pageSize: 20,
}

describe('useStudyCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useStudyCache())
    
    expect(result.current.studies).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('loads worklist successfully', async () => {
    mockWorklistService.getWorklist.mockResolvedValueOnce(mockWorklistResponse)
    
    const { result } = renderHook(() => useStudyCache())
    
    await act(async () => {
      await result.current.loadWorklist()
    })
    
    expect(result.current.studies).toEqual([mockStudy])
    expect(result.current.total).toBe(1)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('handles worklist loading error', async () => {
    const error = new Error('Failed to load worklist')
    mockWorklistService.getWorklist.mockRejectedValueOnce(error)
    
    const { result } = renderHook(() => useStudyCache())
    
    await act(async () => {
      await result.current.loadWorklist()
    })
    
    expect(result.current.studies).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Failed to load worklist')
  })

  it('caches studies after loading', async () => {
    mockWorklistService.getWorklist.mockResolvedValueOnce(mockWorklistResponse)
    
    const { result } = renderHook(() => useStudyCache())
    
    await act(async () => {
      await result.current.loadWorklist()
    })
    
    // Study should be cached
    const cachedStudy = result.current.getStudy(mockStudy.studyInstanceUID)
    expect(cachedStudy).toEqual(mockStudy)
  })

  it('loads individual study', async () => {
    mockWorklistService.getStudyDetails.mockResolvedValueOnce(mockStudy)
    
    const { result } = renderHook(() => useStudyCache())
    
    let loadedStudy: Study | null = null
    await act(async () => {
      loadedStudy = await result.current.loadStudy(mockStudy.studyInstanceUID)
    })
    
    expect(loadedStudy).toEqual(mockStudy)
    expect(mockWorklistService.getStudyDetails).toHaveBeenCalledWith(mockStudy.studyInstanceUID)
  })

  it('returns cached study without API call', async () => {
    mockWorklistService.getWorklist.mockResolvedValueOnce(mockWorklistResponse)
    
    const { result } = renderHook(() => useStudyCache())
    
    // Load worklist first to cache the study
    await act(async () => {
      await result.current.loadWorklist()
    })
    
    // Clear mock calls
    mockWorklistService.getStudyDetails.mockClear()
    
    // Load same study - should come from cache
    let cachedStudy: Study | null = null
    await act(async () => {
      cachedStudy = await result.current.loadStudy(mockStudy.studyInstanceUID)
    })
    
    expect(cachedStudy).toEqual(mockStudy)
    expect(mockWorklistService.getStudyDetails).not.toHaveBeenCalled()
  })

  it('updates study in cache and list', async () => {
    mockWorklistService.getWorklist.mockResolvedValueOnce(mockWorklistResponse)
    
    const { result } = renderHook(() => useStudyCache())
    
    await act(async () => {
      await result.current.loadWorklist()
    })
    
    const updates = { priority: 'URGENT' as const, status: 'IN_PROGRESS' as const }
    
    act(() => {
      result.current.updateStudy(mockStudy.studyInstanceUID, updates)
    })
    
    // Check updated in studies list
    expect(result.current.studies[0]).toMatchObject(updates)
    
    // Check updated in cache
    const cachedStudy = result.current.getStudy(mockStudy.studyInstanceUID)
    expect(cachedStudy).toMatchObject(updates)
  })

  it('refreshes worklist with last parameters', async () => {
    mockWorklistService.getWorklist.mockResolvedValueOnce(mockWorklistResponse)
    
    const { result } = renderHook(() => useStudyCache())
    
    const params = { page: 2, pageSize: 10, search: 'test' }
    
    await act(async () => {
      await result.current.loadWorklist(params)
    })
    
    // Clear mock calls
    mockWorklistService.getWorklist.mockClear()
    mockWorklistService.getWorklist.mockResolvedValueOnce(mockWorklistResponse)
    
    await act(async () => {
      await result.current.refreshWorklist()
    })
    
    expect(mockWorklistService.getWorklist).toHaveBeenCalledWith(params)
  })

  it('clears cache', async () => {
    mockWorklistService.getWorklist.mockResolvedValueOnce(mockWorklistResponse)
    
    const { result } = renderHook(() => useStudyCache())
    
    await act(async () => {
      await result.current.loadWorklist()
    })
    
    // Verify study is cached
    expect(result.current.getStudy(mockStudy.studyInstanceUID)).toEqual(mockStudy)
    
    act(() => {
      result.current.clearCache()
    })
    
    // Verify cache is cleared
    expect(result.current.getStudy(mockStudy.studyInstanceUID)).toBeNull()
  })

  it('provides cache statistics', async () => {
    mockWorklistService.getWorklist.mockResolvedValueOnce(mockWorklistResponse)
    
    const { result } = renderHook(() => useStudyCache())
    
    await act(async () => {
      await result.current.loadWorklist()
    })
    
    // Access cached study (hit)
    result.current.getStudy(mockStudy.studyInstanceUID)
    
    // Access non-existent study (miss)
    result.current.getStudy('non-existent')
    
    const stats = result.current.getCacheStats()
    
    expect(stats.size).toBe(1)
    expect(stats.hitRate).toBe(0.5) // 1 hit out of 2 attempts
  })

  it('evicts expired cache entries', async () => {
    const { result } = renderHook(() => 
      useStudyCache({ cacheTimeout: 1000 }) // 1 second timeout
    )
    
    mockWorklistService.getWorklist.mockResolvedValueOnce(mockWorklistResponse)
    
    await act(async () => {
      await result.current.loadWorklist()
    })
    
    // Verify study is cached
    expect(result.current.getStudy(mockStudy.studyInstanceUID)).toEqual(mockStudy)
    
    // Fast-forward time beyond cache timeout
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    
    // Study should be expired and not returned
    expect(result.current.getStudy(mockStudy.studyInstanceUID)).toBeNull()
  })

  it('limits cache size', async () => {
    const { result } = renderHook(() => 
      useStudyCache({ maxCacheSize: 2 })
    )
    
    // Create multiple studies
    const studies = Array.from({ length: 3 }, (_, i) => ({
      ...mockStudy,
      studyInstanceUID: `1.2.3.4.${i}`,
      patientID: `P00${i}`,
    }))
    
    // Load studies individually to cache them
    for (const study of studies) {
      mockWorklistService.getStudyDetails.mockResolvedValueOnce(study)
      await act(async () => {
        await result.current.loadStudy(study.studyInstanceUID)
      })
    }
    
    const stats = result.current.getCacheStats()
    expect(stats.size).toBeLessThanOrEqual(2) // Should not exceed max cache size
  })

  it('prefetches studies in background', async () => {
    const { result } = renderHook(() => useStudyCache())
    
    mockWorklistService.getStudyDetails.mockResolvedValueOnce(mockStudy)
    
    act(() => {
      result.current.prefetchStudy(mockStudy.studyInstanceUID)
    })
    
    await waitFor(() => {
      expect(mockWorklistService.getStudyDetails).toHaveBeenCalledWith(mockStudy.studyInstanceUID)
    })
  })

  it('does not prefetch already cached studies', async () => {
    mockWorklistService.getWorklist.mockResolvedValueOnce(mockWorklistResponse)
    
    const { result } = renderHook(() => useStudyCache())
    
    await act(async () => {
      await result.current.loadWorklist()
    })
    
    // Clear mock calls
    mockWorklistService.getStudyDetails.mockClear()
    
    act(() => {
      result.current.prefetchStudy(mockStudy.studyInstanceUID)
    })
    
    // Should not make API call since study is already cached
    expect(mockWorklistService.getStudyDetails).not.toHaveBeenCalled()
  })
})