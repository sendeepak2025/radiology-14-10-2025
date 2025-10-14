/**
 * Test file to verify VTK.js imports work correctly
 * This file should compile without errors
 */

import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData'
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray'
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow'
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer'
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume'
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper'
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction'
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction'
import vtkOpenGLRenderWindow from '@kitware/vtk.js/Rendering/OpenGL/RenderWindow'
import vtkRenderWindowInteractor from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor'
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera'

/**
 * Test VTK.js imports
 */
export function testVTKImports(): boolean {
  try {
    // Test basic instantiation
    const imageData = vtkImageData.newInstance()
    const renderWindow = vtkRenderWindow.newInstance()
    const renderer = vtkRenderer.newInstance()
    const volume = vtkVolume.newInstance()
    const volumeMapper = vtkVolumeMapper.newInstance()
    const opacityFunction = vtkPiecewiseFunction.newInstance()
    const colorFunction = vtkColorTransferFunction.newInstance()
    
    console.log('✅ VTK.js imports successful')
    console.log('✅ All VTK.js modules loaded correctly')
    
    return true
  } catch (error) {
    console.error('❌ VTK.js import test failed:', error)
    return false
  }
}

// Export all imports for use in other files
export {
  vtkImageData,
  vtkDataArray,
  vtkRenderWindow,
  vtkRenderer,
  vtkVolume,
  vtkVolumeMapper,
  vtkPiecewiseFunction,
  vtkColorTransferFunction,
  vtkOpenGLRenderWindow,
  vtkRenderWindowInteractor,
  vtkInteractorStyleTrackballCamera
}
