import { Enums } from '@cornerstonejs/core'
import { Enums as ToolEnums } from '@cornerstonejs/tools'

// Viewport types
export const VIEWPORT_TYPES = {
  STACK: Enums.ViewportType.STACK,
  ORTHOGRAPHIC: Enums.ViewportType.ORTHOGRAPHIC,
  VOLUME_3D: Enums.ViewportType.VOLUME_3D,
} as const

// Provide a safe fallback for tool names when ToolEnums.Tools is unavailable (e.g., in tests or certain builds)
const ToolsEnum = (ToolEnums as any)?.Tools || {
  Pan: 'Pan',
  Zoom: 'Zoom',
  StackScroll: 'StackScroll',
  WindowLevel: 'WindowLevel',
  Length: 'Length',
  RectangleROI: 'RectangleROI',
  EllipticalROI: 'EllipticalROI',
  CircleROI: 'CircleROI',
  Bidirectional: 'Bidirectional',
  Angle: 'Angle',
  CobbAngle: 'CobbAngle',
  ArrowAnnotate: 'ArrowAnnotate',
  Brush: 'Brush',
  RectangleScissor: 'RectangleScissor',
  CircleScissor: 'CircleScissor',
  SphereScissor: 'SphereScissor',
  TrackballRotate: 'TrackballRotate',
  Crosshairs: 'Crosshairs',
}

// Tool names
export const TOOL_NAMES = {
  // Manipulation tools
  PAN: ToolsEnum.Pan,
  ZOOM: ToolsEnum.Zoom,
  STACK_SCROLL: ToolsEnum.StackScroll,
  WINDOW_LEVEL: ToolsEnum.WindowLevel,
  
  // Annotation tools
  LENGTH: ToolsEnum.Length,
  RECTANGLE_ROI: ToolsEnum.RectangleROI,
  ELLIPTICAL_ROI: ToolsEnum.EllipticalROI,
  CIRCLE_ROI: ToolsEnum.CircleROI,
  BIDIRECTIONAL: ToolsEnum.Bidirectional,
  ANGLE: ToolsEnum.Angle,
  COBB_ANGLE: ToolsEnum.CobbAngle,
  ARROW_ANNOTATE: ToolsEnum.ArrowAnnotate,
  
  // Segmentation tools
  BRUSH: ToolsEnum.Brush,
  RECTANGLE_SCISSOR: ToolsEnum.RectangleScissor,
  CIRCLE_SCISSOR: ToolsEnum.CircleScissor,
  SPHERE_SCISSOR: ToolsEnum.SphereScissor,
  
  // 3D tools
  TRACKBALL_ROTATE: ToolsEnum.TrackballRotate,
  
  // Crosshairs for MPR
  CROSSHAIRS: ToolsEnum.Crosshairs,
} as const

// Mouse bindings
export const MOUSE_BINDINGS = {
  PRIMARY: ToolEnums.MouseBindings.Primary,
  SECONDARY: ToolEnums.MouseBindings.Secondary,
  AUXILIARY: ToolEnums.MouseBindings.Auxiliary,
} as const

// Tool modes
export const TOOL_MODES = {
  ACTIVE: ToolEnums.ToolModes.Active,
  PASSIVE: ToolEnums.ToolModes.Passive,
  ENABLED: ToolEnums.ToolModes.Enabled,
  DISABLED: ToolEnums.ToolModes.Disabled,
} as const

// Default tool configuration for different viewport types
export const DEFAULT_TOOL_CONFIG = {
  STACK_VIEWPORT: [
    { tool: TOOL_NAMES.PAN, mode: TOOL_MODES.ACTIVE, bindings: [MOUSE_BINDINGS.AUXILIARY] },
    { tool: TOOL_NAMES.ZOOM, mode: TOOL_MODES.ACTIVE, bindings: [MOUSE_BINDINGS.SECONDARY] },
    { tool: TOOL_NAMES.STACK_SCROLL, mode: TOOL_MODES.ACTIVE },
    { tool: TOOL_NAMES.WINDOW_LEVEL, mode: TOOL_MODES.ACTIVE, bindings: [MOUSE_BINDINGS.PRIMARY] },
    { tool: TOOL_NAMES.LENGTH, mode: TOOL_MODES.ENABLED },
    { tool: TOOL_NAMES.RECTANGLE_ROI, mode: TOOL_MODES.ENABLED },
    { tool: TOOL_NAMES.ELLIPTICAL_ROI, mode: TOOL_MODES.ENABLED },
  ],
  
  VOLUME_VIEWPORT: [
    { tool: TOOL_NAMES.PAN, mode: TOOL_MODES.ACTIVE, bindings: [MOUSE_BINDINGS.AUXILIARY] },
    { tool: TOOL_NAMES.ZOOM, mode: TOOL_MODES.ACTIVE, bindings: [MOUSE_BINDINGS.SECONDARY] },
    { tool: TOOL_NAMES.WINDOW_LEVEL, mode: TOOL_MODES.ACTIVE, bindings: [MOUSE_BINDINGS.PRIMARY] },
    { tool: TOOL_NAMES.CROSSHAIRS, mode: TOOL_MODES.ENABLED },
    { tool: TOOL_NAMES.LENGTH, mode: TOOL_MODES.ENABLED },
    { tool: TOOL_NAMES.RECTANGLE_ROI, mode: TOOL_MODES.ENABLED },
  ],
  
  VOLUME_3D_VIEWPORT: [
    { tool: TOOL_NAMES.TRACKBALL_ROTATE, mode: TOOL_MODES.ACTIVE, bindings: [MOUSE_BINDINGS.PRIMARY] },
    { tool: TOOL_NAMES.PAN, mode: TOOL_MODES.ACTIVE, bindings: [MOUSE_BINDINGS.AUXILIARY] },
    { tool: TOOL_NAMES.ZOOM, mode: TOOL_MODES.ACTIVE, bindings: [MOUSE_BINDINGS.SECONDARY] },
  ],
} as const

// Rendering engine configuration
export const RENDERING_ENGINE_ID = 'medical-imaging-rendering-engine'

// Tool group IDs
export const TOOL_GROUP_IDS = {
  STACK: 'stack-tool-group',
  VOLUME: 'volume-tool-group',
  VOLUME_3D: 'volume-3d-tool-group',
} as const

// Viewport IDs
export const VIEWPORT_IDS = {
  AXIAL: 'axial-viewport',
  SAGITTAL: 'sagittal-viewport',
  CORONAL: 'coronal-viewport',
  VOLUME_3D: 'volume-3d-viewport',
  STACK: 'stack-viewport',
} as const

// Volume IDs
export const VOLUME_IDS = {
  CT: 'ct-volume',
  MR: 'mr-volume',
  PT: 'pt-volume',
} as const