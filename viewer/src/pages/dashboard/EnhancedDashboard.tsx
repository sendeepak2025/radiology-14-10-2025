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
  Settings as SettingsIcon,
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
          backgroundColor: '#F5F5F7',
          p: 4,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: '#000000',
              mb: 1,
            }}
          >
            Medical Imaging Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: '#6E6E73' }}>
            Advanced radiology workflow management
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                backgroundColor: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                borderRadius: 3,
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.12)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ mb: 1, color: '#000000' }}>
                      {stats.totalPatients}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6E6E73' }}>
                      Total Patients
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      backgroundColor: '#007AFF',
                      boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
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
              sx={{
                backgroundColor: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                borderRadius: 3,
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.12)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ mb: 1, color: '#000000' }}>
                      {stats.totalStudies}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6E6E73' }}>
                      Total Studies
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      backgroundColor: '#5856D6',
                      boxShadow: '0 2px 8px rgba(88, 86, 214, 0.25)',
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
              sx={{
                backgroundColor: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                borderRadius: 3,
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.12)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ mb: 1, color: '#000000' }}>
                      {stats.todayStudies}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6E6E73' }}>
                      Today's Studies
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      backgroundColor: '#34C759',
                      boxShadow: '0 2px 8px rgba(52, 199, 89, 0.25)',
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
          sx={{
            p: 4,
            mb: 6,
            borderRadius: 3,
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
          }}
        >
          <Typography variant="h5" fontWeight="600" sx={{ mb: 3, color: '#000000' }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                onClick={() => navigate('/patients')}
                sx={{
                  py: 2,
                  backgroundColor: '#007AFF',
                  '&:hover': {
                    backgroundColor: '#0051D5',
                  },
                }}
              >
                View Studies
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
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
            <Grid item xs={12} sm={6} md={2.4}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<ComputerIcon />}
                onClick={() => navigate('/machines')}
                sx={{ py: 2 }}
              >
                Machines
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
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
            <Grid item xs={12} sm={6} md={2.4}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<SettingsIcon />}
                onClick={() => navigate('/settings')}
                sx={{ py: 2 }}
              >
                Settings
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Recent Studies */}
        <Paper
          sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="600" sx={{ color: '#000000' }}>
              Recent Studies
            </Typography>
            <Button
              size="small"
              onClick={() => navigate('/dashboard')}
              sx={{ textTransform: 'none', color: '#007AFF' }}
            >
              View All →
            </Button>
          </Stack>

          <Grid container spacing={2}>
            {recentStudies.map((study) => (
              <Grid item xs={12} sm={6} md={4} key={study.studyInstanceUID}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 2,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.12)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => navigate(`/viewer/${study.studyInstanceUID}`)}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="subtitle1" fontWeight="600" noWrap sx={{ color: '#000000' }}>
                          {study.patientName || 'Unknown'}
                        </Typography>
                        <Chip
                          label={study.modality}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(0, 122, 255, 0.1)',
                            color: '#007AFF',
                          }}
                        />
                      </Stack>
                      
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarIcon sx={{ fontSize: 16, color: '#6E6E73' }} />
                        <Typography variant="caption" sx={{ color: '#6E6E73' }}>
                          {formatDate(study.studyDate)}
                        </Typography>
                      </Stack>

                      <Typography variant="caption" sx={{ color: '#6E6E73' }}>
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
