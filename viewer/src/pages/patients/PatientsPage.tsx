"use client"

import React, { useEffect, useState } from "react"
import {
  Box,
  Paper,
  Typography,
  Card,
  CardActionArea,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Stack,
  Divider,
  IconButton,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from "@mui/material"
import {
  People,
  Science,
  Add,
  Close,
  CloudUpload,
  Image,
  Folder,
  ChevronRight,
  Error as ErrorIcon,
  Upload,
  CheckCircle,
} from "@mui/icons-material"
import { Helmet } from "react-helmet-async"
import {
  getPatients,
  getPatientStudies,
  getStudies,
  createPatient,
  uploadDicomFileForPatient,
} from "../../services/ApiService"
import { useNavigate } from "react-router-dom"

interface PatientItem {
  patientID: string
  patientName: string
  birthDate?: string
  sex?: string
  studyCount?: number
}

interface PatientStudyItem {
  studyInstanceUID: string
  patientName: string
  patientID: string
  modality: string
  numberOfSeries: number
  numberOfInstances: number
  studyDescription?: string
}

const PatientsPage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0)
  const [patients, setPatients] = useState<PatientItem[]>([])
  const [selectedPatientID, setSelectedPatientID] = useState<string | null>(null)
  const [studiesForPatient, setStudiesForPatient] = useState<PatientStudyItem[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [loadingPatientStudies, setLoadingPatientStudies] = useState(false)
  const [allStudies, setAllStudies] = useState<PatientStudyItem[]>([])
  const [loadingAllStudies, setLoadingAllStudies] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [studiesPopupOpen, setStudiesPopupOpen] = useState(false)
  const [newPatientID, setNewPatientID] = useState("")
  const [newPatientName, setNewPatientName] = useState("")
  const [newPatientBirthDate, setNewPatientBirthDate] = useState("")
  const [newPatientSex, setNewPatientSex] = useState("")
  const [addingPatient, setAddingPatient] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pacsUploadOpen, setPacsUploadOpen] = useState(false)
  const [pacsFiles, setPacsFiles] = useState<File[]>([])
  const [pacsUploading, setPacsUploading] = useState(false)
  const [pacsUploadSuccess, setPacsUploadSuccess] = useState(false)
  const [uploadedStudyUID, setUploadedStudyUID] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoadingPatients(true)
        setError(null)
        const res = await getPatients()
        if (!res.success) throw new Error(res.message || "Failed to load patients")
        setPatients(res.data || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoadingPatients(false)
      }
    }
    loadPatients()
  }, [])

  useEffect(() => {
    const maybeLoadStudies = async () => {
      if (tabIndex === 1 && allStudies.length === 0 && !loadingAllStudies) {
        try {
          setLoadingAllStudies(true)
          setError(null)
          const res = await getStudies()
          if (!res.success) throw new Error(res.message || "Failed to load studies")
          setAllStudies(res.data || [])
        } catch (e: any) {
          setError(e.message)
        } finally {
          setLoadingAllStudies(false)
        }
      }
    }
    maybeLoadStudies()
  }, [tabIndex])

  const handlePatientClick = async (patientID: string) => {
    try {
      setSelectedPatientID(patientID)
      setStudiesPopupOpen(true)
      setLoadingPatientStudies(true)
      setError(null)
      const res = await getPatientStudies(patientID)
      if (!res.success) throw new Error(res.message || "Failed to load studies for patient")
      setStudiesForPatient(res.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingPatientStudies(false)
    }
  }

  const handleStudyClick = (studyUID: string) => {
    navigate(`/patient/studies/${studyUID}`)
  }

  const handleAddPatientOpen = () => setAddOpen(true)
  const handleAddPatientClose = () => {
    setAddOpen(false)
    setNewPatientID("")
    setNewPatientName("")
    setNewPatientBirthDate("")
    setNewPatientSex("")
  }

  const handleAddPatientSubmit = async () => {
    try {
      if (!newPatientID.trim()) throw new Error("Patient ID is required")
      setAddingPatient(true)
      setError(null)
      const res = await createPatient({
        patientID: newPatientID.trim(),
        patientName: newPatientName.trim(),
        birthDate: newPatientBirthDate.trim(),
        sex: newPatientSex.trim(),
      })
      if (!res.success) throw new Error(res.message || "Failed to create patient")
      const list = await getPatients()
      setPatients(list.data || [])
      handleAddPatientClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAddingPatient(false)
    }
  }

  const handleUploadDicom = async () => {
    try {
      if (!selectedPatientID || !uploadFileObj) return
      setUploading(true)
      setError(null)
      const res = await uploadDicomFileForPatient(uploadFileObj, selectedPatientID)
      if (!res.success) throw new Error(res.message || "Upload failed")
      const studies = await getPatientStudies(selectedPatientID)
      setStudiesForPatient(studies.data || [])
      setUploadFileObj(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const selectedPatient = patients.find((p) => p.patientID === selectedPatientID)

  const handlePacsUploadOpen = () => {
    setPacsUploadOpen(true)
    setPacsUploadSuccess(false)
    setUploadedStudyUID(null)
  }

  const handlePacsUploadClose = () => {
    setPacsUploadOpen(false)
    setPacsFiles([])
    setPacsUploadSuccess(false)
    setUploadedStudyUID(null)
  }

  const handlePacsFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setPacsFiles(files)
  }

  const handlePacsUpload = async () => {
    if (pacsFiles.length === 0) return

    try {
      setPacsUploading(true)
      setError(null)

      // Upload files to PACS server
      const formData = new FormData()
      pacsFiles.forEach((file) => {
        formData.append('dicom', file)
      })

      const response = await fetch('http://localhost:8001/api/pacs/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'PACS upload failed')
      }

      // Success!
      setPacsUploadSuccess(true)
      setUploadedStudyUID(result.data?.studyInstanceUID || null)

      // Refresh studies list
      if (tabIndex === 1) {
        const res = await getStudies()
        setAllStudies(res.data || [])
      }

      // Auto-close after 2 seconds and navigate to viewer
      setTimeout(() => {
        handlePacsUploadClose()
        if (result.data?.studyInstanceUID) {
          navigate(`/patient/studies/${result.data.studyInstanceUID}`)
        }
      }, 2000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPacsUploading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Patients & Studies</title>
      </Helmet>

      <Box sx={{ display: "flex", height: "100vh", bgcolor: "grey.50" }}>
        {/* Sidebar */}
        <Paper
          elevation={0}
          sx={{
            width: 280,
            borderRight: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              Medical Portal
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Patient Management System
            </Typography>
          </Box>

          <Box sx={{ flex: 1, p: 2 }}>
            <Stack spacing={1}>
              <Button
                fullWidth
                startIcon={<People />}
                onClick={() => setTabIndex(0)}
                variant={tabIndex === 0 ? "contained" : "text"}
                sx={{
                  justifyContent: "flex-start",
                  py: 1.5,
                  px: 2,
                  textTransform: "none",
                  fontWeight: tabIndex === 0 ? 600 : 400,
                }}
              >
                Patients
              </Button>
              <Button
                fullWidth
                startIcon={<Science />}
                onClick={() => setTabIndex(1)}
                variant={tabIndex === 1 ? "contained" : "text"}
                sx={{
                  justifyContent: "flex-start",
                  py: 1.5,
                  px: 2,
                  textTransform: "none",
                  fontWeight: tabIndex === 1 ? 600 : 400,
                }}
              >
                All Studies
              </Button>
            </Stack>
          </Box>

          <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.5 }}>
              {tabIndex === 0
                ? "Select a patient to view their studies and upload DICOM files."
                : "Browse all available medical imaging studies."}
            </Typography>
          </Box>
        </Paper>

        {/* Main Content */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {tabIndex === 0 ? (
            <Box sx={{ p: 4 }}>
              <Box sx={{ maxWidth: 1400, mx: "auto" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                      Patients
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Manage patient records and medical studies
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      startIcon={<Upload />}
                      onClick={handlePacsUploadOpen}
                      size="large"
                      sx={{ textTransform: "none", px: 3 }}
                    >
                      Upload Study
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddPatientOpen}
                      size="large"
                      sx={{ textTransform: "none", px: 3 }}
                    >
                      Add Patient
                    </Button>
                  </Stack>
                </Stack>

                {loadingPatients ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
                    <CircularProgress size={48} />
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {patients.map((patient) => (
                      <Grid item xs={12} sm={6} md={4} key={patient.patientID}>
                        <Card
                          elevation={0}
                          sx={{
                            border: 1,
                            borderColor: "divider",
                            transition: "all 0.2s",
                            "&:hover": {
                              borderColor: "primary.main",
                              boxShadow: 2,
                            },
                          }}
                        >
                          <CardActionArea onClick={() => handlePatientClick(patient.patientID)} sx={{ p: 3 }}>
                            <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                              <Avatar
                                sx={{
                                  width: 56,
                                  height: 56,
                                  bgcolor: "primary.main",
                                  fontSize: "1.5rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {patient.patientName?.charAt(0) || patient.patientID.charAt(0)}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Chip
                                  label={`${patient.studyCount || 0} studies`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </Box>
                            </Stack>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                              {patient.patientName || "Unknown"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              ID: {patient.patientID}
                            </Typography>
                            {patient.birthDate && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                DOB: {patient.birthDate}
                              </Typography>
                            )}
                            {patient.sex && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Sex: {patient.sex}
                              </Typography>
                            )}
                          </CardActionArea>
                        </Card>
                      </Grid>
                    ))}
                    {patients.length === 0 && (
                      <Grid item xs={12}>
                        <Box sx={{ textAlign: "center", py: 10 }}>
                          <People sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            No patients found
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Add your first patient to get started
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ p: 4 }}>
              <Box sx={{ maxWidth: 1400, mx: "auto" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                      All Studies
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Browse all medical imaging studies
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Upload />}
                    onClick={handlePacsUploadOpen}
                    size="large"
                    sx={{ textTransform: "none", px: 3 }}
                  >
                    Upload Study
                  </Button>
                </Stack>

                {loadingAllStudies ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
                    <CircularProgress size={48} />
                  </Box>
                ) : (
                  <Paper elevation={0} sx={{ border: 1, borderColor: "divider" }}>
                    <List disablePadding>
                      {allStudies.map((study, idx) => (
                        <React.Fragment key={study.studyInstanceUID}>
                          <ListItemButton
                            onClick={() => handleStudyClick(study.studyInstanceUID)}
                            sx={{ py: 2.5, px: 3 }}
                          >
                            <ListItemIcon>
                              <Folder color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {study.patientName || "Unknown Patient"}
                                  </Typography>
                                  <Chip label={study.modality} size="small" color="primary" />
                                </Stack>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {study.studyDescription || "No description"}
                                  </Typography>
                                  <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      <Image sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} />
                                      {study.numberOfInstances} images
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {study.numberOfSeries} series
                                    </Typography>
                                  </Stack>
                                </Box>
                              }
                            />
                            <ChevronRight color="action" />
                          </ListItemButton>
                          {idx < allStudies.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                      {allStudies.length === 0 && (
                        <Box sx={{ textAlign: "center", py: 10 }}>
                          <Science sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
                          <Typography variant="h6" color="text.secondary">
                            No studies found
                          </Typography>
                        </Box>
                      )}
                    </List>
                  </Paper>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog
        open={studiesPopupOpen}
        onClose={() => {
          setStudiesPopupOpen(false)
          setUploadFileObj(null)
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
            color: "white",
            py: 3,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {selectedPatient?.patientName || "Unknown Patient"}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                Patient ID: {selectedPatientID}
              </Typography>
              {selectedPatient?.birthDate && (
                <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mt: 0.5 }}>
                  DOB: {selectedPatient.birthDate}
                </Typography>
              )}
            </Box>
            <IconButton
              onClick={() => {
                setStudiesPopupOpen(false)
                setUploadFileObj(null)
              }}
              sx={{ color: "white" }}
            >
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, bgcolor: "grey.50", borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Upload DICOM File
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                fullWidth
                sx={{
                  py: 2,
                  textTransform: "none",
                  borderStyle: "dashed",
                  borderWidth: 2,
                  bgcolor: uploadFileObj ? "success.50" : "background.paper",
                  borderColor: uploadFileObj ? "success.main" : "divider",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "primary.50",
                  },
                }}
              >
                {uploadFileObj ? (
                  <Box>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {uploadFileObj.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(uploadFileObj.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Choose DICOM file
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Click to browse
                    </Typography>
                  </Box>
                )}
                <input
                  type="file"
                  hidden
                  accept="*/*"
                  onChange={(e) => setUploadFileObj(e.target.files?.[0] || null)}
                />
              </Button>
              <Button
                variant="contained"
                onClick={handleUploadDicom}
                disabled={!uploadFileObj || uploading}
                startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                sx={{ px: 4, py: 2, textTransform: "none", minWidth: 140 }}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Medical Studies ({studiesForPatient.length})
            </Typography>

            {loadingPatientStudies ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : studiesForPatient.length > 0 ? (
              <Stack spacing={2} sx={{ mt: 2 }}>
                {studiesForPatient.map((study) => (
                  <Card
                    key={study.studyInstanceUID}
                    elevation={0}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: "primary.main",
                        boxShadow: 1,
                      },
                    }}
                  >
                    <CardActionArea onClick={() => handleStudyClick(study.studyInstanceUID)} sx={{ p: 2.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Chip label={study.modality} size="small" color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold">
                              {study.studyDescription || "Untitled Study"}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              <Image sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
                              {study.numberOfInstances} images
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <Folder sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
                              {study.numberOfSeries} series
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                            UID: {study.studyInstanceUID}
                          </Typography>
                        </Box>
                        <ChevronRight color="action" />
                      </Stack>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Science sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No studies found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload a DICOM file to create a new study
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Add Patient Dialog */}
      <Dialog open={addOpen} onClose={handleAddPatientClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
            color: "white",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Add New Patient
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
            Enter patient information
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            <TextField
              label="Patient ID"
              value={newPatientID}
              onChange={(e) => setNewPatientID(e.target.value)}
              required
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Patient Name"
              value={newPatientName}
              onChange={(e) => setNewPatientName(e.target.value)}
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Birth Date"
              value={newPatientBirthDate}
              onChange={(e) => setNewPatientBirthDate(e.target.value)}
              placeholder="YYYYMMDD"
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Sex"
              value={newPatientSex}
              onChange={(e) => setNewPatientSex(e.target.value)}
              placeholder="M/F/O"
              fullWidth
              variant="outlined"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: "grey.50" }}>
          <Button onClick={handleAddPatientClose} disabled={addingPatient} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddPatientSubmit}
            variant="contained"
            disabled={addingPatient}
            startIcon={addingPatient ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ textTransform: "none", px: 3 }}
          >
            {addingPatient ? "Saving..." : "Save Patient"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PACS Upload Dialog */}
      <Dialog
        open={pacsUploadOpen}
        onClose={handlePacsUploadClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle
          sx={{
            background: pacsUploadSuccess
              ? "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)"
              : "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
            color: "white",
            py: 3,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {pacsUploadSuccess ? "Upload Successful!" : "Upload DICOM Study"}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {pacsUploadSuccess
                  ? "Study uploaded and ready for viewing"
                  : "Upload DICOM files directly to PACS server"}
              </Typography>
            </Box>
            <IconButton onClick={handlePacsUploadClose} sx={{ color: "white" }}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
          {pacsUploadSuccess ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CheckCircle sx={{ fontSize: 80, color: "success.main", mb: 2 }} />
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Study Uploaded Successfully!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {pacsFiles.length} file(s) processed
              </Typography>
              {uploadedStudyUID && (
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: "grey.50",
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Study UID:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                    {uploadedStudyUID}
                  </Typography>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                Redirecting to viewer...
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              <Box
                sx={{
                  border: 2,
                  borderStyle: "dashed",
                  borderColor: pacsFiles.length > 0 ? "success.main" : "divider",
                  borderRadius: 2,
                  p: 4,
                  textAlign: "center",
                  bgcolor: pacsFiles.length > 0 ? "success.50" : "grey.50",
                  transition: "all 0.3s",
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "primary.50",
                  },
                }}
                component="label"
              >
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".dcm,application/dicom"
                  onChange={handlePacsFileSelect}
                />
                <CloudUpload sx={{ fontSize: 64, color: pacsFiles.length > 0 ? "success.main" : "text.secondary", mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {pacsFiles.length > 0 ? `${pacsFiles.length} file(s) selected` : "Choose DICOM Files"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click to browse or drag and drop DICOM files here
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Supports .dcm files and multi-frame DICOM
                </Typography>
              </Box>

              {pacsFiles.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Selected Files:
                  </Typography>
                  <Paper variant="outlined" sx={{ maxHeight: 200, overflow: "auto", p: 2 }}>
                    <Stack spacing={1}>
                      {pacsFiles.map((file, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            p: 1,
                            bgcolor: "grey.50",
                            borderRadius: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Image color="primary" fontSize="small" />
                            <Typography variant="body2">{file.name}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Box>
              )}

              <Alert severity="info" icon={<CloudUpload />}>
                <Typography variant="body2">
                  <strong>Direct PACS Upload:</strong> Files will be uploaded to Orthanc PACS server and immediately
                  available for viewing. The study will appear in your studies list automatically.
                </Typography>
              </Alert>
            </Stack>
          )}
        </DialogContent>

        {!pacsUploadSuccess && (
          <DialogActions sx={{ p: 3, bgcolor: "grey.50" }}>
            <Button onClick={handlePacsUploadClose} disabled={pacsUploading} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              onClick={handlePacsUpload}
              variant="contained"
              disabled={pacsFiles.length === 0 || pacsUploading}
              startIcon={pacsUploading ? <CircularProgress size={20} color="inherit" /> : <Upload />}
              sx={{ textTransform: "none", px: 4 }}
            >
              {pacsUploading ? "Uploading..." : `Upload ${pacsFiles.length} File(s)`}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          icon={<ErrorIcon />}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            minWidth: 300,
            boxShadow: 3,
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Error
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}
    </>
  )
}

export default PatientsPage
