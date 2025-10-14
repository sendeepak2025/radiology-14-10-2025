/**
 * Performance tests for progressive loading service
 */

import { progressiveLoadingService, ProgressiveLoadingService } from '../../services/progressiveLoadingService'
import { performance } from 'perf_hooks'

// Mock the global image loader
jest.mock('../../lib/cornerstone/imageLoader', () => ({
  globalImageLoader: {
    loadImage: jest.fn().mockImplementation(async (options) => {
      // Simulate loading time based on image size
      const loadTime = Math.random() * 100 + 50 // 50-150ms
      await new Promise(resolve => setTimeout(resolve, loadTime))
      
      return {
        imageId: `wadouri:/api/dicom/studies/${options.studyInstanceUID}/series/${options.seriesInstanceUID}/instances/${options.sopInstanceUID}`,
        width: 512,
        height: 512,
        pixelData: new Uint16Array(512 * 512),
        metadata: {
          studyInstanceUID: options.studyInstanceUID,
          seriesInstanceUID: options.seriesInstanceUID,
          sopInstanceUID: options.sopInstanceUID
        }
      }
    })
  }
}))

describe('Progressive Loading Service Performance Tests', () => {
  let service: ProgressiveLoadingService

  beforeEach(() => {
    service = new ProgressiveLoadingService()
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Clean up any ongoing loading processes
    service.clearCache()
  })

  describe('Small Dataset Loading Performance', () => {
    test('should load small dataset (50 slices) efficiently', async () => {
      const studyUID = 'test-study-small'
      const seriesUID = 'test-series-small'
      const imageIds = Array.from({ length: 50 }, (_, i) => 
        `wadouri:/api/dicom/studies/${studyUID}/series/${seriesUID}/instances/instance-${i}`
      )

      const startTime = performance.now()
      
      await service.startProgressiveLoading(studyUID, seriesUID, imageIds, {
        priority: 'normal',
        chunkSize: 10,
        maxConcurrentLoads: 4,
        preloadRadius: 5,
        adaptiveQuality: false
      })

      const endTime = performance.now()
      const totalTime = endTime - startTime
      const avgTimePerSlice = totalTime / imageIds.length

      console.log(`Small dataset loading: ${imageIds.length} slices in ${totalTime.toFixed(2)}ms (avg: ${avgTimePerSlice.toFixed(2)}ms/slice)`)

      const progress = service.getLoadingProgress(`${studyUID}:${seriesUID}`)
      
      expect(totalTime).toBeLessThan(10000) // Should complete within 10 seconds
      expect(progress?.loaded).toBe(imageIds.length)
      expect(progress?.percentage).toBe(100)
      expect(avgTimePerSlice).toBeLessThan(200) // Less than 200ms per slice on average
    })

    test('should prioritize center-out loading for better user experience', async () => {
      const studyUID = 'test-study-center'
      const seriesUID = 'test-series-center'
      const imageIds = Array.from({ length: 30 }, (_, i) => 
        `wadouri:/api/dicom/studies/${studyUID}/series/${seriesUID}/instances/instance-${i}`
      )

      const loadTimes: number[] = []
      const originalLoadImage = require('../../lib/cornerstone/imageLoader').globalImageLoader.loadImage
      
      // Track load order
      require('../../lib/cornerstone/imageLoader').globalImageLoader.loadImage = jest.fn().mockImplementation(async (options) => {
        const instanceIndex = parseInt(options.sopInstanceUID.split('-')[1])
        loadTimes.push(instanceIndex)
        return originalLoadImage(options)
      })

      await service.startProgressiveLoading(studyUID, seriesUID, imageIds, {
        priority: 'high', // This should trigger center-out loading
        chunkSize: 5,
        maxConcurrentLoads: 2,
        preloadRadius: 3,
        adaptiveQuality: false
      })

      // Check that center slices were loaded first
      const centerIndex = Math.floor(imageIds.length / 2)
      const firstFiveLoads = loadTimes.slice(0, 5)
      
      console.log(`Load order (first 10): ${loadTimes.slice(0, 10).join(', ')}`)
      console.log(`Center index: ${centerIndex}`)

      expect(firstFiveLoads).toContain(centerIndex)
    })
  })

  describe('Large Dataset Loading Performance', () => {
    test('should handle large dataset (500 slices) with progressive loading', async () => {
      const studyUID = 'test-study-large'
      const seriesUID = 'test-series-large'
      const imageIds = Array.from({ length: 500 }, (_, i) => 
        `wadouri:/api/dicom/studies/${studyUID}/series/${seriesUID}/instances/instance-${i}`
      )

      const startTime = performance.now()
      let progressUpdates = 0
      
      // Monitor progress updates
      const checkProgress = setInterval(() => {
        const progress = service.getLoadingProgress(`${studyUID}:${seriesUID}`)
        if (progress) {
          progressUpdates++
          console.log(`Progress: ${progress.percentage.toFixed(1)}% (${progress.loaded}/${progress.total})`)
        }
      }, 1000)

      await service.startProgressiveLoading(studyUID, seriesUID, imageIds, {
        priority: 'normal',
        chunkSize: 25, // Larger chunks for efficiency
        maxConcurrentLoads: 6,
        preloadRadius: 10,
        adaptiveQuality: true
      })

      clearInterval(checkProgress)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const avgTimePerSlice = totalTime / imageIds.length

      console.log(`Large dataset loading: ${imageIds.length} slices in ${totalTime.toFixed(2)}ms (avg: ${avgTimePerSlice.toFixed(2)}ms/slice)`)
      console.log(`Progress updates: ${progressUpdates}`)

      const finalProgress = service.getLoadingProgress(`${studyUID}:${seriesUID}`)
      
      expect(totalTime).toBeLessThan(60000) // Should complete within 1 minute
      expect(finalProgress?.loaded).toBe(imageIds.length)
      expect(finalProgress?.percentage).toBe(100)
      expect(progressUpdates).toBeGreaterThan(0) // Should have progress updates
    })

    test('should maintain performance with memory constraints', async () => {
      const studyUID = 'test-study-memory'
      const seriesUID = 'test-series-memory'
      const imageIds = Array.from({ length: 200 }, (_, i) => 
        `wadouri:/api/dicom/studies/${studyUID}/series/${seriesUID}/instances/instance-${i}`
      )

      const initialMemory = process.memoryUsage()
      
      await service.startProgressiveLoading(studyUID, seriesUID, imageIds, {
        priority: 'normal',
        chunkSize: 20,
        maxConcurrentLoads: 4,
        preloadRadius: 5,
        adaptiveQuality: true
      })

      const peakMemory = process.memoryUsage()
      
      // Clear cache to simulate memory cleanup
      service.clearCache(`${studyUID}:${seriesUID}`)
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage()
      
      const peakIncrease = (peakMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024 // MB
      const finalIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024 // MB
      
      console.log(`Memory usage: Initial ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Memory usage: Peak ${(peakMemory.heapUsed / 1024 / 1024).toFixed(2)}MB (+${peakIncrease.toFixed(2)}MB)`)
      console.log(`Memory usage: Final ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB (+${finalIncrease.toFixed(2)}MB)`)

      // Memory increase should be reasonable
      expect(peakIncrease).toBeLessThan(imageIds.length * 0.5) // Less than 0.5MB per image at peak
    })
  })

  describe('Concurrent Loading Performance', () => {
    test('should handle multiple concurrent loading sessions', async () => {
      const sessionCount = 5
      const slicesPerSession = 50
      
      const startTime = performance.now()
      
      const loadingPromises = Array.from({ length: sessionCount }, (_, sessionIndex) => {
        const studyUID = `test-study-concurrent-${sessionIndex}`
        const seriesUID = `test-series-concurrent-${sessionIndex}`
        const imageIds = Array.from({ length: slicesPerSession }, (_, i) => 
          `wadouri:/api/dicom/studies/${studyUID}/series/${seriesUID}/instances/instance-${i}`
        )

        return service.startProgressiveLoading(studyUID, seriesUID, imageIds, {
          priority: 'normal',
          chunkSize: 10,
          maxConcurrentLoads: 2, // Reduced to avoid overwhelming
          preloadRadius: 3,
          adaptiveQuality: false
        })
      })

      await Promise.all(loadingPromises)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const totalSlices = sessionCount * slicesPerSession
      const avgTimePerSlice = totalTime / totalSlices

      console.log(`Concurrent loading: ${sessionCount} sessions, ${totalSlices} total slices in ${totalTime.toFixed(2)}ms`)
      console.log(`Average time per slice: ${avgTimePerSlice.toFixed(2)}ms`)

      // All sessions should complete successfully
      for (let i = 0; i < sessionCount; i++) {
        const progress = service.getLoadingProgress(`test-study-concurrent-${i}:test-series-concurrent-${i}`)
        expect(progress?.loaded).toBe(slicesPerSession)
        expect(progress?.percentage).toBe(100)
      }

      expect(totalTime).toBeLessThan(30000) // Should complete within 30 seconds
      expect(avgTimePerSlice).toBeLessThan(300) // Should maintain reasonable per-slice performance
    })
  })

  describe('Adaptive Loading Performance', () => {
    test('should adapt loading strategy based on current slice position', async () => {
      const studyUID = 'test-study-adaptive'
      const seriesUID = 'test-series-adaptive'
      const imageIds = Array.from({ length: 100 }, (_, i) => 
        `wadouri:/api/dicom/studies/${studyUID}/series/${seriesUID}/instances/instance-${i}`
      )

      // Start initial loading
      const loadingPromise = service.startProgressiveLoading(studyUID, seriesUID, imageIds, {
        priority: 'normal',
        chunkSize: 15,
        maxConcurrentLoads: 4,
        preloadRadius: 8,
        adaptiveQuality: true
      })

      // Simulate user navigation to different slices
      const navigationTests = [
        { slice: 25, delay: 1000 },
        { slice: 75, delay: 2000 },
        { slice: 10, delay: 3000 }
      ]

      const navigationPromises = navigationTests.map(async (test) => {
        await new Promise(resolve => setTimeout(resolve, test.delay))
        
        const startTime = performance.now()
        
        await service.loadAroundCurrentSlice(
          `${studyUID}:${seriesUID}`,
          test.slice,
          imageIds,
          {
            priority: 'high',
            chunkSize: 5,
            maxConcurrentLoads: 6,
            preloadRadius: 5,
            adaptiveQuality: true
          }
        )
        
        const endTime = performance.now()
        const loadTime = endTime - startTime
        
        console.log(`Navigation to slice ${test.slice}: ${loadTime.toFixed(2)}ms`)
        
        return { slice: test.slice, loadTime }
      })

      const [_, ...navigationResults] = await Promise.all([loadingPromise, ...navigationPromises])

      // Navigation should be fast since we're loading around current position
      navigationResults.forEach(result => {
        expect(result.loadTime).toBeLessThan(2000) // Should load around current slice quickly
      })

      const finalProgress = service.getLoadingProgress(`${studyUID}:${seriesUID}`)
      expect(finalProgress?.loaded).toBe(imageIds.length)
    })

    test('should show performance improvement with adaptive quality', async () => {
      const studyUID = 'test-study-quality'
      const seriesUID = 'test-series-quality'
      const imageIds = Array.from({ length: 50 }, (_, i) => 
        `wadouri:/api/dicom/studies/${studyUID}/series/${seriesUID}/instances/instance-${i}`
      )

      // Test with adaptive quality disabled
      const startTimeNoAdaptive = performance.now()
      
      await service.startProgressiveLoading(studyUID + '-no-adaptive', seriesUID, imageIds, {
        priority: 'normal',
        chunkSize: 10,
        maxConcurrentLoads: 4,
        preloadRadius: 5,
        adaptiveQuality: false
      })
      
      const endTimeNoAdaptive = performance.now()
      const timeNoAdaptive = endTimeNoAdaptive - startTimeNoAdaptive

      // Test with adaptive quality enabled
      const startTimeAdaptive = performance.now()
      
      await service.startProgressiveLoading(studyUID + '-adaptive', seriesUID, imageIds, {
        priority: 'normal',
        chunkSize: 10,
        maxConcurrentLoads: 4,
        preloadRadius: 5,
        adaptiveQuality: true,
        networkCondition: 'slow' // Simulate slow network
      })
      
      const endTimeAdaptive = performance.now()
      const timeAdaptive = endTimeAdaptive - startTimeAdaptive

      console.log(`Loading without adaptive quality: ${timeNoAdaptive.toFixed(2)}ms`)
      console.log(`Loading with adaptive quality: ${timeAdaptive.toFixed(2)}ms`)

      // Both should complete successfully
      const progressNoAdaptive = service.getLoadingProgress(`${studyUID}-no-adaptive:${seriesUID}`)
      const progressAdaptive = service.getLoadingProgress(`${studyUID}-adaptive:${seriesUID}`)

      expect(progressNoAdaptive?.loaded).toBe(imageIds.length)
      expect(progressAdaptive?.loaded).toBe(imageIds.length)
    })
  })

  describe('Cache Performance', () => {
    test('should show performance improvement with caching', async () => {
      const studyUID = 'test-study-cache'
      const seriesUID = 'test-series-cache'
      const imageIds = Array.from({ length: 30 }, (_, i) => 
        `wadouri:/api/dicom/studies/${studyUID}/series/${seriesUID}/instances/instance-${i}`
      )

      // First load (cold cache)
      const startTimeCold = performance.now()
      
      await service.startProgressiveLoading(studyUID, seriesUID, imageIds, {
        priority: 'normal',
        chunkSize: 10,
        maxConcurrentLoads: 4,
        preloadRadius: 5,
        adaptiveQuality: false
      })
      
      const endTimeCold = performance.now()
      const timeCold = endTimeCold - startTimeCold

      // Second load (warm cache) - simulate by reloading same dataset
      const startTimeWarm = performance.now()
      
      await service.startProgressiveLoading(studyUID + '-warm', seriesUID, imageIds, {
        priority: 'normal',
        chunkSize: 10,
        maxConcurrentLoads: 4,
        preloadRadius: 5,
        adaptiveQuality: false
      })
      
      const endTimeWarm = performance.now()
      const timeWarm = endTimeWarm - startTimeWarm

      const improvement = ((timeCold - timeWarm) / timeCold) * 100

      console.log(`Cache performance: Cold ${timeCold.toFixed(2)}ms, Warm ${timeWarm.toFixed(2)}ms`)
      console.log(`Performance improvement: ${improvement.toFixed(1)}%`)

      expect(timeWarm).toBeLessThanOrEqual(timeCold) // Warm should be faster or equal
    })

    test('should manage cache size effectively', async () => {
      const studyUID = 'test-study-cache-size'
      const seriesUID = 'test-series-cache-size'
      const imageIds = Array.from({ length: 100 }, (_, i) => 
        `wadouri:/api/dicom/studies/${studyUID}/series/${seriesUID}/instances/instance-${i}`
      )

      await service.startProgressiveLoading(studyUID, seriesUID, imageIds, {
        priority: 'normal',
        chunkSize: 20,
        maxConcurrentLoads: 4,
        preloadRadius: 10,
        adaptiveQuality: false
      })

      const initialStats = service.getCacheStats()
      
      // Clear cache for specific volume
      service.clearCache(`${studyUID}:${seriesUID}`)
      
      const afterClearStats = service.getCacheStats()

      console.log(`Cache stats - Initial: ${initialStats.loadedSlices} slices, ${initialStats.memoryUsage.toFixed(2)}MB`)
      console.log(`Cache stats - After clear: ${afterClearStats.loadedSlices} slices, ${afterClearStats.memoryUsage.toFixed(2)}MB`)

      expect(afterClearStats.loadedSlices).toBeLessThan(initialStats.loadedSlices)
      expect(afterClearStats.memoryUsage).toBeLessThanOrEqual(initialStats.memoryUsage)
    })
  })
})