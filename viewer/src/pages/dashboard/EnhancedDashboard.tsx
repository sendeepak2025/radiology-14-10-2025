/**
 * Enhanced Patients Page - Advanced UI/UX
 * Modern Minimal + Professional Medical + Dark Mode + Futuristic
 */

import React, { useEffect, useState } from "react"
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Stack,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  alpha,
} from "@mui/material"
import {
  People as PeopleIcon,
  Science as ScienceIcon,
  Computer as ComputerIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  FolderOpen as FolderOpenIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material"
import { Helmet } from "react-helmet-async"
import { useNavigate } from "react-router-dom"
import { getPatients, getStudies } from "../../services/ApiService"

interface PatientItem {
  patientID: string
  patientName: string
  birthDate?: string
  sex?: string
  studyCount?: number
}

interface StudyItem {
  studyInstanceUID: string
  patientName: string
  patientID: string
  modality: string
  studyDate?: string
  numberOfInstances?: number
}

const EnhancedDashboard: React.FC = () => {
  const [patients, setPatients] = useState<PatientItem[]>([])
  const [recentStudies, setRecentStudies] = useState<StudyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalStudies: 0,
    todayStudies: 0,
  })
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load patients
      const patientsRes = await getPatients()
      if (patientsRes.success) {
        setPatients(patientsRes.data || [])
      }

      // Load studies
      const studiesRes = await getStudies()
      if (studiesRes.success) {
        const allStudies = studiesRes.data || []
        setRecentStudies(allStudies.slice(0, 6)) // Get 6 most recent
        
        // Calculate stats
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const todayCount = allStudies.filter((s: StudyItem) => 
          s.studyDate?.startsWith(today)
        ).length

        setStats({
          totalPatients: patientsRes.data?.length || 0,
          totalStudies: allStudies.length,
          todayStudies: todayCount,
        })
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString || dateString.length !== 8) return 'N/A'
    const year = dateString.substring(0, 4)
    const month = dateString.substring(4, 6)
    const day = dateString.substring(6, 8)
    return `${month}/${day}/${year}`
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Medical Imaging Viewer</title>
      </Helmet>

      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0e27 0%, #111827 100%)',
          p: 4,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #00b4d8 0%, #8338ec 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            Medical Imaging Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Advanced radiology workflow management
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} md={4}>
            <Card
              className="glass interactive-card"
              sx={{
                background: 'linear-gradient(135deg, rgba(0, 180, 216, 0.1) 0%, rgba(0, 119, 182, 0.1) 100%)',
                border: '1px solid rgba(0, 180, 216, 0.3)',
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ mb: 1 }}>
                      {stats.totalPatients}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Patients
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
                      boxShadow: '0 8px 24px rgba(0, 180, 216, 0.3)',
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              className="glass interactive-card"
              sx={{
                background: 'linear-gradient(135deg, rgba(131, 56, 236, 0.1) 0%, rgba(109, 40, 217, 0.1) 100%)',
                border: '1px solid rgba(131, 56, 236, 0.3)',
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ mb: 1 }}>
                      {stats.totalStudies}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Studies
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      background: 'linear-gradient(135deg, #8338ec 0%, #6d28d9 100%)',
                      boxShadow: '0 8px 24px rgba(131, 56, 236, 0.3)',
                    }}
                  >
                    <ScienceIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              className="glass interactive-card"
              sx={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ mb: 1 }}>
                      {stats.todayStudies}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Today's Studies
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Paper
          className="glass"
          sx={{ p: 4, mb: 6, borderRadius: 3 }}
        >
          <Typography variant="h5" fontWeight="600" sx={{ mb: 3 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                onClick={() => navigate('/dashboard')}
                sx={{
                  py: 2,
                  background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #48cae4 0%, #00b4d8 100%)',
                  },
                }}
              >
                View All Studies
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<UploadIcon />}
                sx={{ py: 2 }}
              >
                Upload Study
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<ComputerIcon />}
                onClick={() => navigate('/machines')}
                sx={{ py: 2 }}
              >
                Manage Machines
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<FolderOpenIcon />}
                onClick={() => navigate('/orthanc')}
                sx={{ py: 2 }}
              >
                PACS Viewer
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Recent Studies */}
        <Paper
          className="glass"
          sx={{ p: 4, borderRadius: 3 }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="600">
              Recent Studies
            </Typography>
            <Button
              size="small"
              onClick={() => navigate('/dashboard')}
              sx={{ textTransform: 'none' }}
            >
              View All →
            </Button>
          </Stack>

          <Grid container spacing={2}>
            {recentStudies.map((study) => (
              <Grid item xs={12} sm={6} md={4} key={study.studyInstanceUID}>
                <Card
                  className="glass-light interactive-card"
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 2,
                  }}
                  onClick={() => navigate(`/viewer/${study.studyInstanceUID}`)}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="subtitle1" fontWeight="600" noWrap>
                          {study.patientName || 'Unknown'}
                        </Typography>
                        <Chip
                          label={study.modality}
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, rgba(0, 180, 216, 0.2) 0%, rgba(0, 119, 182, 0.2) 100%)',
                            border: '1px solid rgba(0, 180, 216, 0.3)',
                          }}
                        />
                      </Stack>
                      
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(study.studyDate)}
                        </Typography>
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        {study.numberOfInstances || 0} images
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    </>
  )
}

export default EnhancedDashboard
