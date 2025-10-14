/**
 * Vitest setup file
 * Configures test environment and global mocks
 */

import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock WebGL context
class MockWebGLRenderingContext {
  canvas = document.createElement('canvas')
  
  getParameter(param: number) {
    if (param === 0x0D33) return 16384 // MAX_TEXTURE_SIZE
    if (param === 0x8073) return 2048 // MAX_3D_TEXTURE_SIZE
    if (param === 0x9246) return 'Mock GPU Renderer' // UNMASKED_RENDERER_WEBGL
    if (param === 0x9245) return 'Mock GPU Vendor' // UNMASKED_VENDOR_WEBGL
    return 0
  }
  
  getSupportedExtensions() {
    return ['WEBGL_lose_context', 'WEBGL_debug_renderer_info']
  }
  
  getExtension(name: string) {
    if (name === 'WEBGL_lose_context') {
      return {
        loseContext: vi.fn(),
        restoreContext: vi.fn()
      }
    }
    if (name === 'WEBGL_debug_renderer_info') {
      return {
        UNMASKED_RENDERER_WEBGL: 0x9246,
        UNMASKED_VENDOR_WEBGL: 0x9245
      }
    }
    return null
  }
}

// Define WebGL2RenderingContext globally for tests
global.WebGL2RenderingContext = MockWebGLRenderingContext as any
global.WebGLRenderingContext = MockWebGLRenderingContext as any

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = function(contextType: string) {
  if (contextType === 'webgl2' || contextType === 'webgl' || contextType === 'experimental-webgl') {
    return new MockWebGLRenderingContext() as any
  }
  if (contextType === '2d') {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4)
      })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4)
      })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn()
    } as any
  }
  return null
}

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(() => callback(Date.now()), 16) as any
}

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id)
}

// Mock performance.now
if (!global.performance) {
  global.performance = {} as any
}
global.performance.now = () => Date.now()

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  
  postMessage(message: any) {
    // Mock worker behavior
  }
  
  terminate() {
    // Mock terminate
  }
}

global.Worker = MockWorker as any

console.log('✅ Test environment setup complete')
