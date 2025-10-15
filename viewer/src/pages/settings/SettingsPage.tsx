/**
 * Settings Page - Organization & User Management
 * Apple-style clean interface for provider settings
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Avatar,
  Stack,
  Divider,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  Check as CheckIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';

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
      id={`settings-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface OrganizationSettings {
  organizationName: string;
  organizationId: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string | null;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  licenseNumber: string;
  email: string;
  phone: string;
  signature: string | null;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  fullName: string;
  createdAt: string;
}

const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Organization Settings
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    organizationName: 'Medical Imaging Center',
    organizationId: 'ORG-DEFAULT',
    address: '123 Medical Drive, City, State 12345',
    phone: '+1 (555) 123-4567',
    email: 'info@medicalimaging.com',
    website: 'www.medicalimaging.com',
    logo: null,
  });

  // Doctors List
  const [doctors, setDoctors] = useState<Doctor[]>([
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      specialization: 'Radiologist',
      licenseNumber: 'RAD-12345',
      email: 'sarah.johnson@hospital.com',
      phone: '+1 (555) 234-5678',
      signature: null,
    },
  ]);

  // Users List
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      username: 'admin',
      email: 'admin@medicalimaging.com',
      role: 'admin',
      fullName: 'System Administrator',
      createdAt: new Date().toISOString(),
    },
  ]);

  // Dialogs
  const [addDoctorOpen, setAddDoctorOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);

  // New Doctor Form
  const [newDoctor, setNewDoctor] = useState<Partial<Doctor>>({
    name: '',
    specialization: '',
    licenseNumber: '',
    email: '',
    phone: '',
    signature: null,
  });

  // New User Form
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'user',
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOrgSettings({ ...orgSettings, logo: reader.result as string });
        setSuccess('Logo uploaded successfully');
        setTimeout(() => setSuccess(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveOrganization = async () => {
    setLoading(true);
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Organization settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = () => {
    if (!newDoctor.name || !newDoctor.email) {
      setError('Please fill in required fields');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const doctor: Doctor = {
      id: Date.now().toString(),
      name: newDoctor.name!,
      specialization: newDoctor.specialization || '',
      licenseNumber: newDoctor.licenseNumber || '',
      email: newDoctor.email!,
      phone: newDoctor.phone || '',
      signature: newDoctor.signature || null,
    };

    setDoctors([...doctors, doctor]);
    setAddDoctorOpen(false);
    setNewDoctor({
      name: '',
      specialization: '',
      licenseNumber: '',
      email: '',
      phone: '',
      signature: null,
    });
    setSuccess('Doctor added successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDoctor({ ...newDoctor, signature: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteDoctor = (id: string) => {
    setDoctors(doctors.filter(d => d.id !== id));
    setSuccess('Doctor removed successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleAddUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setError('Please fill in all required fields');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const user: User = {
      id: Date.now().toString(),
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
      createdAt: new Date().toISOString(),
    };

    setUsers([...users, user]);
    setAddUserOpen(false);
    setNewUser({
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'user',
    });
    setSuccess('User created successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
    setSuccess('User deleted successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <>
      <Helmet>
        <title>Settings - Medical Imaging Viewer</title>
      </Helmet>

      <Box sx={{ minHeight: '100vh', backgroundColor: '#F5F5F7', p: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight="700" sx={{ color: '#000000', mb: 1 }}>
            Settings
          </Typography>
          <Typography variant="body1" sx={{ color: '#6E6E73' }}>
            Manage your organization profile and users
          </Typography>
        </Box>

        {/* Status Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Main Content */}
        <Paper
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 3,
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              px: 2,
            }}
          >
            <Tab
              icon={<BusinessIcon />}
              iconPosition="start"
              label="Organization"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              icon={<PersonIcon />}
              iconPosition="start"
              label="Doctors"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              icon={<PeopleIcon />}
              iconPosition="start"
              label="Users"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
          </Tabs>

          {/* Organization Settings Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ px: 4, maxWidth: 800 }}>
              <Typography variant="h5" fontWeight="600" sx={{ mb: 3, color: '#000000' }}>
                Organization Profile
              </Typography>

              {/* Logo Upload */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: '#000000' }}>
                  Organization Logo
                </Typography>
                <Stack direction="row" spacing={3} alignItems="center">
                  <Avatar
                    src={orgSettings.logo || undefined}
                    sx={{
                      width: 100,
                      height: 100,
                      backgroundColor: '#007AFF',
                      fontSize: '2rem',
                    }}
                  >
                    {orgSettings.organizationName.charAt(0)}
                  </Avatar>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                  >
                    Upload Logo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Organization Details */}
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Organization Name"
                    value={orgSettings.organizationName}
                    onChange={(e) =>
                      setOrgSettings({ ...orgSettings, organizationName: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Organization ID"
                    value={orgSettings.organizationId}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={orgSettings.phone}
                    onChange={(e) =>
                      setOrgSettings({ ...orgSettings, phone: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={orgSettings.email}
                    onChange={(e) =>
                      setOrgSettings({ ...orgSettings, email: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Website"
                    value={orgSettings.website}
                    onChange={(e) =>
                      setOrgSettings({ ...orgSettings, website: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    multiline
                    rows={2}
                    value={orgSettings.address}
                    onChange={(e) =>
                      setOrgSettings({ ...orgSettings, address: e.target.value })
                    }
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveOrganization}
                  disabled={loading}
                >
                  Save Changes
                </Button>
              </Stack>
            </Box>
          </TabPanel>

          {/* Doctors Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ px: 4 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 3 }}
              >
                <Typography variant="h5" fontWeight="600" sx={{ color: '#000000' }}>
                  Doctors & Staff
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDoctorOpen(true)}
                >
                  Add Doctor
                </Button>
              </Stack>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Specialization</TableCell>
                      <TableCell>License Number</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Signature</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {doctors.map((doctor) => (
                      <TableRow key={doctor.id}>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ backgroundColor: '#007AFF' }}>
                              {doctor.name.charAt(0)}
                            </Avatar>
                            <Typography fontWeight="500">{doctor.name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{doctor.specialization}</TableCell>
                        <TableCell>{doctor.licenseNumber}</TableCell>
                        <TableCell>{doctor.email}</TableCell>
                        <TableCell>{doctor.phone}</TableCell>
                        <TableCell>
                          {doctor.signature ? (
                            <Chip
                              label="Uploaded"
                              size="small"
                              color="success"
                              icon={<CheckIcon />}
                            />
                          ) : (
                            <Chip
                              label="No signature"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => handleDeleteDoctor(doctor.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* Users Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ px: 4 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 3 }}
              >
                <Typography variant="h5" fontWeight="600" sx={{ color: '#000000' }}>
                  User Management
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddUserOpen(true)}
                >
                  Create User
                </Button>
              </Stack>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Full Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ backgroundColor: '#5856D6' }}>
                              {user.username.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography fontWeight="500">{user.username}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{user.fullName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            size="small"
                            color={user.role === 'admin' ? 'error' : 'primary'}
                          />
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => handleDeleteUser(user.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>
        </Paper>
      </Box>

      {/* Add Doctor Dialog */}
      <Dialog open={addDoctorOpen} onClose={() => setAddDoctorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Doctor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Doctor Name *"
              value={newDoctor.name}
              onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Specialization"
              value={newDoctor.specialization}
              onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
            />
            <TextField
              fullWidth
              label="License Number"
              value={newDoctor.licenseNumber}
              onChange={(e) => setNewDoctor({ ...newDoctor, licenseNumber: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email *"
              type="email"
              value={newDoctor.email}
              onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Phone"
              value={newDoctor.phone}
              onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDoctorOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddDoctor}>
            Add Doctor
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onClose={() => setAddUserOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Username *"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
            <TextField
              fullWidth
              label="Full Name"
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email *"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Password *"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="radiologist">Radiologist</MenuItem>
                <MenuItem value="technician">Technician</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUserOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddUser}>
            Create User
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SettingsPage;
