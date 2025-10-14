import { vi } from 'vitest'

// Mock Cornerstone3D modules
vi.mock('@cornerstonejs/core', () => ({
  init: vi.fn().mockResolvedValue(undefined),
  RenderingEngine: vi.fn().mockImplementation((id: string) => ({
    id,
    enableElement: vi.fn(),
    disableElement: vi.fn(),
    setViewports: vi.fn(),
    getViewport: vi.fn().mockReturnValue({
      setStack: vi.fn().mockResolvedValue(undefined),
      setVolumes: vi.fn().mockResolvedValue(undefined),
      setOrientation: vi.fn(),
      setCamera: vi.fn(),
      getCamera: vi.fn().mockReturnValue({
        focalPoint: [0, 0, 0],
        position: [0, 0, 100],
        viewUp: [0, 1, 0],
      }),
      getCurrentImageIdIndex: vi.fn().mockReturnValue(0),
      setImageIdIndex: vi.fn(),
      render: vi.fn(),
      getActors: vi.fn().mockReturnValue([]),
    }),
    destroy: vi.fn(),
  })),
  getRenderingEngine: vi.fn().mockReturnValue(null),
  volumeLoader: {
    createAndCacheVolume: vi.fn().mockResolvedValue({
      volumeId: 'test-volume',
      metadata: {
        WindowCenter: 40,
        WindowWidth: 400,
      },
    }),
  },
  cache: {
    getVolume: vi.fn().mockReturnValue(null),
    purgeCache: vi.fn(),
  },
  Enums: {
    ViewportType: {
      STACK: 'stack',
      ORTHOGRAPHIC: 'orthographic',
      VOLUME_3D: 'volume3d',
    },
    OrientationAxis: {
      AXIAL: 'axial',
      SAGITTAL: 'sagittal',
      CORONAL: 'coronal',
    },
    Events: {
      IMAGE_RENDERED: 'IMAGE_RENDERED',
    },
  },
  Types: {},
}))

vi.mock('@cornerstonejs/tools', () => ({
  init: vi.fn().mockResolvedValue(undefined),
  addTool: vi.fn(),
  ToolGroupManager: {
    createToolGroup: vi.fn().mockReturnValue({
      addTool: vi.fn(),
      setToolActive: vi.fn(),
      setToolMode: vi.fn(),
      addViewport: vi.fn(),
      removeViewports: vi.fn(),
      destroy: vi.fn(),
    }),
    getToolGroup: vi.fn().mockReturnValue(null),
  },
  Enums: {
    Tools: {
      Pan: 'Pan',
      Zoom: 'Zoom',
      StackScroll: 'StackScrollMouseWheel',
      WindowLevel: 'WindowLevel',
      Length: 'Length',
      RectangleROI: 'RectangleROI',
      EllipticalROI: 'EllipticalROI',
      CircleROI: 'CircleROI',
      Bidirectional: 'Bidirectional',
      Angle: 'Angle',
      CobbAngle: 'CobbAngle',
      ArrowAnnotate: 'ArrowAnnotate',
      TrackballRotate: 'TrackballRotate',
      Crosshairs: 'Crosshairs',
      Brush: 'Brush',
      RectangleScissor: 'RectangleScissor',
      CircleScissor: 'CircleScissor',
      SphereScissor: 'SphereScissor',
    },
    MouseBindings: {
      Primary: 1,
      Secondary: 2,
      Auxiliary: 4,
    },
    ToolModes: {
      Active: 'Active',
      Passive: 'Passive',
      Enabled: 'Enabled',
      Disabled: 'Disabled',
    },
  },
  // Mock tool classes
  PanTool: vi.fn(),
  ZoomTool: vi.fn(),
  StackScrollMouseWheelTool: vi.fn(),
  WindowLevelTool: vi.fn(),
  LengthTool: vi.fn(),
  RectangleROITool: vi.fn(),
  EllipticalROITool: vi.fn(),
  CircleROITool: vi.fn(),
  BidirectionalTool: vi.fn(),
  AngleTool: vi.fn(),
  CobbAngleTool: vi.fn(),
  ArrowAnnotateTool: vi.fn(),
  TrackballRotateTool: vi.fn(),
  CrosshairsTool: vi.fn(),
}))

vi.mock('@cornerstonejs/dicom-image-loader', () => ({
  init: vi.fn(),
}))

vi.mock('@cornerstonejs/streaming-image-volume-loader', () => ({
  init: vi.fn(),
}))

vi.mock('dicom-parser', () => ({
  default: {},
}))

// Mock WebGL context
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockImplementation((contextType: string) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return {
        canvas: {},
        drawingBufferWidth: 300,
        drawingBufferHeight: 150,
        getExtension: vi.fn(),
        getParameter: vi.fn(),
        createShader: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        createProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        createBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        drawArrays: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        viewport: vi.fn(),
      }
    }
    return null
  }),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.dicomParser
Object.defineProperty(window, 'dicomParser', {
  value: {},
  writable: true,
})