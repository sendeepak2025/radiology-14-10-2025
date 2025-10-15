/**
 * Machines Dashboard Page
 * Main page for managing medical imaging machines
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  Tooltip,
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Computer as ComputerIcon,
  CheckCircle as OnlineIcon,
  Error as OfflineIcon,
  HourglassEmpty as PendingIcon,
  Loop as TestingIcon,
  Settings as SettingsIcon,
  QrCode as QrCodeIcon,
  Cable as CableIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import machineService, { type Machine } from '../../services/machineService';
import AddMachineDialog from '../../components/machines/AddMachineDialog';
import MachineDetailsDialog from '../../components/machines/MachineDetailsDialog';

const MachinesDashboard: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [testingMachineId, setTestingMachineId] = useState<string | null>(null);

  // TODO: Get from user context
  const organizationId = 'ORG-DEFAULT';
  const organizationName = 'My Hospital';

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await machineService.getMachines(organizationId);
      setMachines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMachine = async (machine: any) => {
    try {
      await machineService.createMachine({
        ...machine,
        organizationId,
        organizationName
      });
      await loadMachines();
      setAddDialogOpen(false);
    } catch (err) {
      throw err;
    }
  };

  const handleTestConnection = async (machineId: string) => {
    try {
      setTestingMachineId(machineId);
      await machineService.testConnection(machineId);
      await loadMachines();
    } catch (err) {
      console.error('Test failed:', err);
    } finally {
      setTestingMachineId(null);
    }
  };

  const handleDeleteMachine = async (machineId: string) => {
    if (!window.confirm('Are you sure you want to delete this machine?')) {
      return;
    }

    try {
      await machineService.deleteMachine(machineId);
      await loadMachines();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleViewDetails = (machine: Machine) => {
    setSelectedMachine(machine);
    setDetailsDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <OnlineIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'offline':
        return <OfflineIcon sx={{ color: 'error.main', fontSize: 20 }} />;
      case 'testing':
        return <TestingIcon sx={{ color: 'info.main', fontSize: 20 }} />;
      case 'pending':
        return <PendingIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
      default:
        return <OfflineIcon sx={{ color: 'grey.500', fontSize: 20 }} />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'testing':
        return 'info';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTimeSince = (date?: string) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getMachineIcon = (type: string) => {
    return <ComputerIcon sx={{ fontSize: 48, color: 'primary.main' }} />;
  };

  return (
    <>
      <Helmet>
        <title>My Machines - Medical Imaging PACS</title>
      </Helmet>

      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              My Machines
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your medical imaging machines and monitor their status
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={loadMachines} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
              size="large"
            >
              Add Machine
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Machines
                </Typography>
                <Typography variant="h3">{machines.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Online
                </Typography>
                <Typography variant="h3" color="success.main">
                  {machines.filter(m => m.status === 'online').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Pending
                </Typography>
                <Typography variant="h3" color="warning.main">
                  {machines.filter(m => m.status === 'pending').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Studies
                </Typography>
                <Typography variant="h3">
                  {machines.reduce((sum, m) => sum + m.totalStudiesReceived, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Empty State */}
        {!loading && machines.length === 0 && (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <ComputerIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                No Machines Yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Get started by adding your first medical imaging machine
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                size="large"
              >
                Add Your First Machine
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Machines Grid */}
        {!loading && machines.length > 0 && (
          <Grid container spacing={3}>
            {machines.map((machine) => (
              <Grid item xs={12} sm={6} md={4} key={machine.machineId}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: machine.status === 'online' ? '2px solid' : '1px solid',
                    borderColor: machine.status === 'online' ? 'success.main' : 'divider',
                    '&:hover': {
                      boxShadow: 6,
                      cursor: 'pointer'
                    }
                  }}
                  onClick={() => handleViewDetails(machine)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Machine Icon & Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      {getMachineIcon(machine.machineType)}
                      <Chip
                        icon={getStatusIcon(machine.status)}
                        label={machine.status.toUpperCase()}
                        color={getStatusColor(machine.status)}
                        size="small"
                      />
                    </Box>

                    {/* Machine Name & Type */}
                    <Typography variant="h6" gutterBottom noWrap>
                      {machine.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {machine.machineType} Scanner
                      {machine.manufacturer && ` • ${machine.manufacturer}`}
                    </Typography>

                    {/* Connection Info */}
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CableIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {machine.ipAddress}:{machine.port}
                      </Typography>
                    </Box>

                    {/* Statistics */}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Studies
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {machine.totalStudiesReceived}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Last Seen
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {getTimeSince(machine.lastSeen)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Tooltip title="Test Connection">
                      <span>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestConnection(machine.machineId);
                          }}
                          disabled={testingMachineId === machine.machineId}
                        >
                          {testingMachineId === machine.machineId ? (
                            <CircularProgress size={20} />
                          ) : (
                            <RefreshIcon />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Configuration">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(machine);
                        }}
                      >
                        <QrCodeIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Settings">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(machine);
                        }}
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMachine(machine.machineId);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Floating Action Button for Mobile */}
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', md: 'none' }
          }}
          onClick={() => setAddDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* Add Machine Dialog */}
      <AddMachineDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddMachine}
      />

      {/* Machine Details Dialog */}
      {selectedMachine && (
        <MachineDetailsDialog
          open={detailsDialogOpen}
          onClose={() => {
            setDetailsDialogOpen(false);
            setSelectedMachine(null);
          }}
          machine={selectedMachine}
          onUpdate={loadMachines}
        />
      )}
    </>
  );
};

export default MachinesDashboard;
