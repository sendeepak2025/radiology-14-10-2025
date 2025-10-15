/**
 * AI Analysis Button Component
 * Triggers AI analysis for the current study
 */

import React, { useState } from 'react';
import {
  Button,
  CircularProgress,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  SmartToy as AIIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

interface AIAnalysisButtonProps {
  /** Study UID to analyze */
  studyUid: string;
  /** Whether analysis exists for this study */
  hasAnalysis?: boolean;
  /** Callback when analysis is triggered */
  onAnalyze: (studyUid: string) => Promise<void>;
  /** Callback when analysis is completed */
  onAnalysisComplete?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

export const AIAnalysisButton: React.FC<AIAnalysisButtonProps> = ({
  studyUid,
  hasAnalysis = false,
  onAnalyze,
  onAnalysisComplete,
  disabled = false,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      await onAnalyze(studyUid);
      
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      console.error('AI analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const buttonText = hasAnalysis ? 'View AI Analysis' : 'Analyze with AI';
  const tooltipText = hasAnalysis
    ? 'View existing AI analysis or run new analysis'
    : 'Run AI-powered image analysis to detect abnormalities';

  return (
    <Tooltip title={error || tooltipText} arrow>
      <span>
        <Button
          variant={hasAnalysis ? 'outlined' : 'contained'}
          color="primary"
          startIcon={
            isAnalyzing ? (
              <CircularProgress size={20} color="inherit" />
            ) : hasAnalysis ? (
              <Badge badgeContent={<CheckIcon style={{ fontSize: 12 }} />} color="success">
                <AIIcon />
              </Badge>
            ) : (
              <AIIcon />
            )
          }
          onClick={handleAnalyze}
          disabled={disabled || isAnalyzing}
          sx={{
            minWidth: 180,
            textTransform: 'none',
            fontWeight: hasAnalysis ? 500 : 600,
          }}
        >
          {isAnalyzing ? 'Analyzing...' : buttonText}
        </Button>
      </span>
    </Tooltip>
  );
};

export default AIAnalysisButton;
