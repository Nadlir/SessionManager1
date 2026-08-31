import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { patients as seedPatients, sessions as seedSessions } from "../data"
import {
  createPatient,
  createSession,
  deleteSession,
  fetchDiversaData,
  savePatient,
  saveSession,
} from "../lib/api"
import {
  CLINIC_CURRENCY,
  DEFAULT_SESSION_COST,
  initialsFromName,
  nextPatientId,
  nextSessionId,
} from "../lib/format"
import type { Clinic, Patient, PatientDraft, Session, SessionDraft } from "../types"

interface HubContextValue {
  clinic: Clinic
  setClinic: (clinic: Clinic) => void
  patients: Patient[]
  sessions: Session[]
  clinicPatients: Patient[]
  clinicSessions: Session[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addSession: (draft: SessionDraft) => void
  updateSession: (id: string, draft: SessionDraft) => void
  removeSession: (id: string) => void
  addPatient: (draft: PatientDraft) => void
  updatePatient: (id: string, draft: PatientDraft) => void
}

const HubContext = createContext<HubContextValue | null>(null)

/** Rehup is still demo data; only Diversa is backed by the spreadsheet. */
const mockPatients = seedPatients.filter((patient) => patient.clinic === "rehup")
const mockSessions = seedSessions.filter((session) => session.clinic === "rehup")

function parseCost(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function toSession(draft: SessionDraft, clinic: Clinic, existing?: Session): Session {
  return {
    id: existing?.id ?? "",
    patientId: draft.patientId,
    patientName: draft.patientName.trim(),
    initials: initialsFromName(draft.patientName),
    date: draft.date,
    description: draft.description.trim(),
    cost: parseCost(draft.cost, existing?.cost ?? DEFAULT_SESSION_COST),
    currency: existing?.currency ?? CLINIC_CURRENCY[clinic],
    out: draft.out,
    reportsRosangela: draft.reportsRosangela,
    clinic: existing?.clinic ?? clinic,
  }
}

export function HubProvider({ children }: { children: ReactNode }) {
  const [clinic, setClinic] = useState<Clinic>("diversa")
  const [patients, setPatients] = useState<Patient[]>(mockPatients)
  const [sessions, setSessions] = useState<Session[]>(mockSessions)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDiversaData()
      setPatients([...data.patients, ...mockPatients])
      setSessions([...data.sessions, ...mockSessions])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load Diversa data")
      setPatients(mockPatients)
      setSessions(mockSessions)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const clinicPatients = useMemo(
    () => patients.filter((patient) => patient.clinic === clinic),
    [patients, clinic],
  )

  const clinicSessions = useMemo(
    () => sessions.filter((session) => session.clinic === clinic),
    [sessions, clinic],
  )

  const reportError = useCallback((cause: unknown, fallback: string) => {
    setError(cause instanceof Error ? cause.message : fallback)
  }, [])

  const addSession = useCallback(
    (draft: SessionDraft) => {
      const created = toSession(draft, clinic)

      if (clinic !== "diversa") {
        setSessions((current) => [{ ...created, id: nextSessionId(current) }, ...current])
        return
      }

      createSession({
        patientName: created.patientName,
        date: created.date,
        description: created.description,
        cost: created.cost,
        out: created.out,
        reportsRosangela: created.reportsRosangela,
      })
        .then((saved) => setSessions((current) => [saved, ...current]))
        .catch((cause) => reportError(cause, "Failed to create session"))
    },
    [clinic, reportError],
  )

  const updateSession = useCallback(
    (id: string, draft: SessionDraft) => {
      const existing = sessions.find((item) => item.id === id)
      if (!existing) return
      const next = { ...toSession(draft, existing.clinic, existing), id }

      if (existing.clinic !== "diversa") {
        setSessions((current) => current.map((item) => (item.id === id ? next : item)))
        return
      }

      saveSession(id, {
        patientName: next.patientName,
        date: next.date,
        description: next.description,
        cost: next.cost,
        out: next.out,
        reportsRosangela: next.reportsRosangela,
      })
        .then((saved) => setSessions((current) => current.map((item) => (item.id === id ? saved : item))))
        .catch((cause) => reportError(cause, "Failed to save session"))
    },
    [sessions, reportError],
  )

  const removeSession = useCallback(
    (id: string) => {
      const existing = sessions.find((item) => item.id === id)
      if (!existing) return

      setSessions((current) => current.filter((item) => item.id !== id))
      if (existing.clinic !== "diversa") return

      deleteSession(id).catch((cause) => {
        reportError(cause, "Failed to delete session")
        void refresh()
      })
    },
    [sessions, reportError, refresh],
  )

  const addPatient = useCallback(
    (draft: PatientDraft) => {
      const name = draft.name.trim()
      if (!name) return

      if (clinic !== "diversa") {
        setPatients((current) => [
          {
            name,
            id: nextPatientId(current),
            lastVisit: null,
            clinic,
            initials: initialsFromName(name),
          },
          ...current,
        ])
        return
      }

      createPatient(name)
        .then((saved) => setPatients((current) => [saved, ...current]))
        .catch((cause) => reportError(cause, "Failed to create patient"))
    },
    [clinic, reportError],
  )

  const updatePatient = useCallback(
    (id: string, draft: PatientDraft) => {
      const existing = patients.find((patient) => patient.id === id)
      if (!existing) return

      const name = draft.name.trim()
      if (!name) return

      const applyLocally = (patient: Patient) =>
        setPatients((current) => current.map((item) => (item.id === id ? patient : item)))

      // Sessions in the sheet reference the patient by name, so a rename has to follow through
      // to every session row of that patient.
      const affected = sessions.filter(
        (item) => item.clinic === existing.clinic && item.patientName === existing.name,
      )

      const renameSessions = () =>
        setSessions((current) =>
          current.map((item) =>
            affected.some((match) => match.id === item.id)
              ? { ...item, patientName: name, initials: initialsFromName(name) }
              : item,
          ),
        )

      if (existing.clinic !== "diversa") {
        applyLocally({ ...existing, name, initials: initialsFromName(name) })
        renameSessions()
        return
      }

      savePatient(id, name, existing.lastVisit)
        .then(async (saved) => {
          applyLocally(saved)
          for (const item of affected) {
            await saveSession(item.id, {
              patientName: name,
              date: item.date,
              description: item.description,
              cost: item.cost,
              out: item.out,
              reportsRosangela: item.reportsRosangela,
            })
          }
          renameSessions()
        })
        .catch((cause) => reportError(cause, "Failed to save patient"))
    },
    [patients, sessions, reportError],
  )

  const value = useMemo(
    () => ({
      clinic,
      setClinic,
      patients,
      sessions,
      clinicPatients,
      clinicSessions,
      loading,
      error,
      refresh,
      addSession,
      updateSession,
      removeSession,
      addPatient,
      updatePatient,
    }),
    [
      clinic,
      patients,
      sessions,
      clinicPatients,
      clinicSessions,
      loading,
      error,
      refresh,
      addSession,
      updateSession,
      removeSession,
      addPatient,
      updatePatient,
    ],
  )

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>
}

export function useHub() {
  const context = useContext(HubContext)
  if (!context) {
    throw new Error("useHub must be used within HubProvider")
  }
  return context
}
