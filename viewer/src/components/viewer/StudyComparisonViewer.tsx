import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Grid,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  SwapHoriz as SwapIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Sync as SyncIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material';

interface Study {
  studyInstanceUID: string;
  patientName: string;
  patientID?: string;
  studyDate: string;
  modality: string;
  studyDescription?: string;
  numberOfInstances?: number;
}

interface StudyComparisonViewerProps {
  open: boolean;
  onClose: () => void;
  studies: Study[];
  onStudySelect?: (studyUID: string) => void;
}

/**
 * Study Comparison Viewer Component
 * Side-by-side comparison of medical imaging studies
 */
const StudyComparisonViewer: React.FC<StudyComparisonViewerProps> = ({
  open,
  onClose,
  studies,
  onStudySelect,
}) => {
  const [study1, setStudy1] = useState<Study | null>(studies[0] || null);
  const [study2, setStudy2] = useState<Study | null>(studies[1] || null);
  const [syncScroll, setSyncScroll] = useState(true);
  const [syncZoom, setSyncZoom] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studies.length > 0 && !study1) {
      setStudy1(studies[0]);
    }
    if (studies.length > 1 && !study2) {
      setStudy2(studies[1]);
    }
  }, [studies]);

  const handleSwapStudies = () => {
    const temp = study1;
    setStudy1(study2);
    setStudy2(temp);
  };

  const handleViewStudy = (studyUID: string) => {
    if (onStudySelect) {
      onStudySelect(studyUID);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString || dateString.length !== 8) return dateString || 'N/A';
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return `${month}/${day}/${year}`;
  };

  const renderStudyInfo = (study: Study | null, side: 'left' | 'right') => {
    if (!study) {
      return (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            p: 4,
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <CompareIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">
              Select a study to compare
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Study</InputLabel>
              <Select
                value=""
                onChange={(e) => {
                  const selected = studies.find(s => s.studyInstanceUID === e.target.value);
                  if (selected) {
                    if (side === 'left') {
                      setStudy1(selected);
                    } else {
                      setStudy2(selected);
                    }
                  }
                }}
                label="Select Study"
              >
                {studies.map((s) => (
                  <MenuItem key={s.studyInstanceUID} value={s.studyInstanceUID}>
                    {s.patientName} - {s.modality} - {formatDate(s.studyDate)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Box>
      );
    }

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Study Header */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {study.patientName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {study.patientID || 'N/A'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Chip label={study.modality} size="small" color="primary" />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={study.studyInstanceUID}
                    onChange={(e) => {
                      const selected = studies.find(s => s.studyInstanceUID === e.target.value);
                      if (selected) {
                        if (side === 'left') {
                          setStudy1(selected);
                        } else {
                          setStudy2(selected);
                        }
                      }
                    }}
                    size="small"
                  >
                    {studies.map((s) => (
                      <MenuItem key={s.studyInstanceUID} value={s.studyInstanceUID}>
                        {formatDate(s.studyDate)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Study Date
                </Typography>
                <Typography variant="body2">
                  {formatDate(study.studyDate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Images
                </Typography>
                <Typography variant="body2">
                  {study.numberOfInstances || 0}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body2">
                  {study.studyDescription || 'No description'}
                </Typography>
              </Grid>
            </Grid>

            <Button
              size="small"
              variant="outlined"
              onClick={() => handleViewStudy(study.studyInstanceUID)}
              fullWidth
            >
              Open in Viewer
            </Button>
          </Stack>
        </Paper>

        {/* Viewer Area - Placeholder for actual image viewer */}
        <Box
          sx={{
            flex: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.900',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 100,
                height: 100,
                border: '2px solid',
                borderColor: 'grey.700',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h4" color="grey.600">
                {study.modality}
              </Typography>
            </Box>
            <Typography variant="body2" color="grey.500">
              Study Viewer Placeholder
            </Typography>
            <Typography variant="caption" color="grey.600">
              {study.numberOfInstances || 0} images available
            </Typography>
          </Stack>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareIcon color="primary" />
            <Typography variant="h6">Study Comparison</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Swap Studies">
              <IconButton onClick={handleSwapStudies} disabled={!study1 || !study2}>
                <SwapIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={`${syncScroll ? 'Disable' : 'Enable'} Synchronized Scrolling`}>
              <IconButton
                onClick={() => setSyncScroll(!syncScroll)}
                color={syncScroll ? 'primary' : 'default'}
              >
                <SyncIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={`${syncZoom ? 'Disable' : 'Enable'} Synchronized Zoom`}>
              <IconButton
                onClick={() => setSyncZoom(!syncZoom)}
                color={syncZoom ? 'primary' : 'default'}
              >
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {studies.length < 2 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You need at least 2 studies to use the comparison feature.
            {studies.length === 1 && ' Please select another study.'}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ height: '100%' }}>
          <Grid item xs={12} md={6} sx={{ height: '100%' }}>
            {renderStudyInfo(study1, 'left')}
          </Grid>

          <Grid item xs={12} md={6} sx={{ height: '100%' }}>
            {renderStudyInfo(study2, 'right')}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
          <Chip
            label={syncScroll ? 'Scroll Sync: ON' : 'Scroll Sync: OFF'}
            size="small"
            color={syncScroll ? 'success' : 'default'}
          />
          <Chip
            label={syncZoom ? 'Zoom Sync: ON' : 'Zoom Sync: OFF'}
            size="small"
            color={syncZoom ? 'success' : 'default'}
          />
        </Stack>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudyComparisonViewer;
