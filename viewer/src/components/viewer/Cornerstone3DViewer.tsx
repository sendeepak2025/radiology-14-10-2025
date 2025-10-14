import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
    Box,
    Paper,
    Button,
    ButtonGroup,
    Typography,
    Divider,
    Alert,
    Chip,
} from '@mui/material'
import {
    PanTool as PanIcon,
    ZoomIn as ZoomIcon,
    Straighten as RulerIcon,
    Architecture as AngleIcon,
    CropFree as AreaIcon,
    Refresh as ResetIcon,
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    SkipNext as NextIcon,
    SkipPrevious as PrevIcon,
    Tune as WindowLevelIcon,
    ViewInAr as View3DIcon,
    Clear as ClearIcon,
} from '@mui/icons-material'

// Cornerstone3D imports
import { init as csRenderInit, RenderingEngine, Enums } from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'

const {
    PanTool,
    ZoomTool,
    StackScrollMouseWheelTool,
    LengthTool,
    AngleTool,
    RectangleROITool,
    EllipticalROITool,
    ArrowAnnotateTool,
    WindowLevelTool,
    ToolGroupManager,
    Enums: csToolsEnums,
} = cornerstoneTools

interface Cornerstone3DViewerProps {
    studyInstanceUID: string
    seriesInstanceUID?: string
    sopInstanceUIDs?: string[]
    dicomWebBaseUrl?: string
    mode?: 'stack' | 'volume' | 'mpr'
}

export const Cornerstone3DViewer: React.FC<Cornerstone3DViewerProps> = ({
    studyInstanceUID,
}) => {
    const viewportRef = useRef<HTMLDivElement>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [activeTool, setActiveTool] = useState<string>('Pan')
    const [currentFrame, setCurrentFrame] = useState(0)
    const [totalFrames, setTotalFrames] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const renderingEngineRef = useRef<RenderingEngine | null>(null)
    const toolGroupRef = useRef<any>(null)
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const isInitializingRef = useRef(false)

    // Initialize Cornerstone3D
    useEffect(() => {
        const initCornerstone = async () => {
            // Prevent multiple initializations
            if (isInitializingRef.current || isInitialized) {
                console.log('ℹ️ Cornerstone3D already initialized or initializing')
                return
            }

            isInitializingRef.current = true
            try {
                console.log('🚀 Initializing Cornerstone3D...')

                // Initialize Cornerstone3D Core (only once)
                await csRenderInit()
                console.log('✅ Cornerstone3D Core initialized')

                // Initialize Tools (only once)
                cornerstoneTools.init()
                console.log('✅ Cornerstone3D Tools initialized')

                // Add tools (with duplicate check)
                const toolsToAdd = [
                    PanTool,
                    ZoomTool,
                    StackScrollMouseWheelTool,
                    LengthTool,
                    AngleTool,
                    RectangleROITool,
                    EllipticalROITool,
                    ArrowAnnotateTool,
                    WindowLevelTool,
                ]

                toolsToAdd.forEach((ToolClass) => {
                    try {
                        cornerstoneTools.addTool(ToolClass)
                        console.log(`✅ Added tool: ${ToolClass.toolName}`)
                    } catch (err: any) {
                        // Ignore "already added" errors
                        if (err.message?.includes('already been added')) {
                            console.log(`ℹ️ Tool already added: ${ToolClass.toolName}`)
                        } else {
                            throw err
                        }
                    }
                })

                console.log('✅ All tools ready')
                console.log('✅ Cornerstone3D initialized successfully')
                setIsInitialized(true)
            } catch (err) {
                console.error('❌ Failed to initialize Cornerstone3D:', err)
                console.error('Error details:', err)
                setError(`Initialization failed: ${err}`)
                isInitializingRef.current = false // Reset on error
            }
        }

        initCornerstone()

        return () => {
            // Cleanup
            if (renderingEngineRef.current) {
                renderingEngineRef.current.destroy()
            }
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current)
            }
        }
    }, [])

    // Setup viewport and load images
    useEffect(() => {
        if (!isInitialized || !viewportRef.current || !studyInstanceUID) return

        const setupViewer = async () => {
            try {
                console.log('🎬 Setting up viewer for study:', studyInstanceUID)

                // Create rendering engine
                const renderingEngineId = 'myRenderingEngine'
                const renderingEngine = new RenderingEngine(renderingEngineId)
                renderingEngineRef.current = renderingEngine

                // Create viewport
                const viewportId = 'CT_STACK'
                if (!viewportRef.current) {
                    throw new Error('Viewport element not found')
                }

                const viewportInput = {
                    viewportId,
                    type: Enums.ViewportType.STACK,
                    element: viewportRef.current,
                    defaultOptions: {
                        background: [0, 0, 0] as [number, number, number],
                    },
                }

                renderingEngine.enableElement(viewportInput)

                // Create tool group
                const toolGroupId = 'myToolGroup'
                let toolGroup = ToolGroupManager.getToolGroup(toolGroupId)

                if (!toolGroup) {
                    toolGroup = ToolGroupManager.createToolGroup(toolGroupId)
                }

                if (!toolGroup) {
                    throw new Error('Failed to create tool group')
                }

                toolGroupRef.current = toolGroup

                // Add tools to tool group
                toolGroup.addTool(PanTool.toolName)
                toolGroup.addTool(ZoomTool.toolName)
                toolGroup.addTool(StackScrollMouseWheelTool.toolName)
                toolGroup.addTool(LengthTool.toolName)
                toolGroup.addTool(AngleTool.toolName)
                toolGroup.addTool(RectangleROITool.toolName)
                toolGroup.addTool(EllipticalROITool.toolName)
                toolGroup.addTool(ArrowAnnotateTool.toolName)
                toolGroup.addTool(WindowLevelTool.toolName)

                // Set initial tool states
                toolGroup.setToolActive(PanTool.toolName, {
                    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }],
                })
                toolGroup.setToolActive(ZoomTool.toolName, {
                    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Secondary }],
                })
                toolGroup.setToolActive(StackScrollMouseWheelTool.toolName)
                toolGroup.setToolActive(WindowLevelTool.toolName, {
                    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
                })

                // Add viewport to tool group
                toolGroup.addViewport(viewportId, renderingEngineId)

                // Load images
                const imageIds = await loadImageIds(studyInstanceUID)
                setTotalFrames(imageIds.length)

                const viewport = renderingEngine.getViewport(viewportId)
                if (viewport && imageIds.length > 0) {
                    await (viewport as any).setStack(imageIds, 0)
                    viewport.render()
                    console.log('✅ Images loaded and rendered')
                }
            } catch (err) {
                console.error('❌ Failed to setup viewer:', err)
                setError(`Setup failed: ${err}`)
            }
        }

        setupViewer()
    }, [isInitialized, studyInstanceUID])

    // Load image IDs from backend
    const loadImageIds = async (studyId: string): Promise<string[]> => {
        try {
            // Get study metadata to determine number of frames
            const response = await fetch(`/api/studies/${studyId}/metadata`)
            const data = await response.json()

            if (!data.success) {
                throw new Error('Failed to load study metadata')
            }

            const frameCount = data.data?.numberOfInstances || 10

            // Generate image IDs using direct URLs (no WADO-URI prefix for now)
            // This will work with standard image formats (PNG, JPEG)
            const imageIds: string[] = []
            for (let i = 0; i < frameCount; i++) {
                // Direct URL to backend API endpoint
                const imageId = `/api/studies/${studyId}/frames/${i}/image`
                imageIds.push(imageId)
            }

            console.log(`📸 Loaded ${imageIds.length} image IDs`)
            return imageIds
        } catch (err) {
            console.error('Failed to load image IDs:', err)
            return []
        }
    }

    // Tool activation
    const activateTool = useCallback((toolName: string) => {
        if (!toolGroupRef.current) return

        const toolGroup = toolGroupRef.current

        // Deactivate all annotation tools
        const annotationTools = [
            LengthTool.toolName,
            AngleTool.toolName,
            RectangleROITool.toolName,
            EllipticalROITool.toolName,
            ArrowAnnotateTool.toolName,
        ]

        annotationTools.forEach(tool => {
            toolGroup.setToolPassive(tool)
        })

        // Activate selected tool
        if (annotationTools.includes(toolName)) {
            toolGroup.setToolActive(toolName, {
                bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
            })
            setActiveTool(toolName)
        } else if (toolName === 'Pan') {
            toolGroup.setToolActive(PanTool.toolName, {
                bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
            })
            setActiveTool('Pan')
        } else if (toolName === 'Zoom') {
            toolGroup.setToolActive(ZoomTool.toolName, {
                bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
            })
            setActiveTool('Zoom')
        } else if (toolName === 'WindowLevel') {
            toolGroup.setToolActive(WindowLevelTool.toolName, {
                bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
            })
            setActiveTool('WindowLevel')
        }

        console.log(`🔧 Activated tool: ${toolName}`)
    }, [])

    // Frame navigation
    const goToFrame = useCallback((frameIndex: number) => {
        if (!renderingEngineRef.current) return

        const viewport = renderingEngineRef.current.getViewport('CT_STACK') as any
        if (viewport) {
            const clampedIndex = Math.max(0, Math.min(totalFrames - 1, frameIndex))
            viewport.setImageIdIndex(clampedIndex)
            viewport.render()
            setCurrentFrame(clampedIndex)
        }
    }, [totalFrames])

    const nextFrame = useCallback(() => {
        goToFrame(currentFrame + 1)
    }, [currentFrame, goToFrame])

    const previousFrame = useCallback(() => {
        goToFrame(currentFrame - 1)
    }, [currentFrame, goToFrame])

    // Cine playback
    const togglePlayback = useCallback(() => {
        if (isPlaying) {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current)
                playIntervalRef.current = null
            }
            setIsPlaying(false)
        } else {
            playIntervalRef.current = setInterval(() => {
                setCurrentFrame(prev => {
                    const next = prev + 1
                    if (next >= totalFrames) {
                        return 0
                    }
                    goToFrame(next)
                    return next
                })
            }, 100)
            setIsPlaying(true)
        }
    }, [isPlaying, totalFrames, goToFrame])

    // Reset view
    const resetView = useCallback(() => {
        if (!renderingEngineRef.current) return

        const viewport = renderingEngineRef.current.getViewport('CT_STACK')
        if (viewport) {
            viewport.resetCamera()
            viewport.render()
        }
    }, [])

    // Clear annotations
    const clearAnnotations = useCallback(() => {
        if (!toolGroupRef.current || !viewportRef.current) return

        const annotationTools = [
            LengthTool.toolName,
            AngleTool.toolName,
            RectangleROITool.toolName,
            EllipticalROITool.toolName,
            ArrowAnnotateTool.toolName,
        ]

        annotationTools.forEach(toolName => {
            const annotations = cornerstoneTools.annotation.state.getAnnotations(toolName, viewportRef.current!)
            annotations?.forEach(annotation => {
                if (annotation.annotationUID) {
                    cornerstoneTools.annotation.state.removeAnnotation(annotation.annotationUID)
                }
            })
        })

        if (renderingEngineRef.current) {
            const viewport = renderingEngineRef.current.getViewport('CT_STACK')
            viewport?.render()
        }

        console.log('🗑️ Cleared all annotations')
    }, [])

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    <Typography variant="h6">Cornerstone3D Error</Typography>
                    <Typography variant="body2">{error}</Typography>
                </Alert>
            </Box>
        )
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#000' }}>
            {/* Toolbar */}
            <Paper
                elevation={2}
                sx={{
                    bgcolor: 'grey.900',
                    color: 'white',
                    borderRadius: 0,
                    p: 1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            icon={<View3DIcon />}
                            label="Cornerstone3D Viewer"
                            color="primary"
                            size="small"
                        />
                        <Chip
                            label={`Study: ${studyInstanceUID.substring(0, 12)}...`}
                            size="small"
                            variant="outlined"
                            sx={{ color: 'white', borderColor: 'white' }}
                        />
                    </Box>

                    <Chip
                        label={`Frame ${currentFrame + 1} / ${totalFrames}`}
                        size="small"
                        color="secondary"
                    />
                </Box>

                {/* Tool Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {/* Navigation Tools */}
                    <ButtonGroup variant="outlined" size="small">
                        <Button
                            startIcon={<PanIcon />}
                            onClick={() => activateTool('Pan')}
                            variant={activeTool === 'Pan' ? 'contained' : 'outlined'}
                        >
                            Pan
                        </Button>
                        <Button
                            startIcon={<ZoomIcon />}
                            onClick={() => activateTool('Zoom')}
                            variant={activeTool === 'Zoom' ? 'contained' : 'outlined'}
                        >
                            Zoom
                        </Button>
                        <Button
                            startIcon={<WindowLevelIcon />}
                            onClick={() => activateTool('WindowLevel')}
                            variant={activeTool === 'WindowLevel' ? 'contained' : 'outlined'}
                        >
                            W/L
                        </Button>
                    </ButtonGroup>

                    <Divider orientation="vertical" flexItem sx={{ bgcolor: 'grey.600' }} />

                    {/* Measurement Tools */}
                    <ButtonGroup variant="outlined" size="small">
                        <Button
                            startIcon={<RulerIcon />}
                            onClick={() => activateTool(LengthTool.toolName)}
                            variant={activeTool === LengthTool.toolName ? 'contained' : 'outlined'}
                        >
                            Length
                        </Button>
                        <Button
                            startIcon={<AngleIcon />}
                            onClick={() => activateTool(AngleTool.toolName)}
                            variant={activeTool === AngleTool.toolName ? 'contained' : 'outlined'}
                        >
                            Angle
                        </Button>
                        <Button
                            startIcon={<AreaIcon />}
                            onClick={() => activateTool(RectangleROITool.toolName)}
                            variant={activeTool === RectangleROITool.toolName ? 'contained' : 'outlined'}
                        >
                            ROI
                        </Button>
                    </ButtonGroup>

                    <Divider orientation="vertical" flexItem sx={{ bgcolor: 'grey.600' }} />

                    {/* Playback Controls */}
                    <ButtonGroup variant="outlined" size="small">
                        <Button startIcon={<PrevIcon />} onClick={previousFrame}>
                            Prev
                        </Button>
                        <Button
                            startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />}
                            onClick={togglePlayback}
                            variant={isPlaying ? 'contained' : 'outlined'}
                            color={isPlaying ? 'error' : 'primary'}
                        >
                            {isPlaying ? 'Stop' : 'Play'}
                        </Button>
                        <Button startIcon={<NextIcon />} onClick={nextFrame}>
                            Next
                        </Button>
                    </ButtonGroup>

                    <Divider orientation="vertical" flexItem sx={{ bgcolor: 'grey.600' }} />

                    {/* View Controls */}
                    <ButtonGroup variant="outlined" size="small">
                        <Button startIcon={<ResetIcon />} onClick={resetView}>
                            Reset
                        </Button>
                        <Button startIcon={<ClearIcon />} onClick={clearAnnotations} color="error">
                            Clear
                        </Button>
                    </ButtonGroup>
                </Box>

                {/* Tool Instructions */}
                {activeTool !== 'Pan' && activeTool !== 'Zoom' && activeTool !== 'WindowLevel' && (
                    <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                        <Typography variant="caption">
                            {activeTool === LengthTool.toolName && '📏 Click and drag to measure distance'}
                            {activeTool === AngleTool.toolName && '📐 Click three points to measure angle'}
                            {activeTool === RectangleROITool.toolName && '▭ Click and drag to draw ROI'}
                            {activeTool === EllipticalROITool.toolName && '⭕ Click and drag to draw ellipse'}
                            {activeTool === ArrowAnnotateTool.toolName && '➡️ Click and drag to draw arrow'}
                        </Typography>
                    </Alert>
                )}
            </Paper>

            {/* Viewport */}
            <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <div
                    ref={viewportRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#000',
                    }}
                />

                {!isInitialized && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(0, 0, 0, 0.8)',
                        }}
                    >
                        <Typography variant="h6" color="white">
                            Initializing Cornerstone3D...
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    )
}

export default Cornerstone3DViewer
