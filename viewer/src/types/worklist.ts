export interface Study {
  studyInstanceUID: string
  studyDate: string
  studyTime: string
  studyDescription: string
  patientName: string
  patientID: string
  patientBirthDate: string
  patientSex: string
  modality: string
  numberOfSeries: number
  numberOfInstances: number
  priority: string
  status: string
  aiStatus: string
  assignedTo?: string
}

export interface WorklistFilters {
  modalities: string[]
  dateRange: {
    start: string | null
    end: string | null
  }
  priorities: string[]
  statuses: string[]
  aiStatus: string[]
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}