export type Clinic = "diversa" | "rehup"
export type Currency = "USD" | "GBP" | "DOP"

export interface Patient {
  id: string
  name: string
  lastVisit: string | null
  clinic: Clinic
  initials: string
}

export interface Session {
  id: string
  patientId: string | null
  patientName: string
  initials: string
  date: string
  description: string
  cost: number
  currency: Currency
  out: boolean
  reportsRosangela: boolean
  clinic: Clinic
}

export interface SessionDraft {
  patientId: string | null
  patientName: string
  date: string
  description: string
  cost: string
  out: boolean
  reportsRosangela: boolean
}

export interface PatientDraft {
  name: string
}
