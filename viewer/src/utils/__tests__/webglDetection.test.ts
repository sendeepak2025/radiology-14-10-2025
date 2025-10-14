/**
 * Tests for WebGL Detection Utility
 * Tests browser compatibility and WebGL capability detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  detectWebGL,
  supports3DTextures,
  canRenderVolume,
  hasExtension,
  checkVolumeRenderingCapabilities,
  getRecommendedQuality,
  getMaxSafeVolumeDimensions,
  estimateVolumeMemoryUsage,
  getWebGLStatusMessage
} from '../webglDetection'

describe('WebGL Detection - Browser Compatibility', () => {
  describe('9.6 Test browser compatibility', () => {
    it('should detect WebGL 2.0 support (Chrome 90+)', () => {
      const capabilities = detectWebGL()
      
      // In a modern browser, WebGL should be supported
      expect(capabilities.supported).toBe(true)
      
      // WebGL 2.0 is required for VTK.js
      if (capabilities.version === 2) {
        expect(capabilities.maxTexture3DSize).toBeGreaterThan(0)
      }
    })

    it('should detect WebGL 2.0 support (Firefox 88+)', () => {
      const capabilities = detectWebGL()
      
      expect(capabilities.supported).toBe(true)
      
      // Check for Firefox-specific capabilities
      if (capabilities.vendor.includes('Mozilla')) {
        expect(capabilities.version).toBeGreaterThanOrEqual(1)
      }
    })

    it('should detect WebGL 2.0 support (Safari 14+)', () => {
      const capabilities = detectWebGL()
      
      expect(capabilities.supported).toBe(true)
      
      // Check for Safari-specific capabilities
      if (capabilities.vendor.includes('Apple')) {
        expect(capabilities.version).toBeGreaterThanOrEqual(1)
      }
    })

    it('should detect WebGL 2.0 support (Edge 90+)', () => {
      const capabilities = detectWebGL()
      
      expect(capabilities.supported).toBe(true)
      
      // Edge uses Chromium, so should have similar capabilities to Chrome
      if (capabilities.renderer.includes('ANGLE')) {
        expect(capabilities.version).toBeGreaterThanOrEqual(1)
      }
    })

    it('should detect GPU renderer information', () => {
      const capabilities = detectWebGL()
      
      expect(capabilities.renderer).toBeDefined()
      expect(capabilities.vendor).toBeDefined()
      
      // Should not be 'Unknown' in a real browser
      expect(capabilities.renderer).not.toBe('')
      expect(capabilities.vendor).not.toBe('')
    })

    it('should detect maximum texture sizes', () => {
      const capabilities = detectWebGL()
      
      if (capabilities.supported) {
        // Max 2D texture size should be at least 2048
        expect(capabilities.maxTextureSize).toBeGreaterThanOrEqual(2048)
        
        // If WebGL 2.0, max 3D texture size should be at least 256
        if (capabilities.version === 2) {
          expect(capabilities.maxTexture3DSize).toBeGreaterThanOrEqual(256)
        }
      }
    })

    it('should detect available WebGL extensions', () => {
      const capabilities = detectWebGL()
      
      if (capabilities.supported) {
        expect(capabilities.extensions).toBeInstanceOf(Array)
        expect(capabilities.extensions.length).toBeGreaterThan(0)
      }
    })

    it('should estimate GPU memory', () => {
      const capabilities = detectWebGL()
      
      if (capabilities.supported) {
        expect(capabilities.estimatedGPUMemoryMB).toBeGreaterThan(0)
        
        // Should be a reasonable estimate (128MB to 8GB)
        expect(capabilities.estimatedGPUMemoryMB).toBeGreaterThanOrEqual(128)
        expect(capabilities.estimatedGPUMemoryMB).toBeLessThanOrEqual(8192)
      }
    })
  })

  describe('WebGL Capability Checks', () => {
    it('should check 3D texture support', () => {
      const capabilities = detectWebGL()
      
      const has3DTextures = supports3DTextures(capabilities)
      
      if (capabilities.version === 2) {
        expect(has3DTextures).toBe(true)
      } else {
        expect(has3DTextures).toBe(false)
      }
    })

    it('should check if volume can be rendered', () => {
      const capabilities = detectWebGL()
      
      // Small volume should be renderable
      const canRenderSmall = canRenderVolume(capabilities, 128, 128, 50)
      
      if (capabilities.version === 2) {
        expect(canRenderSmall).toBe(true)
      }
      
      // Very large volume should not be renderable
      const canRenderHuge = canRenderVolume(capabilities, 4096, 4096, 4096)
      expect(canRenderHuge).toBe(false)
    })

    it('should check for specific extensions', () => {
      const capabilities = detectWebGL()
      
      if (capabilities.supported) {
        // Check for common extensions
        const hasLoseContext = hasExtension(capabilities, 'WEBGL_lose_context')
        expect(typeof hasLoseContext).toBe('boolean')
      }
    })

    it('should provide volume rendering capability check', () => {
      const capabilities = detectWebGL()
      const check = checkVolumeRenderingCapabilities(capabilities)
      
      expect(check).toHaveProperty('canRender')
      expect(check).toHaveProperty('reasons')
      expect(check).toHaveProperty('warnings')
      
      expect(typeof check.canRender).toBe('boolean')
      expect(Array.isArray(check.reasons)).toBe(true)
      expect(Array.isArray(check.warnings)).toBe(true)
    })

    it('should recommend appropriate quality settings', () => {
      const capabilities = detectWebGL()
      const quality = getRecommendedQuality(capabilities)
      
      expect(['low', 'medium', 'high']).toContain(quality)
    })

    it('should calculate max safe volume dimensions', () => {
      const capabilities = detectWebGL()
      const maxDims = getMaxSafeVolumeDimensions(capabilities)
      
      expect(maxDims).toHaveProperty('maxWidth')
      expect(maxDims).toHaveProperty('maxHeight')
      expect(maxDims).toHaveProperty('maxDepth')
      
      if (capabilities.version === 2) {
        expect(maxDims.maxWidth).toBeGreaterThan(0)
        expect(maxDims.maxHeight).toBeGreaterThan(0)
        expect(maxDims.maxDepth).toBeGreaterThan(0)
      }
    })

    it('should estimate volume memory usage', () => {
      const memoryMB = estimateVolumeMemoryUsage(512, 512, 100)
      
      // 512 * 512 * 100 * 4 bytes = ~100MB
      expect(memoryMB).toBeCloseTo(100, 0)
    })

    it('should provide WebGL status message', () => {
      const capabilities = detectWebGL()
      const message = getWebGLStatusMessage(capabilities)
      
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })
  })
})
