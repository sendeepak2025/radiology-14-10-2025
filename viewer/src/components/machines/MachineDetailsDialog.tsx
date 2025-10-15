/**
 * Machine Details Dialog
 * Shows detailed information, configuration, and QR code
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import machineService, { type Machine } from '../../services/machineService';

interface MachineDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  machine: Machine;
  onUpdate: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`machine-tabpanel-${index}`}
      aria-labelledby={`machine-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const MachineDetailsDialog: React.FC<MachineDetailsDialogProps> = ({
  open,
  onClose,
  machine,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open && activeTab === 1) {
      loadConfiguration();
    }
  }, [open, activeTab]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const data = await machineService.generateConfig(machine.machineId, 'qr');
      setQrCode(data.qrCode);
      setConfig(data.config);
    } catch (err) {
      console.error('Failed to load configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      await machineService.testConnection(machine.machineId);
      onUpdate();
    } catch (err) {
      console.error('Test failed:', err);
    } finally {
      setTesting(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a snackbar notification here
  };

  const handleDownloadConfig = () => {
    if (!config) return;

    const configText = `CLOUD PACS CONFIGURATION
========================
Organization: ${machine.organizationName}
Machine: ${machine.name} (${machine.machineType})

DICOM DESTINATION SETTINGS:
---------------------------
AE Title: ${config.destination.aeTitle}
IP Address: ${config.destination.ipAddress}
Port: ${config.destination.port}

YOUR MACHINE SETTINGS:
---------------------
AE Title: ${machine.aeTitle}
IP Address: ${machine.ipAddress}
Port: ${machine.port}

SETUP INSTRUCTIONS:
------------------
${config.instructions.join('\n')}
    `;

    const blob = new Blob([configText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${machine.name.replace(/\s+/g, '-')}-config.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5">{machine.name}</Typography>
            <Chip
              label={machine.status.toUpperCase()}
              color={getStatusColor(machine.status)}
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Details" />
          <Tab label="Configuration" />
          <Tab label="Statistics" />
        </Tabs>
      </Box>

      <DialogContent>
        {/* Details Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Machine Information
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Type:</Typography>
                    <Typography variant="body2" fontWeight="bold">{machine.machineType}</Typography>
                  </Box>
                  {machine.manufacturer && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Manufacturer:</Typography>
                      <Typography variant="body2" fontWeight="bold">{machine.manufacturer}</Typography>
                    </Box>
                  )}
                  {machine.model && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Model:</Typography>
                      <Typography variant="body2" fontWeight="bold">{machine.model}</Typography>
                    </Box>
                  )}
                  {machine.serialNumber && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Serial:</Typography>
                      <Typography variant="body2" fontWeight="bold">{machine.serialNumber}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Network Configuration
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                    <Typography variant="body2">IP Address:</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{machine.ipAddress}:{machine.port}</Typography>
                      <Tooltip title="Copy">
                        <IconButton size="small" onClick={() => handleCopyToClipboard(`${machine.ipAddress}:${machine.port}`)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                    <Typography variant="body2">AE Title:</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{machine.aeTitle}</Typography>
                      <Tooltip title="Copy">
                        <IconButton size="small" onClick={() => handleCopyToClipboard(machine.aeTitle)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={testing ? <CircularProgress size={20} /> : <RefreshIcon />}
                      onClick={handleTestConnection}
                      disabled={testing}
                    >
                      {testing ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </Box>
                  {machine.connectionTestResult && (
                    <Alert
                      severity={machine.connectionTestResult.success ? 'success' : 'error'}
                      sx={{ mt: 2 }}
                    >
                      {machine.connectionTestResult.message}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {machine.location && (machine.location.building || machine.location.room) && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Location
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2">
                      {[machine.location.building, machine.location.floor, machine.location.room]
                        .filter(Boolean)
                        .join(' • ')}
                    </Typography>
                    {machine.location.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {machine.location.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}

            {machine.notes && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Notes
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2">{machine.notes}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Configuration Tab */}
        <TabPanel value={activeTab} index={1}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      QR Code Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Scan this QR code with your mobile device for quick setup
                    </Typography>
                    {qrCode && (
                      <Box sx={{ textAlign: 'center' }}>
                        <img src={qrCode} alt="QR Code" style={{ maxWidth: '100%', height: 'auto' }} />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Manual Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Use these settings to configure your machine
                    </Typography>
                    {config && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Cloud PACS Destination:
                        </Typography>
                        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mt: 1, mb: 2 }}>
                          <Typography variant="body2" fontFamily="monospace">
                            AE Title: {config.destination.aeTitle}<br />
                            IP: {config.destination.ipAddress}<br />
                            Port: {config.destination.port}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<DownloadIcon />}
                          onClick={handleDownloadConfig}
                        >
                          Download Config File
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {config && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="subtitle2" gutterBottom>
                      Setup Instructions
                    </Typography>
                    <ol style={{ margin: 0, paddingLeft: 20 }}>
                      {config.instructions.map((instruction: string, index: number) => (
                        <li key={index}>
                          <Typography variant="body2">{instruction}</Typography>
                        </li>
                      ))}
                    </ol>
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        {/* Statistics Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Total Studies
                  </Typography>
                  <Typography variant="h4">
                    {machine.totalStudiesReceived}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Last Study
                  </Typography>
                  <Typography variant="h6">
                    {machine.lastStudyReceived
                      ? new Date(machine.lastStudyReceived).toLocaleDateString()
                      : 'Never'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Last Seen
                  </Typography>
                  <Typography variant="h6">
                    {machine.lastSeen
                      ? new Date(machine.lastSeen).toLocaleString()
                      : 'Never'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Status
                  </Typography>
                  <Chip
                    label={machine.status.toUpperCase()}
                    color={getStatusColor(machine.status)}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MachineDetailsDialog;
