import React, { useRef, useState, useEffect } from 'react'
import { Box, Button, Paper, Typography } from '@mui/material'
import { Clear as ClearIcon, Check as CheckIcon } from '@mui/icons-material'

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void
  onClear?: () => void
  width?: number
  height?: number
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onClear,
  width = 500,
  height = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas background to white
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)
    
    // Set drawing style
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [width, height])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setIsEmpty(false)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)
    setIsEmpty(true)
    
    if (onClear) {
      onClear()
    }
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) return

    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <Paper elevation={3} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
      <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
        ✍️ Draw Your Signature
      </Typography>
      
      <Box
        sx={{
          border: '2px solid #ccc',
          borderRadius: 1,
          bgcolor: 'white',
          cursor: 'crosshair',
          mb: 2
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{ display: 'block' }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={clearSignature}
          disabled={isEmpty}
          fullWidth
        >
          Clear
        </Button>
        <Button
          variant="contained"
          startIcon={<CheckIcon />}
          onClick={saveSignature}
          disabled={isEmpty}
          color="success"
          fullWidth
        >
          Save Signature
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        💡 Draw your signature using your mouse or touchpad
      </Typography>
    </Paper>
  )
}

export default SignaturePad
