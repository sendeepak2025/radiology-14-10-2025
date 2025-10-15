import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as PdfIcon,
  TableChart as CsvIcon,
  Code as JsonIcon,
  TextFields as TxtIcon,
} from '@mui/icons-material';

import exportService from '../../services/exportService';

interface ExportButtonProps {
  type: 'study' | 'report';
  data: any;
  studyInfo?: any;
  disabled?: boolean;
}

/**
 * Export Button Component
 * Provides export options for studies and reports
 */
const ExportButton: React.FC<ExportButtonProps> = ({
  type,
  data,
  studyInfo,
  disabled = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (format: string) => {
    setExporting(true);
    try {
      if (type === 'study') {
        // Export studies
        switch (format) {
          case 'csv':
            exportService.exportStudiesToCSV(Array.isArray(data) ? data : [data]);
            break;
          case 'json':
            exportService.exportStudiesToJSON(Array.isArray(data) ? data : [data]);
            break;
        }
      } else if (type === 'report') {
        // Export report
        switch (format) {
          case 'pdf':
            await exportService.exportReportToPDF(data, studyInfo);
            break;
          case 'json':
            exportService.exportReportToJSON(data);
            break;
          case 'txt':
            exportService.exportReportToTXT(data, studyInfo);
            break;
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
      handleClose();
    }
  };

  return (
    <>
      <Tooltip title={`Export ${type}`}>
        <IconButton
          onClick={handleClick}
          disabled={disabled || exporting}
          size="small"
        >
          {exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {type === 'study' && [
          <MenuItem key="csv" onClick={() => handleExport('csv')}>
            <ListItemIcon>
              <CsvIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as CSV</ListItemText>
          </MenuItem>,
          <MenuItem key="json" onClick={() => handleExport('json')}>
            <ListItemIcon>
              <JsonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as JSON</ListItemText>
          </MenuItem>,
        ]}

        {type === 'report' && [
          <MenuItem key="pdf" onClick={() => handleExport('pdf')}>
            <ListItemIcon>
              <PdfIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as HTML</ListItemText>
          </MenuItem>,
          <MenuItem key="txt" onClick={() => handleExport('txt')}>
            <ListItemIcon>
              <TxtIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as TXT</ListItemText>
          </MenuItem>,
          <MenuItem key="json" onClick={() => handleExport('json')}>
            <ListItemIcon>
              <JsonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as JSON</ListItemText>
          </MenuItem>,
        ]}
      </Menu>
    </>
  );
};

export default ExportButton;
