import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../test/cornerstone-setup'

import {
  generateImageIds,
  createViewportSpec,
  addTools,
  createToolGroup,
  getRenderingEngineInstance,
  cleanup,
} from '../utils'
import { VIEWPORT_TYPES, TOOL_GROUP_IDS } from '../config'

// Mock the Cornerstone3D modules
const mockRenderingEngine = {
  id: 'test-engine',
  enableElement: vi.fn(),
  disableElement: vi.fn(),
  setViewports: vi.fn(),
  getViewport: vi.fn(),
  destroy: vi.fn(),
}

const mockToolGroup = {
  addTool: vi.fn(),
  setToolActive: vi.fn(),
  setToolMode: vi.fn(),
  addViewport: vi.fn(),
  removeViewports: vi.fn(),
  destroy: vi.fn(),
}

vi.mock('@cornerstonejs/core', async () => {
  const actual = await vi.importActual('@cornerstonejs/core')
  return {
    ...actual,
    RenderingEngine: vi.fn().mockImplementation(() => mockRenderingEngine),
    getRenderingEngine: vi.fn().mockReturnValue(null),
    cache: {
      getVolume: vi.fn().mockReturnValue(null),
      purgeCache: vi.fn(),
    },
    volumeLoader: {
      createAndCacheVolume: vi.fn().mockResolvedValue({
        volumeId: 'test-volume',
        metadata: {},
      }),
    },
  }
})

vi.mock('@cornerstonejs/tools', async () => {
  const actual = await vi.importActual('@cornerstonejs/tools')
  return {
    ...actual,
    ToolGroupManager: {
      createToolGroup: vi.fn().mockReturnValue(mockToolGroup),
      getToolGroup: vi.fn().mockReturnValue(null),
    },
    addTool: vi.fn(),
  }
})

describe('Cornerstone Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateImageIds', () => {
    it('generates correct WADO-URI image IDs', () => {
      const studyUID = '1.2.3.4.5'
      const seriesUID = '1.2.3.4.6'
      const sopUIDs = ['1.2.3.4.7', '1.2.3.4.8', '1.2.3.4.9']
      const baseUrl = '/api/dicom'

      const imageIds = generateImageIds(studyUID, seriesUID, sopUIDs, baseUrl)

      expect(imageIds).toHaveLength(3)
      expect(imageIds[0]).toBe(
        `wadouri:${baseUrl}/studies/${studyUID}/series/${seriesUID}/instances/${sopUIDs[0]}`
      )
      expect(imageIds[1]).toBe(
        `wadouri:${baseUrl}/studies/${studyUID}/series/${seriesUID}/instances/${sopUIDs[1]}`
      )
      expect(imageIds[2]).toBe(
        `wadouri:${baseUrl}/studies/${studyUID}/series/${seriesUID}/instances/${sopUIDs[2]}`
      )
    })

    it('uses default base URL when not provided', () => {
      const studyUID = '1.2.3.4.5'
      const seriesUID = '1.2.3.4.6'
      const sopUIDs = ['1.2.3.4.7']

      const imageIds = generateImageIds(studyUID, seriesUID, sopUIDs)

      expect(imageIds[0]).toBe(
        `wadouri:/api/dicom/studies/${studyUID}/series/${seriesUID}/instances/${sopUIDs[0]}`
      )
    })

    it('handles empty SOP instance UID array', () => {
      const studyUID = '1.2.3.4.5'
      const seriesUID = '1.2.3.4.6'
      const sopUIDs: string[] = []

      const imageIds = generateImageIds(studyUID, seriesUID, sopUIDs)

      expect(imageIds).toHaveLength(0)
    })
  })

  describe('createViewportSpec', () => {
    it('creates basic viewport specification', () => {
      const viewportId = 'test-viewport'
      const type = VIEWPORT_TYPES.STACK
      const element = document.createElement('div')

      const spec = createViewportSpec(viewportId, type, element)

      expect(spec).toEqual({
        viewportId,
        type,
        element,
      })
    })

    it('creates viewport specification with orientation for orthographic viewport', () => {
      const viewportId = 'test-viewport'
      const type = VIEWPORT_TYPES.ORTHOGRAPHIC
      const element = document.createElement('div')
      const orientation = 'axial' as any

      const spec = createViewportSpec(viewportId, type, element, orientation)

      expect(spec).toEqual({
        viewportId,
        type,
        element,
        defaultOptions: {
          orientation,
        },
      })
    })

    it('does not add orientation for non-orthographic viewports', () => {
      const viewportId = 'test-viewport'
      const type = VIEWPORT_TYPES.STACK
      const element = document.createElement('div')
      const orientation = 'axial' as any

      const spec = createViewportSpec(viewportId, type, element, orientation)

      expect(spec).toEqual({
        viewportId,
        type,
        element,
      })
    })
  })

  describe('addTools', () => {
    it('adds all required tools without throwing', () => {
      expect(() => addTools()).not.toThrow()
    })
  })

  describe('createToolGroup', () => {
    it('creates tool group with stack viewport configuration', () => {
      const toolGroupId = TOOL_GROUP_IDS.STACK
      const viewportType = 'STACK_VIEWPORT'

      const toolGroup = createToolGroup(toolGroupId, viewportType)

      expect(toolGroup).toBe(mockToolGroup)
      expect(mockToolGroup.addTool).toHaveBeenCalled()
      expect(mockToolGroup.setToolActive).toHaveBeenCalled()
    })

    it('creates tool group with volume viewport configuration', () => {
      const toolGroupId = TOOL_GROUP_IDS.VOLUME
      const viewportType = 'VOLUME_VIEWPORT'

      const toolGroup = createToolGroup(toolGroupId, viewportType)

      expect(toolGroup).toBe(mockToolGroup)
      expect(mockToolGroup.addTool).toHaveBeenCalled()
    })

    it('creates tool group with 3D viewport configuration', () => {
      const toolGroupId = TOOL_GROUP_IDS.VOLUME_3D
      const viewportType = 'VOLUME_3D_VIEWPORT'

      const toolGroup = createToolGroup(toolGroupId, viewportType)

      expect(toolGroup).toBe(mockToolGroup)
      expect(mockToolGroup.addTool).toHaveBeenCalled()
    })

    it('destroys existing tool group before creating new one', () => {
      const { ToolGroupManager } = require('@cornerstonejs/tools')
      const existingToolGroup = { destroy: vi.fn() }
      ToolGroupManager.getToolGroup.mockReturnValueOnce(existingToolGroup)

      const toolGroupId = TOOL_GROUP_IDS.STACK
      const viewportType = 'STACK_VIEWPORT'

      createToolGroup(toolGroupId, viewportType)

      expect(existingToolGroup.destroy).toHaveBeenCalled()
    })

    it('throws error when tool group creation fails', () => {
      const { ToolGroupManager } = require('@cornerstonejs/tools')
      ToolGroupManager.createToolGroup.mockReturnValueOnce(null)

      const toolGroupId = TOOL_GROUP_IDS.STACK
      const viewportType = 'STACK_VIEWPORT'

      expect(() => createToolGroup(toolGroupId, viewportType)).toThrow(
        `Failed to create tool group: ${toolGroupId}`
      )
    })
  })

  describe('getRenderingEngineInstance', () => {
    it('returns existing rendering engine if available', () => {
      const { getRenderingEngine } = require('@cornerstonejs/core')
      getRenderingEngine.mockReturnValueOnce(mockRenderingEngine)

      const engine = getRenderingEngineInstance()

      expect(engine).toBe(mockRenderingEngine)
    })

    it('creates new rendering engine if none exists', () => {
      const { getRenderingEngine } = require('@cornerstonejs/core')
      getRenderingEngine.mockReturnValueOnce(null)

      const engine = getRenderingEngineInstance()

      expect(engine).toBe(mockRenderingEngine)
    })
  })

  describe('cleanup', () => {
    it('destroys all tool groups and rendering engine', () => {
      const { ToolGroupManager } = require('@cornerstonejs/tools')
      const { getRenderingEngine, cache } = require('@cornerstonejs/core')
      
      ToolGroupManager.getToolGroup.mockReturnValue(mockToolGroup)
      getRenderingEngine.mockReturnValue(mockRenderingEngine)

      cleanup()

      expect(mockToolGroup.destroy).toHaveBeenCalled()
      expect(mockRenderingEngine.destroy).toHaveBeenCalled()
      expect(cache.purgeCache).toHaveBeenCalled()
    })

    it('handles missing tool groups and rendering engine gracefully', () => {
      const { ToolGroupManager } = require('@cornerstonejs/tools')
      const { getRenderingEngine } = require('@cornerstonejs/core')
      
      ToolGroupManager.getToolGroup.mockReturnValue(null)
      getRenderingEngine.mockReturnValue(null)

      expect(() => cleanup()).not.toThrow()
    })
  })

  describe('getViewportElement', () => {
    it('returns viewport element by ID', () => {
      const viewportId = 'test-viewport'
      const element = document.createElement('div')
      element.id = viewportId
      document.body.appendChild(element)

      const { getViewportElement } = require('../utils')
      const result = getViewportElement(viewportId)

      expect(result).toBe(element)
      
      // Cleanup
      document.body.removeChild(element)
    })

    it('returns null for non-existent viewport ID', () => {
      const { getViewportElement } = require('../utils')
      const result = getViewportElement('non-existent-viewport')

      expect(result).toBeNull()
    })
  })
})