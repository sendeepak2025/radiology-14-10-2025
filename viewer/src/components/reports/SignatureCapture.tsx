import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Draw as DrawIcon,
  Clear as ClearIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

interface SignatureCaptureProps {
  open: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  reportInfo?: {
    patientName?: string;
    studyDate?: string;
  };
}

/**
 * Signature Capture Component
 * Canvas-based signature capture for report signing
 */
const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  open,
  onClose,
  onSave,
  reportInfo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Configure drawing style
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [open]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    // Convert canvas to base64 image
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DrawIcon />
          <Typography variant="h6">Sign Report</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {reportInfo && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Patient: {reportInfo.patientName} | Date: {reportInfo.studyDate}
          </Alert>
        )}

        <Typography variant="caption" color="text.secondary" gutterBottom>
          Please sign in the box below
        </Typography>

        <Paper
          elevation={0}
          sx={{
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 1,
            p: 1,
            mt: 1,
            backgroundColor: 'grey.50',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{
              width: '100%',
              height: '200px',
              cursor: 'crosshair',
              backgroundColor: 'white',
              borderRadius: '4px',
            }}
          />
        </Paper>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Draw your signature above
          </Typography>
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearSignature}
            disabled={!hasSignature}
          >
            Clear
          </Button>
        </Box>

        <Alert severity="warning" sx={{ mt: 2 }}>
          By signing this report, you confirm the accuracy of the findings and take responsibility
          for the interpretation.
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<CheckIcon />}
          onClick={saveSignature}
          disabled={!hasSignature}
        >
          Sign Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignatureCapture;
