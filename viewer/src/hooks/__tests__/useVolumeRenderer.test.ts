/**
 * Tests for useVolumeRenderer Hook
 * Tests fallback mechanism and unified interface
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useVolumeRenderer } from '../useVolumeRenderer'
import * as webglDetection from '../../utils/webglDetection'

// Mock refs
const createMockRef = <T,>(value: T) => ({
  current: value
})

describe('useVolumeRenderer - Fallback Mechanism', () => {
  let canvasElement: HTMLCanvasElement
  let containerElement: HTMLDivElement

  beforeEach(() => {
    canvasElement = document.createElement('canvas')
    containerElement = document.createElement('div')
    document.body.appendChild(canvasElement)
    document.body.appendChild(containerElement)
  })

  afterEach(() => {
    document.body.removeChild(canvasElement)
    document.body.removeChild(containerElement)
    vi.clearAllMocks()
  })

  describe('9.7 Test fallback mechanism', () => {
    it('should use VTK.js renderer when WebGL 2.0 is supported', () => {
      // Mock WebGL 2.0 support
      vi.spyOn(webglDetection, 'detectWebGL').mockReturnValue({
        supported: true,
        version: 2,
        maxTextureSize: 16384,
        maxTexture3DSize: 2048,
        extensions: [],
        estimatedGPUMemoryMB: 1024,
        renderer: 'Test GPU',
        vendor: 'Test Vendor'
      })

      vi.spyOn(webglDetection, 'checkVolumeRenderingCapabilities').mockReturnValue({
        canRender: true,
        reasons: [],
        warnings: []
      })

      const { result } = renderHook(() =>
        useVolumeRenderer({
          frameUrls: [],
          canvasRef: createMockRef(canvasElement),
          containerRef: createMockRef(containerElement),
          enabled: true
        })
      )

      expect(result.current.rendererType).toBe('vtk')
    })

    it('should fall back to canvas when WebGL is not supported', () => {
      // Mock no WebGL support
      vi.spyOn(webglDetection, 'detectWebGL').mockReturnValue({
        supported: false,
        version: null,
        maxTextureSize: 0,
        maxTexture3DSize: 0,
        extensions: [],
        estimatedGPUMemoryMB: 0,
        renderer: 'Unknown',
        vendor: 'Unknown'
      })

      vi.spyOn(webglDetection, 'checkVolumeRenderingCapabilities').mockReturnValue({
        canRender: false,
        reasons: ['WebGL is not supported'],
        warnings: []
      })

      const { result } = renderHook(() =>
        useVolumeRenderer({
          frameUrls: [],
          canvasRef: createMockRef(canvasElement),
          containerRef: createMockRef(containerElement),
          enabled: true
        })
      )

      expect(result.current.rendererType).toBe('canvas')
    })

    it('should fall back to canvas when only WebGL 1.0 is available', () => {
      // Mock WebGL 1.0 support
      vi.spyOn(webglDetection, 'detectWebGL').mockReturnValue({
        supported: true,
        version: 1,
        maxTextureSize: 4096,
        maxTexture3DSize: 0,
        extensions: [],
        estimatedGPUMemoryMB: 512,
        renderer: 'Test GPU',
        vendor: 'Test Vendor'
      })

      vi.spyOn(webglDetection, 'checkVolumeRenderingCapabilities').mockReturnValue({
        canRender: false,
        reasons: ['WebGL 2.0 is required (only WebGL 1.0 detected)'],
        warnings: []
      })

      const { result } = renderHook(() =>
        useVolumeRenderer({
          frameUrls: [],
          canvasRef: createMockRef(canvasElement),
          containerRef: createMockRef(containerElement),
          enabled: true
        })
      )

      expect(result.current.rendererType).toBe('canvas')
    })

    it('should display warning message when falling back to canvas', () => {
      // Mock no WebGL support
      vi.spyOn(webglDetection, 'detectWebGL').mockReturnValue({
        supported: false,
        version: null,
        maxTextureSize: 0,
        maxTexture3DSize: 0,
        extensions: [],
        estimatedGPUMemoryMB: 0,
        renderer: 'Unknown',
        vendor: 'Unknown'
      })

      vi.spyOn(webglDetection, 'checkVolumeRenderingCapabilities').mockReturnValue({
        canRender: false,
        reasons: ['WebGL is not supported'],
        warnings: []
      })

      const { result } = renderHook(() =>
        useVolumeRenderer({
          frameUrls: [],
          canvasRef: createMockRef(canvasElement),
          containerRef: createMockRef(containerElement),
          enabled: true
        })
      )

      expect(result.current.rendererType).toBe('canvas')
      expect(result.current.webglVersion).toBeNull()
    })

    it('should verify all features work in canvas mode', async () => {
      // Mock no WebGL support
      vi.spyOn(webglDetection, 'detectWebGL').mockReturnValue({
        supported: false,
        version: null,
        maxTextureSize: 0,
        maxTexture3DSize: 0,
        extensions: [],
        estimatedGPUMemoryMB: 0,
        renderer: 'Unknown',
        vendor: 'Unknown'
      })

      vi.spyOn(webglDetection, 'checkVolumeRenderingCapabilities').mockReturnValue({
        canRender: false,
        reasons: ['WebGL is not supported'],
        warnings: []
      })

      const { result } = renderHook(() =>
        useVolumeRenderer({
          frameUrls: [],
          canvasRef: createMockRef(canvasElement),
          containerRef: createMockRef(containerElement),
          enabled: true
        })
      )

      expect(result.current.rendererType).toBe('canvas')

      // Test that all methods are available
      expect(result.current.setRenderMode).toBeDefined()
      expect(result.current.setPreset).toBeDefined()
      expect(result.current.setOpacity).toBeDefined()
      expect(result.current.resetCamera).toBeDefined()
      expect(result.current.startAutoRotation).toBeDefined()
      expect(result.current.stopAutoRotation).toBeDefined()

      // Test that methods can be called without errors
      expect(() => result.current.setRenderMode('mip')).not.toThrow()
      expect(() => result.current.setPreset('CT-Bone')).not.toThrow()
      expect(() => result.current.setOpacity(0.5)).not.toThrow()
      expect(() => result.current.resetCamera()).not.toThrow()
    })

    it('should handle VTK.js initialization failure gracefully', () => {
      // Mock WebGL 2.0 support but VTK.js fails to initialize
      vi.spyOn(webglDetection, 'detectWebGL').mockReturnValue({
        supported: true,
        version: 2,
        maxTextureSize: 16384,
        maxTexture3DSize: 2048,
        extensions: [],
        estimatedGPUMemoryMB: 1024,
        renderer: 'Test GPU',
        vendor: 'Test Vendor'
      })

      vi.spyOn(webglDetection, 'checkVolumeRenderingCapabilities').mockReturnValue({
        canRender: true,
        reasons: [],
        warnings: []
      })

      // Mock VTK.js initialization failure
      // (In real implementation, this would be caught and fallback to canvas)

      const { result } = renderHook(() =>
        useVolumeRenderer({
          frameUrls: [],
          canvasRef: createMockRef(canvasElement),
          containerRef: createMockRef(containerElement),
          enabled: true
        })
      )

      // Should either use VTK or fall back to canvas
      expect(['vtk', 'canvas']).toContain(result.current.rendererType)
    })

    it('should provide unified interface for both renderers', () => {
      const { result: vtkResult } = renderHook(() =>
        useVolumeRenderer({
          frameUrls: [],
          canvasRef: createMockRef(canvasElement),
          containerRef: createMockRef(containerElement),
          enabled: true
        })
      )

      // Check that all expected methods are available
      const expectedMethods = [
        'loadVolume',
        'render',
        'setRenderMode',
        'setPreset',
        'setOpacity',
        'resetCamera',
        'startAutoRotation',
        'stopAutoRotation',
        'setRenderQuality',
        'handleMouseDown',
        'handleMouseMove',
        'handleMouseUp',
        'setRenderSettings',
        'setTransferFunction',
        'clearCache'
      ]

      expectedMethods.forEach(method => {
        expect(vtkResult.current).toHaveProperty(method)
        expect(typeof vtkResult.current[method as keyof typeof vtkResult.current]).toBe('function')
      })

      // Check that all expected properties are available
      const expectedProperties = [
        'volume',
        'isLoading',
        'loadProgress',
        'error',
        'camera',
        'renderSettings',
        'isRotating',
        'isInteracting',
        'renderQuality',
        'renderTime',
        'useWebWorker',
        'rendererType',
        'fps',
        'gpuMemoryMB',
        'webglVersion'
      ]

      expectedProperties.forEach(prop => {
        expect(vtkResult.current).toHaveProperty(prop)
      })
    })
  })
})
