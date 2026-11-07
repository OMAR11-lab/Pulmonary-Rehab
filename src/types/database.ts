export type AppRole = 'admin' | 'pulmonologist' | 'patient'

export interface Profile {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: AppRole
  is_active: boolean
  created_at: string
}

export interface PatientSummary {
  id: string
  full_name: string
  date_of_birth: string | null
  sex: string | null
  phone: string | null
  diagnosis: 'bronchial_asthma'
  assigned_clinician_id: string
  status: 'active' | 'inactive' | 'completed'
  created_at: string
}
