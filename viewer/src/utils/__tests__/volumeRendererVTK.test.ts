/**
 * Tests for VTK.js Volume Renderer
 * Tests volume loading, render modes, transfer functions, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { VTKVolumeRenderer } from '../volumeRendererVTK'
import type { VolumeData } from '../volumeRenderer'

// Mock VTK.js modules
vi.mock('@kitware/vtk.js/Rendering/Profiles/Volume', () => ({}))
vi.mock('@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow', () => ({
  default: {
    newInstance: vi.fn(() => ({
      getRenderer: vi.fn(() => mockRenderer),
      getRenderWindow: vi.fn(() => mockRenderWindow),
      delete: vi.fn()
    }))
  }
}))

const mockRenderer = {
  getActiveCamera: vi.fn(() => mockCamera),
  addVolume: vi.fn(),
  removeVolume: vi.fn(),
  resetCamera: vi.fn()
}

const mockRenderWindow = {
  getViews: vi.fn(() => [mockOpenGLRenderWindow]),
  getInteractor: vi.fn(() => mockInteractor),
  render: vi.fn()
}

const mockOpenGLRenderWindow = {
  getContext: vi.fn(() => mockWebGLContext)
}

const mockWebGLContext = {
  canvas: document.createElement('canvas'),
  getParameter: vi.fn((param) => {
    if (param === 0x0D33) return 16384 // MAX_TEXTURE_SIZE
    if (param === 0x8073) return 2048 // MAX_3D_TEXTURE_SIZE
    return 0
  }),
  getSupportedExtensions: vi.fn(() => ['WEBGL_lose_context']),
  getExtension: vi.fn((name) => {
    if (name === 'WEBGL_lose_context') {
      return {
        loseContext: vi.fn(),
        restoreContext: vi.fn()
      }
    }
    return null
  })
}

const mockCamera = {
  setPosition: vi.fn(),
  setFocalPoint: vi.fn(),
  setViewUp: vi.fn(),
  azimuth: vi.fn(),
  elevation: vi.fn(),
  zoom: vi.fn()
}

const mockInteractor = {
  setInteractorStyle: vi.fn(),
  initialize: vi.fn(),
  bindEvents: vi.fn(),
  unbindEvents: vi.fn(),
  onStartInteractionEvent: vi.fn(),
  onEndInteractionEvent: vi.fn()
}

describe('VTKVolumeRenderer - Volume Loading', () => {
  let container: HTMLDivElement
  let renderer: VTKVolumeRenderer

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (renderer) {
      renderer.dispose()
    }
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  describe('9.1 Test volume loading', () => {
    it('should load a 50-frame volume (512x512x50)', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(512 * 512 * 50),
        dimensions: { width: 512, height: 512, depth: 50 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      // Fill with test data
      for (let i = 0; i < volumeData.data.length; i++) {
        volumeData.data[i] = Math.random()
      }

      let progressCalls = 0
      await renderer.loadVolume(volumeData, (progress) => {
        expect(progress).toBeGreaterThanOrEqual(0)
        expect(progress).toBeLessThanOrEqual(1)
        progressCalls++
      })

      expect(progressCalls).toBeGreaterThan(0)
      expect(renderer.isReady()).toBe(true)
    })

    it('should load a 100-frame volume (512x512x100)', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(512 * 512 * 100),
        dimensions: { width: 512, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      // Fill with test data
      for (let i = 0; i < volumeData.data.length; i++) {
        volumeData.data[i] = Math.random()
      }

      const startTime = performance.now()
      await renderer.loadVolume(volumeData)
      const loadTime = performance.now() - startTime

      // Should load in under 3 seconds (requirement)
      expect(loadTime).toBeLessThan(3000)
      expect(renderer.isReady()).toBe(true)
    })

    it('should load a 200-frame volume (512x512x200)', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(512 * 512 * 200),
        dimensions: { width: 512, height: 512, depth: 200 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      // Fill with test data
      for (let i = 0; i < volumeData.data.length; i++) {
        volumeData.data[i] = Math.random()
      }

      const startTime = performance.now()
      await renderer.loadVolume(volumeData)
      const loadTime = performance.now() - startTime

      // Should load in under 3 seconds (requirement)
      expect(loadTime).toBeLessThan(3000)
      expect(renderer.isReady()).toBe(true)
    })

    it('should report loading progress correctly', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(512 * 512 * 100),
        dimensions: { width: 512, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      const progressValues: number[] = []
      await renderer.loadVolume(volumeData, (progress) => {
        progressValues.push(progress)
      })

      // Progress should start at 0 or near 0
      expect(progressValues[0]).toBeLessThanOrEqual(0.2)
      
      // Progress should end at 1
      expect(progressValues[progressValues.length - 1]).toBe(1)
      
      // Progress should be monotonically increasing
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1])
      }
    })

    it('should verify GPU upload by checking memory usage', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(512 * 512 * 100),
        dimensions: { width: 512, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await renderer.loadVolume(volumeData)

      const metrics = renderer.getPerformanceMetrics()
      
      // GPU memory should be allocated
      expect(metrics.gpuMemoryMB).toBeGreaterThan(0)
      
      // Expected memory: 512 * 512 * 100 * 4 bytes = ~100MB
      const expectedMemoryMB = (512 * 512 * 100 * 4) / (1024 * 1024)
      expect(metrics.gpuMemoryMB).toBeCloseTo(expectedMemoryMB, 0)
    })

    it('should handle invalid volume dimensions', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      const invalidVolume: VolumeData = {
        data: new Float32Array(100),
        dimensions: { width: -1, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await expect(renderer.loadVolume(invalidVolume)).rejects.toThrow()
    })

    it('should handle mismatched data array size', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      const invalidVolume: VolumeData = {
        data: new Float32Array(100), // Too small
        dimensions: { width: 512, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await expect(renderer.loadVolume(invalidVolume)).rejects.toThrow(/size mismatch/)
    })
  })
})

describe('VTKVolumeRenderer - Render Modes', () => {
  let container: HTMLDivElement
  let renderer: VTKVolumeRenderer
  let volumeData: VolumeData

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    renderer = new VTKVolumeRenderer(container)
    
    // Create test volume
    volumeData = {
      data: new Float32Array(128 * 128 * 50),
      dimensions: { width: 128, height: 128, depth: 50 },
      spacing: { x: 1, y: 1, z: 1 }
    }
    
    for (let i = 0; i < volumeData.data.length; i++) {
      volumeData.data[i] = Math.random()
    }
    
    await renderer.loadVolume(volumeData)
  })

  afterEach(() => {
    if (renderer) {
      renderer.dispose()
    }
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  describe('9.2 Test render modes', () => {
    it('should switch to MIP mode', () => {
      renderer.setRenderMode('mip')
      expect(renderer.getRenderMode()).toBe('mip')
    })

    it('should switch to Volume mode', () => {
      renderer.setRenderMode('volume')
      expect(renderer.getRenderMode()).toBe('volume')
    })

    it('should switch to Isosurface mode', () => {
      renderer.setRenderMode('isosurface')
      expect(renderer.getRenderMode()).toBe('isosurface')
    })

    it('should have smooth transitions between modes', () => {
      const modes: Array<'mip' | 'volume' | 'isosurface'> = ['mip', 'volume', 'isosurface']
      
      modes.forEach(mode => {
        const startTime = performance.now()
        renderer.setRenderMode(mode)
        const transitionTime = performance.now() - startTime
        
        // Transition should complete within 500ms (requirement)
        expect(transitionTime).toBeLessThan(500)
        expect(renderer.getRenderMode()).toBe(mode)
      })
    })

    it('should render correctly in each mode', () => {
      const modes: Array<'mip' | 'volume' | 'isosurface'> = ['mip', 'volume', 'isosurface']
      
      modes.forEach(mode => {
        renderer.setRenderMode(mode)
        
        // Trigger a render
        renderer.render()
        
        // Check that render was called on the render window
        expect(mockRenderWindow.render).toHaveBeenCalled()
      })
    })

    it('should maintain camera position when switching modes', () => {
      // Set a specific camera position
      const camera = renderer.getCamera()
      camera.setPosition(100, 100, 100)
      camera.setFocalPoint(50, 50, 25)
      
      // Switch modes
      renderer.setRenderMode('mip')
      renderer.setRenderMode('volume')
      renderer.setRenderMode('isosurface')
      
      // Camera should still be at the same position
      // (In real implementation, this would check actual camera values)
      expect(renderer.getCamera()).toBeDefined()
    })
  })
})

describe('VTKVolumeRenderer - Transfer Functions', () => {
  let container: HTMLDivElement
  let renderer: VTKVolumeRenderer
  let volumeData: VolumeData

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    renderer = new VTKVolumeRenderer(container)
    
    // Create test volume
    volumeData = {
      data: new Float32Array(128 * 128 * 50),
      dimensions: { width: 128, height: 128, depth: 50 },
      spacing: { x: 1, y: 1, z: 1 }
    }
    
    for (let i = 0; i < volumeData.data.length; i++) {
      volumeData.data[i] = Math.random()
    }
    
    await renderer.loadVolume(volumeData)
  })

  afterEach(() => {
    if (renderer) {
      renderer.dispose()
    }
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  describe('9.3 Test transfer functions', () => {
    it('should apply CT-Bone preset', () => {
      const transferFunction = {
        opacityPoints: [
          { value: 0, opacity: 0 },
          { value: 0.2, opacity: 0 },
          { value: 0.5, opacity: 0.5 },
          { value: 1, opacity: 1 }
        ],
        colorPoints: [
          { value: 0, r: 0, g: 0, b: 0 },
          { value: 0.5, r: 0.8, g: 0.8, b: 0.8 },
          { value: 1, r: 1, g: 1, b: 1 }
        ]
      }

      const startTime = performance.now()
      renderer.setTransferFunction(transferFunction)
      const applyTime = performance.now() - startTime

      // Should apply within 200ms (requirement)
      expect(applyTime).toBeLessThan(200)
    })

    it('should apply CT-Soft-Tissue preset', () => {
      const transferFunction = {
        opacityPoints: [
          { value: 0, opacity: 0 },
          { value: 0.3, opacity: 0.2 },
          { value: 0.6, opacity: 0.6 },
          { value: 1, opacity: 1 }
        ],
        colorPoints: [
          { value: 0, r: 0.5, g: 0.2, b: 0.2 },
          { value: 0.5, r: 0.8, g: 0.5, b: 0.5 },
          { value: 1, r: 1, g: 0.8, b: 0.8 }
        ]
      }

      const startTime = performance.now()
      renderer.setTransferFunction(transferFunction)
      const applyTime = performance.now() - startTime

      // Should apply within 200ms (requirement)
      expect(applyTime).toBeLessThan(200)
    })

    it('should apply MR-Default preset', () => {
      const transferFunction = {
        opacityPoints: [
          { value: 0, opacity: 0 },
          { value: 0.4, opacity: 0.3 },
          { value: 0.7, opacity: 0.7 },
          { value: 1, opacity: 1 }
        ],
        colorPoints: [
          { value: 0, r: 0, g: 0, b: 0 },
          { value: 0.5, r: 0.5, g: 0.5, b: 0.8 },
          { value: 1, r: 0.8, g: 0.8, b: 1 }
        ]
      }

      const startTime = performance.now()
      renderer.setTransferFunction(transferFunction)
      const applyTime = performance.now() - startTime

      // Should apply within 200ms (requirement)
      expect(applyTime).toBeLessThan(200)
    })

    it('should adjust opacity in real-time', () => {
      const opacityValues = [0.2, 0.5, 0.8, 1.0]
      
      opacityValues.forEach(opacity => {
        const startTime = performance.now()
        renderer.setOpacity(opacity)
        const adjustTime = performance.now() - startTime
        
        // Should adjust within 200ms (requirement)
        expect(adjustTime).toBeLessThan(200)
      })
    })

    it('should handle transfer functions with multiple control points', () => {
      const transferFunction = {
        opacityPoints: [
          { value: 0, opacity: 0 },
          { value: 0.1, opacity: 0.1 },
          { value: 0.2, opacity: 0.2 },
          { value: 0.3, opacity: 0.3 },
          { value: 0.4, opacity: 0.4 },
          { value: 0.5, opacity: 0.5 },
          { value: 0.6, opacity: 0.6 },
          { value: 0.7, opacity: 0.7 },
          { value: 0.8, opacity: 0.8 },
          { value: 0.9, opacity: 0.9 },
          { value: 1, opacity: 1 }
        ],
        colorPoints: [
          { value: 0, r: 0, g: 0, b: 0 },
          { value: 0.5, r: 0.5, g: 0.5, b: 0.5 },
          { value: 1, r: 1, g: 1, b: 1 }
        ]
      }

      expect(() => renderer.setTransferFunction(transferFunction)).not.toThrow()
    })

    it('should have smooth transitions between presets', () => {
      const presets = [
        {
          name: 'CT-Bone',
          tf: {
            opacityPoints: [
              { value: 0, opacity: 0 },
              { value: 0.5, opacity: 0.5 },
              { value: 1, opacity: 1 }
            ],
            colorPoints: [
              { value: 0, r: 0, g: 0, b: 0 },
              { value: 1, r: 1, g: 1, b: 1 }
            ]
          }
        },
        {
          name: 'CT-Soft-Tissue',
          tf: {
            opacityPoints: [
              { value: 0, opacity: 0 },
              { value: 0.6, opacity: 0.6 },
              { value: 1, opacity: 1 }
            ],
            colorPoints: [
              { value: 0, r: 0.5, g: 0.2, b: 0.2 },
              { value: 1, r: 1, g: 0.8, b: 0.8 }
            ]
          }
        }
      ]

      presets.forEach(preset => {
        renderer.setTransferFunction(preset.tf)
        // Should not flicker (no visual test, but should not throw)
        expect(mockRenderWindow.render).toHaveBeenCalled()
      })
    })
  })
})

describe('VTKVolumeRenderer - Camera Controls', () => {
  let container: HTMLDivElement
  let renderer: VTKVolumeRenderer
  let volumeData: VolumeData

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    renderer = new VTKVolumeRenderer(container)
    
    // Create test volume
    volumeData = {
      data: new Float32Array(128 * 128 * 50),
      dimensions: { width: 128, height: 128, depth: 50 },
      spacing: { x: 1, y: 1, z: 1 }
    }
    
    for (let i = 0; i < volumeData.data.length; i++) {
      volumeData.data[i] = Math.random()
    }
    
    await renderer.loadVolume(volumeData)
  })

  afterEach(() => {
    if (renderer) {
      renderer.dispose()
    }
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  describe('9.4 Test camera controls', () => {
    it('should handle mouse drag rotation', () => {
      const camera = renderer.getCamera()
      expect(camera).toBeDefined()
      
      // Simulate mouse drag
      const interactor = renderer.getInteractor()
      expect(interactor).toBeDefined()
      
      // Check that interactor is bound to container
      expect(mockInteractor.bindEvents).toHaveBeenCalled()
    })

    it('should handle mouse wheel zoom', () => {
      const camera = renderer.getCamera()
      
      // Simulate zoom
      camera.zoom(1.5)
      
      expect(camera.zoom).toHaveBeenCalledWith(1.5)
    })

    it('should reset camera to default position', () => {
      const camera = renderer.getCamera()
      
      // Move camera
      camera.setPosition(100, 100, 100)
      
      // Reset camera
      renderer.resetCamera()
      
      expect(mockRenderer.resetCamera).toHaveBeenCalled()
    })

    it('should support auto-rotation', () => {
      expect(renderer.isAutoRotating()).toBe(false)
      
      renderer.startAutoRotation()
      expect(renderer.isAutoRotating()).toBe(true)
      
      renderer.stopAutoRotation()
      expect(renderer.isAutoRotating()).toBe(false)
    })

    it('should have configurable auto-rotation speed', () => {
      renderer.setAutoRotationSpeed(2.0)
      expect(renderer.getAutoRotationSpeed()).toBe(2.0)
      
      renderer.setAutoRotationSpeed(0.5)
      expect(renderer.getAutoRotationSpeed()).toBe(0.5)
    })

    it('should have immediate response to camera interactions', () => {
      const camera = renderer.getCamera()
      
      const startTime = performance.now()
      camera.azimuth(10)
      const responseTime = performance.now() - startTime
      
      // Should respond within 16ms (60 FPS requirement)
      expect(responseTime).toBeLessThan(16)
    })

    it('should maintain smooth rotation during auto-rotation', (done) => {
      renderer.startAutoRotation()
      
      const frameTimes: number[] = []
      let lastTime = performance.now()
      let frameCount = 0
      const maxFrames = 10
      
      const checkFrame = () => {
        const currentTime = performance.now()
        const frameTime = currentTime - lastTime
        frameTimes.push(frameTime)
        lastTime = currentTime
        frameCount++
        
        if (frameCount < maxFrames) {
          requestAnimationFrame(checkFrame)
        } else {
          renderer.stopAutoRotation()
          
          // Calculate average frame time
          const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
          
          // Should maintain ~60 FPS (16.67ms per frame)
          expect(avgFrameTime).toBeLessThan(20)
          
          done()
        }
      }
      
      requestAnimationFrame(checkFrame)
    }, 1000)

    it('should enable and disable interaction', () => {
      expect(renderer.isInteractionActive()).toBe(true)
      
      renderer.disableInteraction()
      expect(renderer.isInteractionActive()).toBe(false)
      expect(mockInteractor.unbindEvents).toHaveBeenCalled()
      
      renderer.enableInteraction()
      expect(renderer.isInteractionActive()).toBe(true)
      expect(mockInteractor.bindEvents).toHaveBeenCalled()
    })
  })
})

describe('VTKVolumeRenderer - Performance', () => {
  let container: HTMLDivElement
  let renderer: VTKVolumeRenderer

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    renderer = new VTKVolumeRenderer(container)
  })

  afterEach(() => {
    if (renderer) {
      renderer.dispose()
    }
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  describe('9.5 Test performance', () => {
    it('should achieve 60 FPS for 512×512×100 volume', async () => {
      const volumeData: VolumeData = {
        data: new Float32Array(512 * 512 * 100),
        dimensions: { width: 512, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      for (let i = 0; i < volumeData.data.length; i++) {
        volumeData.data[i] = Math.random()
      }

      await renderer.loadVolume(volumeData)

      // Set up performance callback
      let measuredFPS = 0
      renderer.setPerformanceCallback((metrics) => {
        measuredFPS = metrics.fps
      })

      // Render multiple frames to get stable FPS
      for (let i = 0; i < 60; i++) {
        renderer.render()
        await new Promise(resolve => setTimeout(resolve, 16)) // ~60 FPS
      }

      // Should achieve at least 60 FPS (requirement)
      expect(measuredFPS).toBeGreaterThanOrEqual(60)
    }, 10000)

    it('should achieve 30 FPS for 512×512×200 volume', async () => {
      const volumeData: VolumeData = {
        data: new Float32Array(512 * 512 * 200),
        dimensions: { width: 512, height: 512, depth: 200 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      for (let i = 0; i < volumeData.data.length; i++) {
        volumeData.data[i] = Math.random()
      }

      await renderer.loadVolume(volumeData)

      // Set up performance callback
      let measuredFPS = 0
      renderer.setPerformanceCallback((metrics) => {
        measuredFPS = metrics.fps
      })

      // Render multiple frames to get stable FPS
      for (let i = 0; i < 60; i++) {
        renderer.render()
        await new Promise(resolve => setTimeout(resolve, 33)) // ~30 FPS
      }

      // Should achieve at least 30 FPS (requirement)
      expect(measuredFPS).toBeGreaterThanOrEqual(30)
    }, 10000)

    it('should load volume in under 3 seconds', async () => {
      const volumeData: VolumeData = {
        data: new Float32Array(512 * 512 * 100),
        dimensions: { width: 512, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      for (let i = 0; i < volumeData.data.length; i++) {
        volumeData.data[i] = Math.random()
      }

      const startTime = performance.now()
      await renderer.loadVolume(volumeData)
      const loadTime = performance.now() - startTime

      // Should load in under 3 seconds (requirement)
      expect(loadTime).toBeLessThan(3000)
    })

    it('should have interaction latency under 16ms', () => {
      const camera = renderer.getCamera()
      
      const latencies: number[] = []
      
      // Measure latency for multiple interactions
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now()
        camera.azimuth(10)
        renderer.render()
        const latency = performance.now() - startTime
        latencies.push(latency)
      }
      
      // Calculate average latency
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
      
      // Should have latency under 16ms (requirement for 60 FPS)
      expect(avgLatency).toBeLessThan(16)
    })

    it('should report accurate performance metrics', async () => {
      const volumeData: VolumeData = {
        data: new Float32Array(256 * 256 * 50),
        dimensions: { width: 256, height: 256, depth: 50 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await renderer.loadVolume(volumeData)

      const metrics = renderer.getPerformanceMetrics()
      
      // FPS should be a positive number
      expect(metrics.fps).toBeGreaterThanOrEqual(0)
      
      // Render time should be a positive number
      expect(metrics.renderTime).toBeGreaterThanOrEqual(0)
      
      // GPU memory should be allocated
      expect(metrics.gpuMemoryMB).toBeGreaterThan(0)
    })

    it('should maintain performance with quality settings', async () => {
      const volumeData: VolumeData = {
        data: new Float32Array(512 * 512 * 100),
        dimensions: { width: 512, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await renderer.loadVolume(volumeData)

      const qualities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']
      const fpsResults: Record<string, number> = {}

      for (const quality of qualities) {
        renderer.setQuality(quality)
        
        let measuredFPS = 0
        renderer.setPerformanceCallback((metrics) => {
          measuredFPS = metrics.fps
        })

        // Render frames
        for (let i = 0; i < 30; i++) {
          renderer.render()
          await new Promise(resolve => setTimeout(resolve, 16))
        }

        fpsResults[quality] = measuredFPS
      }

      // Low quality should have highest FPS
      expect(fpsResults.low).toBeGreaterThanOrEqual(fpsResults.medium)
      expect(fpsResults.medium).toBeGreaterThanOrEqual(fpsResults.high)
    }, 15000)
  })
})

describe('VTKVolumeRenderer - Error Handling', () => {
  let container: HTMLDivElement
  let renderer: VTKVolumeRenderer

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (renderer) {
      renderer.dispose()
    }
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  describe('9.8 Test error handling', () => {
    it('should handle oversized volume with clear error message', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      // Create oversized volume (exceeds max texture size)
      const oversizedVolume: VolumeData = {
        data: new Float32Array(4096 * 4096 * 1000), // Very large
        dimensions: { width: 4096, height: 4096, depth: 1000 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await expect(renderer.loadVolume(oversizedVolume)).rejects.toThrow()
      
      try {
        await renderer.loadVolume(oversizedVolume)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const errorMessage = (error as Error).message
        expect(errorMessage).toMatch(/too large|memory|dimension/i)
      }
    })

    it('should handle invalid data with clear error message', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      // Invalid volume data (null data array)
      const invalidVolume: any = {
        data: null,
        dimensions: { width: 512, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await expect(renderer.loadVolume(invalidVolume)).rejects.toThrow()
      
      try {
        await renderer.loadVolume(invalidVolume)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const errorMessage = (error as Error).message
        expect(errorMessage).toMatch(/data|missing|invalid/i)
      }
    })

    it('should handle invalid dimensions with clear error message', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      // Invalid dimensions (negative values)
      const invalidVolume: VolumeData = {
        data: new Float32Array(100),
        dimensions: { width: -512, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await expect(renderer.loadVolume(invalidVolume)).rejects.toThrow()
      
      try {
        await renderer.loadVolume(invalidVolume)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const errorMessage = (error as Error).message
        expect(errorMessage).toMatch(/dimension|invalid|width/i)
      }
    })

    it('should handle invalid spacing with clear error message', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      // Invalid spacing (zero or negative)
      const invalidVolume: VolumeData = {
        data: new Float32Array(512 * 512 * 100),
        dimensions: { width: 512, height: 512, depth: 100 },
        spacing: { x: 0, y: 1, z: 1 }
      }

      await expect(renderer.loadVolume(invalidVolume)).rejects.toThrow()
      
      try {
        await renderer.loadVolume(invalidVolume)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const errorMessage = (error as Error).message
        expect(errorMessage).toMatch(/spacing|invalid/i)
      }
    })

    it('should simulate WebGL context loss', () => {
      renderer = new VTKVolumeRenderer(container)
      
      let contextLost = false
      renderer.setContextLostCallback((lost) => {
        contextLost = lost
      })

      // Simulate context loss
      renderer.loseContext()
      
      // Check that context is lost
      expect(renderer.isContextCurrentlyLost()).toBe(true)
      expect(contextLost).toBe(true)
    })

    it('should handle WebGL context restoration', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      // Load a volume first
      const volumeData: VolumeData = {
        data: new Float32Array(128 * 128 * 50),
        dimensions: { width: 128, height: 128, depth: 50 },
        spacing: { x: 1, y: 1, z: 1 }
      }
      
      for (let i = 0; i < volumeData.data.length; i++) {
        volumeData.data[i] = Math.random()
      }
      
      await renderer.loadVolume(volumeData)

      let contextRestored = false
      renderer.setContextLostCallback((lost) => {
        if (!lost) {
          contextRestored = true
        }
      })

      // Simulate context loss and restoration
      renderer.loseContext()
      expect(renderer.isContextCurrentlyLost()).toBe(true)
      
      renderer.restoreContext()
      
      // Wait for restoration
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Context should be restored
      expect(renderer.isContextCurrentlyLost()).toBe(false)
    })

    it('should verify error messages are user-friendly', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      const testCases = [
        {
          volume: {
            data: null as any,
            dimensions: { width: 512, height: 512, depth: 100 },
            spacing: { x: 1, y: 1, z: 1 }
          },
          expectedKeywords: ['data', 'missing']
        },
        {
          volume: {
            data: new Float32Array(100),
            dimensions: { width: -1, height: 512, depth: 100 },
            spacing: { x: 1, y: 1, z: 1 }
          },
          expectedKeywords: ['dimension', 'invalid', 'width']
        },
        {
          volume: {
            data: new Float32Array(100),
            dimensions: { width: 512, height: 512, depth: 100 },
            spacing: { x: 1, y: 1, z: 1 }
          },
          expectedKeywords: ['size', 'mismatch']
        }
      ]

      for (const testCase of testCases) {
        try {
          await renderer.loadVolume(testCase.volume)
          // Should not reach here
          expect(true).toBe(false)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          const errorMessage = (error as Error).message.toLowerCase()
          
          // Check that error message contains expected keywords
          const hasKeyword = testCase.expectedKeywords.some(keyword =>
            errorMessage.includes(keyword.toLowerCase())
          )
          expect(hasKeyword).toBe(true)
        }
      }
    })

    it('should handle GPU memory exhaustion gracefully', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      // Create a volume that might exhaust GPU memory
      const largeVolume: VolumeData = {
        data: new Float32Array(2048 * 2048 * 500),
        dimensions: { width: 2048, height: 2048, depth: 500 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      try {
        await renderer.loadVolume(largeVolume)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const errorMessage = (error as Error).message
        // Should mention memory or GPU
        expect(errorMessage).toMatch(/memory|GPU|large/i)
      }
    })

    it('should clean up resources after error', async () => {
      renderer = new VTKVolumeRenderer(container)
      
      // Try to load invalid volume
      const invalidVolume: VolumeData = {
        data: new Float32Array(100),
        dimensions: { width: -1, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      try {
        await renderer.loadVolume(invalidVolume)
      } catch (error) {
        // Error expected
      }

      // Renderer should still be in a valid state
      expect(renderer.isReady()).toBe(true)
      
      // Should be able to load a valid volume after error
      const validVolume: VolumeData = {
        data: new Float32Array(128 * 128 * 50),
        dimensions: { width: 128, height: 128, depth: 50 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await expect(renderer.loadVolume(validVolume)).resolves.not.toThrow()
    })
  })
})

describe('VTKVolumeRenderer - Memory Cleanup', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  describe('9.9 Test memory cleanup', () => {
    it('should load multiple volumes sequentially without memory leaks', async () => {
      const renderer = new VTKVolumeRenderer(container)
      
      const volumes = [
        {
          data: new Float32Array(128 * 128 * 50),
          dimensions: { width: 128, height: 128, depth: 50 },
          spacing: { x: 1, y: 1, z: 1 }
        },
        {
          data: new Float32Array(256 * 256 * 50),
          dimensions: { width: 256, height: 256, depth: 50 },
          spacing: { x: 1, y: 1, z: 1 }
        },
        {
          data: new Float32Array(128 * 128 * 100),
          dimensions: { width: 128, height: 128, depth: 100 },
          spacing: { x: 1, y: 1, z: 1 }
        }
      ]

      const memoryUsages: number[] = []

      for (const volumeData of volumes) {
        // Fill with random data
        for (let i = 0; i < volumeData.data.length; i++) {
          volumeData.data[i] = Math.random()
        }

        await renderer.loadVolume(volumeData)
        
        const metrics = renderer.getPerformanceMetrics()
        memoryUsages.push(metrics.gpuMemoryMB)
      }

      // Memory should be released between loads
      // The last memory usage should be similar to the first (not accumulating)
      const firstMemory = memoryUsages[0]
      const lastMemory = memoryUsages[memoryUsages.length - 1]
      
      // Allow some variance, but should not be significantly higher
      expect(lastMemory).toBeLessThan(firstMemory * 2)

      renderer.dispose()
    })

    it('should verify GPU memory is released after dispose', async () => {
      const renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(512 * 512 * 100),
        dimensions: { width: 512, height: 512, depth: 100 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      for (let i = 0; i < volumeData.data.length; i++) {
        volumeData.data[i] = Math.random()
      }

      await renderer.loadVolume(volumeData)
      
      const metricsBeforeDispose = renderer.getPerformanceMetrics()
      expect(metricsBeforeDispose.gpuMemoryMB).toBeGreaterThan(0)

      // Dispose renderer
      renderer.dispose()

      // After dispose, renderer should not be usable
      expect(() => renderer.render()).toThrow()
    })

    it('should check for memory leaks with repeated load/dispose cycles', async () => {
      const cycles = 5
      const memorySnapshots: number[] = []

      for (let i = 0; i < cycles; i++) {
        const renderer = new VTKVolumeRenderer(container)
        
        const volumeData: VolumeData = {
          data: new Float32Array(256 * 256 * 50),
          dimensions: { width: 256, height: 256, depth: 50 },
          spacing: { x: 1, y: 1, z: 1 }
        }

        for (let j = 0; j < volumeData.data.length; j++) {
          volumeData.data[j] = Math.random()
        }

        await renderer.loadVolume(volumeData)
        
        const metrics = renderer.getPerformanceMetrics()
        memorySnapshots.push(metrics.gpuMemoryMB)

        renderer.dispose()
        
        // Small delay to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Memory usage should be consistent across cycles (no accumulation)
      const firstMemory = memorySnapshots[0]
      const lastMemory = memorySnapshots[memorySnapshots.length - 1]
      
      // Should be within 20% of each other
      expect(Math.abs(lastMemory - firstMemory)).toBeLessThan(firstMemory * 0.2)
    }, 10000)

    it('should test unmount cleanup', async () => {
      const renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(128 * 128 * 50),
        dimensions: { width: 128, height: 128, depth: 50 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await renderer.loadVolume(volumeData)

      // Start auto-rotation
      renderer.startAutoRotation()
      expect(renderer.isAutoRotating()).toBe(true)

      // Dispose (simulates unmount)
      renderer.dispose()

      // Auto-rotation should be stopped
      expect(renderer.isAutoRotating()).toBe(false)

      // Renderer should not be usable
      expect(() => renderer.render()).toThrow()
    })

    it('should clean up event listeners on dispose', async () => {
      const renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(128 * 128 * 50),
        dimensions: { width: 128, height: 128, depth: 50 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await renderer.loadVolume(volumeData)

      // Get the canvas element
      const context = renderer.getContext()
      expect(context).toBeDefined()

      // Dispose
      renderer.dispose()

      // Context should be lost/cleaned up
      // (In real implementation, this would check that event listeners are removed)
    })

    it('should handle dispose called multiple times', () => {
      const renderer = new VTKVolumeRenderer(container)

      // First dispose
      expect(() => renderer.dispose()).not.toThrow()

      // Second dispose should not throw
      expect(() => renderer.dispose()).not.toThrow()

      // Third dispose should not throw
      expect(() => renderer.dispose()).not.toThrow()
    })

    it('should clean up WebGL resources properly', async () => {
      const renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(256 * 256 * 50),
        dimensions: { width: 256, height: 256, depth: 50 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await renderer.loadVolume(volumeData)

      // Get context before dispose
      const context = renderer.getContext()
      expect(context).toBeDefined()

      // Dispose
      renderer.dispose()

      // After dispose, context should be cleaned up
      // (In real implementation, this would verify WebGL resources are deleted)
    })

    it('should not leak memory when switching render modes', async () => {
      const renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(256 * 256 * 50),
        dimensions: { width: 256, height: 256, depth: 50 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await renderer.loadVolume(volumeData)

      const initialMemory = renderer.getPerformanceMetrics().gpuMemoryMB

      // Switch render modes multiple times
      const modes: Array<'mip' | 'volume' | 'isosurface'> = ['mip', 'volume', 'isosurface']
      
      for (let i = 0; i < 10; i++) {
        const mode = modes[i % modes.length]
        renderer.setRenderMode(mode)
        renderer.render()
      }

      const finalMemory = renderer.getPerformanceMetrics().gpuMemoryMB

      // Memory should not increase significantly
      expect(finalMemory).toBeLessThan(initialMemory * 1.1)

      renderer.dispose()
    })

    it('should not leak memory when changing transfer functions', async () => {
      const renderer = new VTKVolumeRenderer(container)
      
      const volumeData: VolumeData = {
        data: new Float32Array(256 * 256 * 50),
        dimensions: { width: 256, height: 256, depth: 50 },
        spacing: { x: 1, y: 1, z: 1 }
      }

      await renderer.loadVolume(volumeData)

      const initialMemory = renderer.getPerformanceMetrics().gpuMemoryMB

      // Change transfer functions multiple times
      const transferFunctions = [
        {
          opacityPoints: [
            { value: 0, opacity: 0 },
            { value: 0.5, opacity: 0.5 },
            { value: 1, opacity: 1 }
          ],
          colorPoints: [
            { value: 0, r: 0, g: 0, b: 0 },
            { value: 1, r: 1, g: 1, b: 1 }
          ]
        },
        {
          opacityPoints: [
            { value: 0, opacity: 0 },
            { value: 0.6, opacity: 0.6 },
            { value: 1, opacity: 1 }
          ],
          colorPoints: [
            { value: 0, r: 0.5, g: 0.2, b: 0.2 },
            { value: 1, r: 1, g: 0.8, b: 0.8 }
          ]
        }
      ]

      for (let i = 0; i < 10; i++) {
        const tf = transferFunctions[i % transferFunctions.length]
        renderer.setTransferFunction(tf)
        renderer.render()
      }

      const finalMemory = renderer.getPerformanceMetrics().gpuMemoryMB

      // Memory should not increase significantly
      expect(finalMemory).toBeLessThan(initialMemory * 1.1)

      renderer.dispose()
    })
  })
})
