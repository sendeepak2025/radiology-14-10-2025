import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../test/cornerstone-setup'

import { initializeCornerstone, isCornerStoneInitialized } from '../init'

describe('Cornerstone Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset initialization state
    const initModule = require('../init')
    initModule.isInitialized = false
  })

  describe('initializeCornerstone', () => {
    it('initializes all Cornerstone3D modules successfully', async () => {
      const { init: csRenderInit } = require('@cornerstonejs/core')
      const { init: csToolsInit } = require('@cornerstonejs/tools')
      const { init: dicomImageLoaderInit } = require('@cornerstonejs/dicom-image-loader')
      const { init: streamingImageVolumeLoaderInit } = require('@cornerstonejs/streaming-image-volume-loader')

      await initializeCornerstone()

      expect(csRenderInit).toHaveBeenCalledTimes(1)
      expect(csToolsInit).toHaveBeenCalledTimes(1)
      expect(dicomImageLoaderInit).toHaveBeenCalledTimes(1)
      expect(streamingImageVolumeLoaderInit).toHaveBeenCalledTimes(1)
    })

    it('configures DICOM image loader with correct options', async () => {
      const { init: dicomImageLoaderInit } = require('@cornerstonejs/dicom-image-loader')

      await initializeCornerstone()

      expect(dicomImageLoaderInit).toHaveBeenCalledWith({
        maxWebWorkers: navigator.hardwareConcurrency || 1,
        startWebWorkersOnDemand: false,
        taskConfiguration: {
          decodeTask: {
            initializeCodecsOnStartup: false,
            strict: false,
          },
        },
      })
    })

    it('sets up dicomParser on window object', async () => {
      await initializeCornerstone()

      expect(window.dicomParser).toBeDefined()
    })

    it('sets initialization state to true after successful initialization', async () => {
      await initializeCornerstone()

      expect(isCornerStoneInitialized()).toBe(true)
    })

    it('does not reinitialize if already initialized', async () => {
      const { init: csRenderInit } = require('@cornerstonejs/core')

      // First initialization
      await initializeCornerstone()
      expect(csRenderInit).toHaveBeenCalledTimes(1)

      // Second initialization should not call init again
      await initializeCornerstone()
      expect(csRenderInit).toHaveBeenCalledTimes(1)
    })

    it('throws error when core initialization fails', async () => {
      const { init: csRenderInit } = require('@cornerstonejs/core')
      const error = new Error('WebGL not supported')
      csRenderInit.mockRejectedValueOnce(error)

      await expect(initializeCornerstone()).rejects.toThrow('WebGL not supported')
    })

    it('throws error when tools initialization fails', async () => {
      const { init: csToolsInit } = require('@cornerstonejs/tools')
      const error = new Error('Tools initialization failed')
      csToolsInit.mockRejectedValueOnce(error)

      await expect(initializeCornerstone()).rejects.toThrow('Tools initialization failed')
    })

    it('handles hardware concurrency fallback', async () => {
      const originalHardwareConcurrency = navigator.hardwareConcurrency
      
      // Mock navigator.hardwareConcurrency as undefined
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: undefined,
        configurable: true,
      })

      const { init: dicomImageLoaderInit } = require('@cornerstonejs/dicom-image-loader')

      await initializeCornerstone()

      expect(dicomImageLoaderInit).toHaveBeenCalledWith(
        expect.objectContaining({
          maxWebWorkers: 1,
        })
      )

      // Restore original value
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: originalHardwareConcurrency,
        configurable: true,
      })
    })

    it('logs initialization progress', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await initializeCornerstone()

      expect(consoleSpy).toHaveBeenCalledWith('Cornerstone3D core initialized')
      expect(consoleSpy).toHaveBeenCalledWith('Cornerstone3D tools initialized')
      expect(consoleSpy).toHaveBeenCalledWith('DICOM image loader initialized')
      expect(consoleSpy).toHaveBeenCalledWith('Streaming image volume loader initialized')
      expect(consoleSpy).toHaveBeenCalledWith('Cornerstone3D initialization complete')

      consoleSpy.mockRestore()
    })

    it('logs error when initialization fails', async () => {
      const { init: csRenderInit } = require('@cornerstonejs/core')
      const error = new Error('Initialization failed')
      csRenderInit.mockRejectedValueOnce(error)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(initializeCornerstone()).rejects.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize Cornerstone3D:', error)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('isCornerStoneInitialized', () => {
    it('returns false initially', () => {
      expect(isCornerStoneInitialized()).toBe(false)
    })

    it('returns true after successful initialization', async () => {
      await initializeCornerstone()
      expect(isCornerStoneInitialized()).toBe(true)
    })

    it('returns false after failed initialization', async () => {
      const { init: csRenderInit } = require('@cornerstonejs/core')
      csRenderInit.mockRejectedValueOnce(new Error('Failed'))

      try {
        await initializeCornerstone()
      } catch {
        // Expected to fail
      }

      expect(isCornerStoneInitialized()).toBe(false)
    })
  })
})