/**
 * API Service for handling backend communication
 * Uses environment variables for proper URL configuration
 */

// Get backend URL from environment variables
const getBackendUrl = (): string => {
  // In development, use relative URLs to leverage Vite proxy
  if (import.meta.env && import.meta.env.DEV) {
    return '' // Use relative URLs for proxy
  }

  // In production, use environment variables
  const backendUrl = (import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
    (import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) ||
    'http://localhost:8001'

  return backendUrl
}

const BACKEND_URL = getBackendUrl()

/**
 * Make an API call to the backend
 */
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${BACKEND_URL}${endpoint}`

  console.log(`API Call: ${options.method || 'GET'} ${url}`)

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  return response
}

/**
 * Upload files to backend
 */
export const uploadFile = async (
  endpoint: string,
  file: File
): Promise<Response> => {
  const url = `${BACKEND_URL}${endpoint}`

  console.log(`File Upload: POST ${url}`)

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  return response
}

/**
 * Get available studies
 */
export const getStudies = async () => {
  const response = await apiCall('/api/dicom/studies')
  return response.json()
}

/**
 * Get study metadata
 */
export const getStudyMetadata = async (studyUID: string) => {
  const response = await apiCall(`/api/dicom/studies/${studyUID}`)
  return response.json()
}

/**
 * Get study detailed metadata
 */
export const getStudyDetailedMetadata = async (studyUID: string) => {
  const response = await apiCall(`/api/dicom/studies/${studyUID}/metadata`)
  return response.json()
}

/**
 * Upload DICOM file
 */
export const uploadDicomFile = async (file: File) => {
  const response = await uploadFile('/api/dicom/upload', file)
  return response.json()
}

/**
 * Upload ZIP file containing DICOM study
 * All DICOM files in ZIP are grouped under single StudyInstanceUID for 3D reconstruction
 */
export const uploadZipStudy = async (
  file: File,
  options?: {
    forceUnifiedStudy?: boolean
    patientID?: string
    patientName?: string
    onProgress?: (progress: number) => void
  }
) => {
  const url = `${BACKEND_URL}/api/dicom/upload/zip`
  const formData = new FormData()
  formData.append('file', file)
  
  if (options?.forceUnifiedStudy) {
    formData.append('forceUnifiedStudy', 'true')
  }
  if (options?.patientID) {
    formData.append('patientID', options.patientID)
  }
  if (options?.patientName) {
    formData.append('patientName', options.patientName)
  }

  console.log(`ZIP Upload: POST ${url}`)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    if (options?.onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          options.onProgress?.(progress)
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch (error) {
          reject(new Error('Failed to parse response'))
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText)
          reject(new Error(error.message || 'Upload failed'))
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'))
    })

    xhr.open('POST', url)
    xhr.send(formData)
  })
}

/**
 * Get ZIP upload capabilities and info
 */
export const getZipUploadInfo = async () => {
  const response = await apiCall('/api/dicom/upload/zip/info')
  return response.json()
}

/**
 * Get frame image URL
 */
export const getFrameImageUrl = (studyUID: string, frameIndex: number): string => {
  return `${BACKEND_URL}/api/dicom/studies/${studyUID}/frames/${frameIndex}`
}

/**
 * Get patients list
 */
export const getPatients = async () => {
  const response = await apiCall('/api/patients')
  return response.json()
}

/**
 * Get studies for a patient
 */
export const getPatientStudies = async (patientID: string) => {
  const response = await apiCall(`/api/patients/${patientID}/studies`)
  return response.json()
}

export const createPatient = async (patient: { patientID: string; patientName?: string; birthDate?: string; sex?: string }) => {
  const response = await apiCall('/api/patients', {
    method: 'POST',
    body: JSON.stringify(patient),
  })
  return response.json()
}

/**
 * Upload DICOM file for a specific patient (includes patient fields)
 */
export const uploadDicomFileForPatient = async (file: File, patientID: string, patientName?: string) => {
  const url = `${BACKEND_URL}/api/dicom/upload`
  const formData = new FormData()
  formData.append('file', file)
  formData.append('patientID', patientID)
  if (patientName) formData.append('patientName', patientName)

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })
  return response.json()
}

/**
 * Orthanc Viewer API - Direct access to Orthanc data
 */

/**
 * Get all studies from Orthanc
 */
export const getOrthancStudies = async () => {
  const response = await apiCall('/api/viewer/studies')
  return response.json()
}

/**
 * Search studies in Orthanc
 */
export const searchOrthancStudies = async (query: string) => {
  const response = await apiCall(`/api/viewer/studies/search?q=${encodeURIComponent(query)}`)
  return response.json()
}

/**
 * Get study details from Orthanc
 */
export const getOrthancStudy = async (studyId: string) => {
  const response = await apiCall(`/api/viewer/studies/${studyId}`)
  return response.json()
}

/**
 * Get series details from Orthanc
 */
export const getOrthancSeries = async (seriesId: string) => {
  const response = await apiCall(`/api/viewer/series/${seriesId}`)
  return response.json()
}

/**
 * Get Orthanc statistics
 */
export const getOrthancStats = async () => {
  const response = await apiCall('/api/viewer/stats')
  return response.json()
}

/**
 * Get Orthanc instance preview URL
 */
export const getOrthancInstancePreviewUrl = (instanceId: string): string => {
  return `http://localhost:8042/instances/${instanceId}/preview`
}

/**
 * Get Orthanc instance image URL
 */
export const getOrthancInstanceImageUrl = (instanceId: string): string => {
  return `http://localhost:8042/instances/${instanceId}/image-uint8`
}

/**
 * Get Orthanc series preview URL
 */
export const getOrthancSeriesPreviewUrl = (seriesId: string): string => {
  return `http://localhost:8042/series/${seriesId}/preview`
}

export default {
  apiCall,
  uploadFile,
  getStudies,
  getStudyMetadata,
  getStudyDetailedMetadata,
  uploadDicomFile,
  uploadZipStudy,
  getZipUploadInfo,
  getFrameImageUrl,
  getPatients,
  getPatientStudies,
  createPatient,
  uploadDicomFileForPatient,
  // Orthanc Viewer API
  getOrthancStudies,
  searchOrthancStudies,
  getOrthancStudy,
  getOrthancSeries,
  getOrthancStats,
  getOrthancInstancePreviewUrl,
  getOrthancInstanceImageUrl,
  getOrthancSeriesPreviewUrl,
}