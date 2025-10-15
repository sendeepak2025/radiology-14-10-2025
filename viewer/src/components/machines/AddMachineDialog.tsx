/**
 * Add Machine Dialog
 * Wizard-style dialog for adding new medical imaging machines
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Alert,
  Grid,
  InputAdornment
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Cable as CableIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';

interface AddMachineDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (machine: any) => Promise<void>;
}

const steps = ['Machine Details', 'Network Configuration', 'Location (Optional)'];

const machineTypes = [
  { value: 'CT', label: 'CT Scanner' },
  { value: 'MRI', label: 'MRI Scanner' },
  { value: 'PET', label: 'PET Scanner' },
  { value: 'XRAY', label: 'X-Ray Machine' },
  { value: 'US', label: 'Ultrasound' },
  { value: 'CR', label: 'Computed Radiography' },
  { value: 'DX', label: 'Digital X-Ray' },
  { value: 'MG', label: 'Mammography' },
  { value: 'OTHER', label: 'Other' }
];

const AddMachineDialog: React.FC<AddMachineDialogProps> = ({ open, onClose, onAdd }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    machineType: 'CT',
    manufacturer: '',
    model: '',
    serialNumber: '',
    ipAddress: '',
    port: '4242',
    aeTitle: '',
    callingAeTitle: 'ORTHANC',
    location: {
      building: '',
      floor: '',
      room: '',
      description: ''
    },
    notes: ''
  });

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('location.')) {
      const locationField = field.split('.')[1];
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          [locationField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: value
      });

      // Auto-generate AE Title from machine type if empty
      if (field === 'machineType' && !formData.aeTitle) {
        setFormData(prev => ({
          ...prev,
          aeTitle: value
        }));
      }
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      name: '',
      machineType: 'CT',
      manufacturer: '',
      model: '',
      serialNumber: '',
      ipAddress: '',
      port: '4242',
      aeTitle: '',
      callingAeTitle: 'ORTHANC',
      location: {
        building: '',
        floor: '',
        room: '',
        description: ''
      },
      notes: ''
    });
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.name || !formData.ipAddress) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate IP address format
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(formData.ipAddress)) {
        setError('Invalid IP address format');
        return;
      }

      await onAdd({
        ...formData,
        port: parseInt(formData.port)
      });

      handleReset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add machine');
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Machine Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., CT Scanner - Room 1"
              required
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ComputerIcon />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Machine Type *</InputLabel>
              <Select
                value={formData.machineType}
                onChange={(e) => handleChange('machineType', e.target.value)}
                label="Machine Type *"
              >
                {machineTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Manufacturer"
              value={formData.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              placeholder="e.g., Siemens, GE, Philips"
              sx={{ mb: 2 }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Model"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="e.g., SOMATOM Definition"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Serial Number"
                  value={formData.serialNumber}
                  onChange={(e) => handleChange('serialNumber', e.target.value)}
                  placeholder="Optional"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Enter the network details of your medical imaging machine
            </Alert>

            <TextField
              fullWidth
              label="IP Address"
              value={formData.ipAddress}
              onChange={(e) => handleChange('ipAddress', e.target.value)}
              placeholder="e.g., 192.168.1.100"
              required
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CableIcon />
                  </InputAdornment>
                ),
              }}
              helperText="The IP address of your machine on the local network"
            />

            <TextField
              fullWidth
              label="DICOM Port"
              value={formData.port}
              onChange={(e) => handleChange('port', e.target.value)}
              type="number"
              sx={{ mb: 2 }}
              helperText="Default DICOM port is 4242"
            />

            <TextField
              fullWidth
              label="AE Title"
              value={formData.aeTitle}
              onChange={(e) => handleChange('aeTitle', e.target.value.toUpperCase())}
              placeholder="e.g., CT1"
              required
              sx={{ mb: 2 }}
              inputProps={{ maxLength: 16, style: { textTransform: 'uppercase' } }}
              helperText="DICOM Application Entity Title (max 16 characters)"
            />

            <TextField
              fullWidth
              label="Calling AE Title"
              value={formData.callingAeTitle}
              onChange={(e) => handleChange('callingAeTitle', e.target.value.toUpperCase())}
              sx={{ mb: 2 }}
              inputProps={{ maxLength: 16, style: { textTransform: 'uppercase' } }}
              helperText="Leave as ORTHANC unless you have custom configuration"
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Optional: Specify the physical location of this machine
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Building"
                  value={formData.location.building}
                  onChange={(e) => handleChange('location.building', e.target.value)}
                  placeholder="e.g., Main Building"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Floor"
                  value={formData.location.floor}
                  onChange={(e) => handleChange('location.floor', e.target.value)}
                  placeholder="e.g., 2nd Floor"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Room"
                  value={formData.location.room}
                  onChange={(e) => handleChange('location.room', e.target.value)}
                  placeholder="e.g., Room 204"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.location.description}
                  onChange={(e) => handleChange('location.description', e.target.value)}
                  placeholder="Additional location details"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any additional notes about this machine"
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h5">Add New Machine</Typography>
        <Typography variant="body2" color="text.secondary">
          Register a new medical imaging machine to your cloud PACS
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {getStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          disabled={activeStep === 0 || loading}
          onClick={handleBack}
        >
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Machine'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddMachineDialog;
