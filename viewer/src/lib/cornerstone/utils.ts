import {
  RenderingEngine,
  Types,
  Enums,
  volumeLoader,
  cache,
  getRenderingEngine,
} from '@cornerstonejs/core'
import {
  ToolGroupManager,
  addTool,
  ToolGroup,
  Enums as ToolEnums,
} from '@cornerstonejs/tools'
import {
  RENDERING_ENGINE_ID,
  TOOL_GROUP_IDS,
  DEFAULT_TOOL_CONFIG,
  VIEWPORT_TYPES,
} from './config'

// Import tools
import {
  PanTool,
  ZoomTool,
  StackScrollMouseWheelTool,
  WindowLevelTool,
  LengthTool,
  RectangleROITool,
  EllipticalROITool,
  CircleROITool,
  BidirectionalTool,
  AngleTool,
  CobbAngleTool,
  ArrowAnnotateTool,
  TrackballRotateTool,
  CrosshairsTool,
} from '@cornerstonejs/tools'

/**
 * Add all required tools to Cornerstone3D
 */
export function addTools(): void {
  // Manipulation tools
  addTool(PanTool)
  addTool(ZoomTool)
  addTool(StackScrollMouseWheelTool)
  addTool(WindowLevelTool)
  
  // Annotation tools
  addTool(LengthTool)
  addTool(RectangleROITool)
  addTool(EllipticalROITool)
  addTool(CircleROITool)
  addTool(BidirectionalTool)
  addTool(AngleTool)
  addTool(CobbAngleTool)
  addTool(ArrowAnnotateTool)
  
  // 3D tools
  addTool(TrackballRotateTool)
  
  // MPR tools
  addTool(CrosshairsTool)
}

/**
 * Create or get the rendering engine
 */
export function getRenderingEngineInstance(): RenderingEngine {
  let renderingEngine = getRenderingEngine(RENDERING_ENGINE_ID)
  
  if (!renderingEngine) {
    renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID)
  }
  
  return renderingEngine
}

/**
 * Create a tool group with default tools
 */
export function createToolGroup(
  toolGroupId: string,
  viewportType: 'STACK_VIEWPORT' | 'VOLUME_VIEWPORT' | 'VOLUME_3D_VIEWPORT'
): ToolGroup {
  // Remove existing tool group if it exists
  const existingToolGroup = ToolGroupManager.getToolGroup(toolGroupId)
  if (existingToolGroup) {
    existingToolGroup.destroy()
  }
  
  const toolGroup = ToolGroupManager.createToolGroup(toolGroupId)
  
  if (!toolGroup) {
    throw new Error(`Failed to create tool group: ${toolGroupId}`)
  }
  
  // Add tools based on viewport type
  const toolConfig = DEFAULT_TOOL_CONFIG[viewportType]
  
  toolConfig.forEach(({ tool, mode, bindings }) => {
    toolGroup.addTool(tool)
    
    if (bindings) {
      toolGroup.setToolActive(tool, {
        bindings: bindings.map(binding => ({ mouseButton: binding })),
      })
    } else {
      toolGroup.setToolMode(tool, mode)
    }
  })
  
  return toolGroup
}

/**
 * Create a viewport specification
 */
export function createViewportSpec(
  viewportId: string,
  type: Types.ViewportType,
  element: HTMLDivElement,
  orientation?: Types.OrientationAxis
): Types.PublicViewportInput {
  const spec: Types.PublicViewportInput = {
    viewportId,
    type,
    element,
  }
  
  if (orientation && type === VIEWPORT_TYPES.ORTHOGRAPHIC) {
    spec.defaultOptions = {
      orientation,
    }
  }
  
  return spec
}

/**
 * Load and cache a volume
 */
export async function loadVolume(
  volumeId: string,
  imageIds: string[]
): Promise<Types.IImageVolume> {
  // Check if volume is already cached
  let volume = cache.getVolume(volumeId)
  
  if (!volume) {
    // Create volume
    volume = await volumeLoader.createAndCacheVolume(volumeId, {
      imageIds,
    })

    // Ensure the volume actually loads its image data before returning
    await (volume as any).load?.()
  } else {
    // If cached, make sure it has been loaded
    if ((volume as any).load && !(volume as any).isLoaded) {
      await (volume as any).load()
    }
  }
  
  return volume
}

/**
 * Set viewport data for stack viewport
 */
export async function setStackViewportData(
  renderingEngine: RenderingEngine,
  viewportId: string,
  imageIds: string[],
  currentImageIdIndex = 0
): Promise<void> {
  const viewport = renderingEngine.getViewport(viewportId) as Types.IStackViewport
  
  await viewport.setStack(imageIds, currentImageIdIndex)
  viewport.render()
}

/**
 * Set viewport data for volume viewport
 */
export async function setVolumeViewportData(
  renderingEngine: RenderingEngine,
  viewportId: string,
  volume: Types.IImageVolume,
  orientation?: Types.OrientationAxis
): Promise<void> {
  const viewport = renderingEngine.getViewport(viewportId) as Types.IVolumeViewport
  
  await viewport.setVolumes([
    {
      volumeId: volume.volumeId,
      callback: ({ volumeActor }) => {
        // Set initial window/level if available
        if (volume.metadata?.WindowCenter && volume.metadata?.WindowWidth) {
          const windowCenter = Array.isArray(volume.metadata.WindowCenter)
            ? volume.metadata.WindowCenter[0]
            : volume.metadata.WindowCenter
          const windowWidth = Array.isArray(volume.metadata.WindowWidth)
            ? volume.metadata.WindowWidth[0]
            : volume.metadata.WindowWidth
            
          volumeActor.getProperty().setRGBTransferFunction(0, windowCenter - windowWidth / 2, windowCenter + windowWidth / 2)
        }
      },
    },
  ])
  
  if (orientation) {
    viewport.setOrientation(orientation)
  }
  
  viewport.render()
}

/**
 * Clean up resources
 */
export function cleanup(): void {
  // Destroy all tool groups
  Object.values(TOOL_GROUP_IDS).forEach(toolGroupId => {
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId)
    if (toolGroup) {
      toolGroup.destroy()
    }
  })
  
  // Destroy rendering engine
  const renderingEngine = getRenderingEngine(RENDERING_ENGINE_ID)
  if (renderingEngine) {
    renderingEngine.destroy()
  }
  
  // Clear cache
  cache.purgeCache()
}

/**
 * Generate DICOM image IDs from a study
 */
export function generateImageIds(
  studyInstanceUID: string,
  seriesInstanceUID: string,
  sopInstanceUIDs: string[],
  baseUrl = '/api/dicom'
): string[] {
  return sopInstanceUIDs.map(sopInstanceUID => 
    `wadouri:${baseUrl}/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${sopInstanceUID}`
  )
}

/**
 * Get viewport element by ID
 */
export function getViewportElement(viewportId: string): HTMLDivElement | null {
  return document.getElementById(viewportId) as HTMLDivElement | null
}