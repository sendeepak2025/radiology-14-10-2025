import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { CssBaseline, Box, Typography, Button, Paper } from '@mui/material'
import { Helmet } from 'react-helmet-async'

import { useAuth } from './hooks/useAuth'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { AuthDebug } from './components/debug/AuthDebug'

import ViewerPage from './pages/viewer/ViewerPage'
import PatientsPage from './pages/patients/PatientsPage'
import OrthancViewerPage from './pages/orthanc/OrthancViewerPage'

// Simple pages without complex dependencies
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'))



// Simple Protected Route
const SimpleProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth()

  console.log('SimpleProtectedRoute:', { isAuthenticated, isLoading, user })

  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login')
    return <Navigate to="/login" replace />
  }

  console.log('Authenticated, showing protected content')
  return <>{children}</>
}

function App() {
  const { isAuthenticated, isLoading, user, error } = useAuth()

  console.log('App render:', { isAuthenticated, isLoading, user, error })

  // BYPASS AUTHENTICATION FOR DICOM TESTING
  const bypassAuth = true

  if (false) {
    // Skip authentication and go directly to a simple test viewer
    return (
      <>
        <Helmet>
          <title>DICOM Viewer - Rubo DEMO (XA Study)</title>
        </Helmet>
        <CssBaseline />
        <div style={{
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          background: '#121212',
          color: '#fff',
          minHeight: '100vh',
          overflow: 'auto', // Enable scrolling
          maxHeight: 'none', // Remove height restrictions
          position: 'relative' // Ensure proper positioning
        }}>
          <h1>🏥 DICOM Medical Imaging Workstation</h1>
          <p>✅ React Application Loading Successfully</p>

          <div style={{
            background: '#1e1e1e',
            padding: '20px',
            borderRadius: '8px',
            margin: '20px 0',
            border: '1px solid #333'
          }}>
            <h2>System Status</h2>
            <p>✅ Authentication Bypass: Active</p>
            <p>✅ React Components: Rendering</p>
            <p>✅ Material-UI: Loaded</p>
            <p>✅ Ready for DICOM Integration</p>
          </div>

          <div style={{
            background: '#2563eb',
            padding: '15px',
            borderRadius: '8px',
            margin: '20px 0'
          }}>
            <h3>🎯 Quick Access</h3>
            <p>Static DICOM Viewer:
              <span
                style={{ color: '#fff', textDecoration: 'underline' }}
              >
                Removed legacy static viewer link
              </span>
            </p>
          </div>

          {/* Scroll Test Content */}
          <div style={{
            background: '#1e1e1e',
            padding: '20px',
            borderRadius: '8px',
            margin: '20px 0',
            border: '1px solid #333'
          }}>
            <h3>📋 Page Scroll Test</h3>
            <p>This section tests page scrolling functionality.</p>
            <div style={{ height: '200px', background: '#333', margin: '10px 0', padding: '20px' }}>
              <p>Scroll down to see more content...</p>
            </div>
          </div>

          {/* Professional Medical Imaging Workstation - User Guide */}
          <div style={{
            background: '#1a1a1a',
            color: '#fff',
            padding: '32px',
            borderRadius: '8px',
            margin: '32px 0',
            border: '1px solid #444'
          }}>
            <h2 style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#64b5f6',
              marginBottom: '24px'
            }}>
              <div style={{
                background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex'
              }}>
                📊
              </div>
              Professional Medical Imaging Workstation - User Guide
            </h2>

            {/* Quick Start Guide */}
            <div style={{ marginBottom: '32px', padding: '24px', background: '#2a2a2a', borderRadius: '8px', border: '1px solid #444' }}>
              <h3 style={{ color: '#4caf50', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🚀 Quick Start Guide
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', background: '#1e3a2e', borderRadius: '4px', border: '1px solid #4caf50' }}>
                  <h4 style={{ color: '#4caf50', marginBottom: '8px' }}>1. View Modes</h4>
                  <div style={{ color: '#e0e0e0', fontSize: '14px' }}>
                    • <strong>2D Mode</strong>: Standard image viewing with full tools<br />
                    • <strong>MPR Mode</strong>: Multi-planar reconstruction (Axial, Sagittal, Coronal)<br />
                    • <strong>3D Mode</strong>: Volume rendering with rotation controls
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#2e1e3a', borderRadius: '4px', border: '1px solid #9c27b0' }}>
                  <h4 style={{ color: '#ce93d8', marginBottom: '8px' }}>2. Measurement Tools</h4>
                  <div style={{ color: '#e0e0e0', fontSize: '14px' }}>
                    • <strong>Length</strong>: Click two points to measure distance<br />
                    • <strong>Angle</strong>: Click three points to measure angles<br />
                    • <strong>Area</strong>: Draw polygon to calculate area
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#1e2a3a', borderRadius: '4px', border: '1px solid #2196f3' }}>
                  <h4 style={{ color: '#90caf9', marginBottom: '8px' }}>3. Annotations</h4>
                  <div style={{ color: '#e0e0e0', fontSize: '14px' }}>
                    • <strong>Text</strong>: Add text annotations<br />
                    • <strong>Arrow</strong>: Point to regions of interest<br />
                    • <strong>Draw</strong>: Freehand drawing for marking
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#3a2a1e', borderRadius: '4px', border: '1px solid #ff9800' }}>
                  <h4 style={{ color: '#ffcc02', marginBottom: '8px' }}>4. Navigation</h4>
                  <div style={{ color: '#e0e0e0', fontSize: '14px' }}>
                    • <strong>Pan</strong>: Drag to move image<br />
                    • <strong>Zoom</strong>: Scroll to zoom in/out<br />
                    • <strong>W/L</strong>: Window/Level adjustment<br />
                    • <strong>Prev/Next</strong>: Navigate through frames
                  </div>
                </div>
              </div>
            </div>

            {/* Tool Instructions */}
            <div style={{ marginBottom: '32px', padding: '24px', background: '#2a2a2a', borderRadius: '8px', border: '1px solid #444' }}>
              <h3 style={{ color: '#ff9800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔧 How to Use Each Tool
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px' }}>
                  <h4 style={{ color: '#64b5f6', marginBottom: '8px' }}>📏 Length Measurement</h4>
                  <div style={{ color: '#ccc', fontSize: '14px' }}>
                    1. Click "LENGTH" button<br />
                    2. Click first point on image<br />
                    3. Click second point<br />
                    4. Distance shows in real-time
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px' }}>
                  <h4 style={{ color: '#64b5f6', marginBottom: '8px' }}>📐 Angle Measurement</h4>
                  <div style={{ color: '#ccc', fontSize: '14px' }}>
                    1. Click "ANGLE" button<br />
                    2. Click three points to form angle<br />
                    3. Angle measurement displays<br />
                    4. Shows in degrees
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px' }}>
                  <h4 style={{ color: '#64b5f6', marginBottom: '8px' }}>📊 Area Calculation</h4>
                  <div style={{ color: '#ccc', fontSize: '14px' }}>
                    1. Click "AREA" button<br />
                    2. Click multiple points to draw polygon<br />
                    3. Double-click to complete<br />
                    4. Area calculated automatically
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px' }}>
                  <h4 style={{ color: '#64b5f6', marginBottom: '8px' }}>📝 Text Annotations</h4>
                  <div style={{ color: '#ccc', fontSize: '14px' }}>
                    1. Click "TEXT" button<br />
                    2. Click where to place text<br />
                    3. Type your annotation<br />
                    4. Press Enter to confirm
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px' }}>
                  <h4 style={{ color: '#64b5f6', marginBottom: '8px' }}>🎯 Arrow Annotations</h4>
                  <div style={{ color: '#ccc', fontSize: '14px' }}>
                    1. Click "ARROW" button<br />
                    2. Click start point<br />
                    3. Click end point<br />
                    4. Arrow draws automatically
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '4px' }}>
                  <h4 style={{ color: '#64b5f6', marginBottom: '8px' }}>✏️ Freehand Drawing</h4>
                  <div style={{ color: '#ccc', fontSize: '14px' }}>
                    1. Click "DRAW" button<br />
                    2. Click and drag to draw<br />
                    3. Release to finish<br />
                    4. Use for marking regions
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Instructions */}
            <div style={{ marginBottom: '32px', padding: '24px', background: '#0d2818', borderRadius: '8px', border: '1px solid #4caf50' }}>
              <h3 style={{ color: '#4caf50', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📁 DICOM Upload Instructions
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h4 style={{ color: '#81c784', marginBottom: '8px' }}>Method 1: Upload Button</h4>
                  <div style={{ color: '#e8f5e8', fontSize: '14px' }}>
                    1. Click "UPLOAD STUDY" button in top toolbar<br />
                    2. Click "SELECT DICOM FILES" in dialog<br />
                    3. Choose your .dcm files<br />
                    4. Files process automatically<br />
                    5. Viewer switches to new study
                  </div>
                </div>

                <div>
                  <h4 style={{ color: '#81c784', marginBottom: '8px' }}>Method 2: Drag & Drop</h4>
                  <div style={{ color: '#e8f5e8', fontSize: '14px' }}>
                    1. Open file explorer<br />
                    2. Drag .dcm files onto viewer area<br />
                    3. Drop files when highlight appears<br />
                    4. Upload starts immediately<br />
                    5. New study loads automatically
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '4px' }}>
                <div style={{ color: '#a5d6a7', fontSize: '14px' }}>
                  <strong>💡 Tip:</strong> Supports both single-frame (MRI, CT slices) and multi-frame (Angiography, Cine) DICOM files.
                  Files are processed in real-time with automatic frame extraction.
                </div>
              </div>
            </div>
          </div>

          <React.Suspense fallback={<div>Loading advanced viewer...</div>}>
            <ViewerPage />
          </React.Suspense>

          {/* Bottom Content for Scroll Testing */}
          <div style={{
            background: '#0d47a1',
            padding: '30px',
            borderRadius: '8px',
            margin: '40px 0',
            textAlign: 'center'
          }}>
            <h3>🎯 End of Page - Scroll Test Complete</h3>
            <p>If you can see this section, page scrolling is working correctly!</p>
            <div style={{ height: '100px', background: 'rgba(255,255,255,0.1)', margin: '20px 0', borderRadius: '4px' }}>
              <p style={{ paddingTop: '35px' }}>Scroll back up to access the viewer</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    console.log('App showing loading screen')
    return <LoadingScreen message="Initializing application..." />
  }

  // Show error if authentication failed
  if (error) {
    console.error('Authentication error:', error)
  }

  return (
    <>
      <Helmet>
        <title>Medical Imaging Viewer</title>
        <meta name="description" content="Advanced medical imaging viewer with AI-powered analysis" />
      </Helmet>

      <CssBaseline />

      <React.Suspense fallback={<LoadingScreen message="Loading page..." />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage />
              )
            }
          />

          {/* Debug route */}
          <Route
            path="/debug"
            element={<AuthDebug />}
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <SimpleProtectedRoute>
                <PatientsPage />
              </SimpleProtectedRoute>
            }
          />



          <Route
            path="/viewer/:studyInstanceUID"
            element={
              <SimpleProtectedRoute>
                <ViewerPage />
              </SimpleProtectedRoute>
            }
          />

          <Route
            path="/patient/studies/:studyInstanceUID"
            element={
              <SimpleProtectedRoute>
                <ViewerPage />
              </SimpleProtectedRoute>
            }
          />

          {/* Orthanc Viewer - Direct access to Orthanc studies */}
          <Route
            path="/orthanc"
            element={
              <SimpleProtectedRoute>
                <OrthancViewerPage />
              </SimpleProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          {/* Catch all */}
          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </React.Suspense>
    </>
  )
}

export default App