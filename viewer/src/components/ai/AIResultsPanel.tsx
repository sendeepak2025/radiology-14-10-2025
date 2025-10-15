/**
 * AI Results Panel Component
 * Displays AI analysis results in a right sidebar
 */

import React, { useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Divider,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Button,
  TextField,
  Alert,
  Collapse,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  SmartToy as AIIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Edit as EditIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import type { AIAnalysisHistory, AIFinding } from '@/services/aiDetectionService';

interface AIResultsPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Callback when panel is closed */
  onClose: () => void;
  /** AI analysis result */
  analysis: AIAnalysisHistory | null;
  /** Whether analysis is loading */
  loading?: boolean;
  /** Callback when review status is updated */
  onUpdateReview?: (status: 'confirmed' | 'rejected' | 'modified', notes: string) => Promise<void>;
  /** Current user name */
  userName?: string;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <ErrorIcon color="error" />;
    case 'high':
      return <WarningIcon color="warning" />;
    case 'moderate':
      return <InfoIcon color="info" />;
    case 'low':
    case 'none':
      return <CheckCircleIcon color="success" />;
    default:
      return <InfoIcon />;
  }
};

const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'success' | 'default' => {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'moderate':
      return 'info';
    case 'low':
    case 'none':
      return 'success';
    default:
      return 'default';
  }
};

const getConfidenceColor = (confidence: string): 'success' | 'warning' | 'error' => {
  switch (confidence) {
    case 'high':
      return 'success';
    case 'moderate':
      return 'warning';
    case 'low':
      return 'error';
    default:
      return 'warning';
  }
};

export const AIResultsPanel: React.FC<AIResultsPanelProps> = ({
  open,
  onClose,
  analysis,
  loading = false,
  onUpdateReview,
  userName = 'Current User',
}) => {
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'confirmed' | 'rejected' | 'modified' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReviewSubmit = async (status: 'confirmed' | 'rejected' | 'modified') => {
    if (!onUpdateReview) return;

    try {
      setIsSubmitting(true);
      setReviewStatus(status);
      await onUpdateReview(status, reviewNotes);
      setShowReviewForm(false);
      setReviewNotes('');
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
      setReviewStatus(null);
    }
  };

  const toggleFinding = (index: number) => {
    setExpandedFinding(expandedFinding === index ? null : index);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 450, md: 500 },
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'primary.main',
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon />
            <Typography variant="h6">AI Analysis Results</Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {loading && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                Analyzing with AI...
              </Typography>
            </Box>
          )}

          {!loading && !analysis && (
            <Alert severity="info">No AI analysis available for this study.</Alert>
          )}

          {!loading && analysis && (
            <>
              {/* Model & Timestamp */}
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Model: {analysis.modelUsed}
                    </Typography>
                    <Chip
                      label={analysis.aiConfidence}
                      color={getConfidenceColor(analysis.aiConfidence)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Analyzed: {format(new Date(analysis.analysisTimestamp), 'PPpp')}
                  </Typography>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Summary
                  </Typography>
                  <Typography variant="body2">{analysis.summary}</Typography>
                </CardContent>
              </Card>

              {/* Findings */}
              {analysis.findings && analysis.findings.length > 0 && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Findings ({analysis.findings.length})
                    </Typography>
                    <List dense>
                      {analysis.findings.map((finding: AIFinding, index: number) => (
                        <React.Fragment key={index}>
                          <ListItem
                            button
                            onClick={() => toggleFinding(index)}
                            sx={{
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1,
                              bgcolor: finding.severity === 'critical' ? 'error.light' : 'background.paper',
                            }}
                          >
                            <ListItemIcon>{getSeverityIcon(finding.severity)}</ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip
                                    label={finding.category}
                                    size="small"
                                    color={getSeverityColor(finding.severity)}
                                  />
                                  <Chip label={finding.confidence} size="small" variant="outlined" />
                                  {finding.severity === 'critical' && (
                                    <Badge badgeContent="!" color="error">
                                      <span />
                                    </Badge>
                                  )}
                                </Box>
                              }
                              secondary={finding.location || 'Location not specified'}
                            />
                            <IconButton size="small">
                              {expandedFinding === index ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </ListItem>
                          <Collapse in={expandedFinding === index}>
                            <Card variant="outlined" sx={{ ml: 2, mb: 1, p: 2 }}>
                              <Typography variant="body2">{finding.description}</Typography>
                            </Card>
                          </Collapse>
                        </React.Fragment>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Recommendations
                    </Typography>
                    <List dense>
                      {analysis.recommendations.map((rec: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <InfoIcon color="info" />
                          </ListItemIcon>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}

              {/* Review Status */}
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Review Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                      label={analysis.reviewStatus}
                      color={
                        analysis.reviewStatus === 'confirmed'
                          ? 'success'
                          : analysis.reviewStatus === 'rejected'
                          ? 'error'
                          : 'default'
                      }
                      size="small"
                    />
                    {analysis.reviewedBy && (
                      <Typography variant="caption" color="text.secondary">
                        by {analysis.reviewedBy}
                      </Typography>
                    )}
                  </Box>
                  {analysis.radiologistNotes && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      {analysis.radiologistNotes}
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Review Actions */}
              {analysis.reviewStatus === 'pending' && onUpdateReview && (
                <Card variant="outlined">
                  <CardContent>
                    {!showReviewForm ? (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          startIcon={<ThumbUpIcon />}
                          variant="contained"
                          color="success"
                          onClick={() => handleReviewSubmit('confirmed')}
                          disabled={isSubmitting}
                        >
                          Confirm
                        </Button>
                        <Button
                          startIcon={<ThumbDownIcon />}
                          variant="contained"
                          color="error"
                          onClick={() => handleReviewSubmit('rejected')}
                          disabled={isSubmitting}
                        >
                          Reject
                        </Button>
                        <Button
                          startIcon={<EditIcon />}
                          variant="outlined"
                          onClick={() => setShowReviewForm(true)}
                        >
                          Add Notes
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Radiologist Notes"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          sx={{ mb: 2 }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            onClick={() => handleReviewSubmit('modified')}
                            disabled={isSubmitting}
                          >
                            Submit with Notes
                          </Button>
                          <Button variant="outlined" onClick={() => setShowReviewForm(false)}>
                            Cancel
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default AIResultsPanel;
