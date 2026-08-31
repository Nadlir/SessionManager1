import type { Patient, Session } from "../types"
import { initialsFromName } from "./format"

/** Shapes returned by the Sheets-backed API. */
interface PatientPayload {
  id: string
  name: string
}

interface SessionPayload {
  id: string
  patientName: string
  date: string
  description: string
  cost: number
  out: boolean
  reportsRosangela: boolean
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed with status ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function toPatient(payload: PatientPayload, lastVisit: string | null): Patient {
  return {
    id: payload.id,
    name: payload.name,
    lastVisit,
    clinic: "diversa",
    initials: initialsFromName(payload.name),
  }
}

function toSession(payload: SessionPayload): Session {
  return {
    ...payload,
    // Sessions reference patients by name only; there is no id column in the sheet.
    patientId: null,
    initials: initialsFromName(payload.patientName),
    currency: "DOP",
    clinic: "diversa",
  }
}

/** Most recent session date per patient name, used to fill the Last Visit column. */
function lastVisitByName(sessions: Session[]): Map<string, string> {
  const map = new Map<string, string>()
  sessions.forEach((session) => {
    if (!session.date) return
    const key = session.patientName.trim().toLowerCase()
    const current = map.get(key)
    if (!current || session.date > current) {
      map.set(key, session.date)
    }
  })
  return map
}

export async function fetchDiversaData(): Promise<{ patients: Patient[]; sessions: Session[] }> {
  const [patientPayloads, sessionPayloads] = await Promise.all([
    request<PatientPayload[]>("/patients"),
    request<SessionPayload[]>("/sessions"),
  ])

  const sessions = sessionPayloads.map(toSession)
  const visits = lastVisitByName(sessions)
  const patients = patientPayloads.map((payload) =>
    toPatient(payload, visits.get(payload.name.trim().toLowerCase()) ?? null),
  )

  return { patients, sessions }
}

export async function createPatient(name: string): Promise<Patient> {
  const created = await request<PatientPayload>("/patients", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
  return toPatient(created, null)
}

export async function savePatient(
  id: string,
  name: string,
  lastVisit: string | null,
): Promise<Patient> {
  const saved = await request<PatientPayload>(`/patients/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  })
  return toPatient(saved, lastVisit)
}

export async function createSession(payload: Omit<SessionPayload, "id">): Promise<Session> {
  const created = await request<SessionPayload>("/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return toSession(created)
}

export async function saveSession(id: string, payload: Omit<SessionPayload, "id">): Promise<Session> {
  const saved = await request<SessionPayload>(`/sessions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return toSession(saved)
}

export async function deleteSession(id: string): Promise<void> {
  await request<void>(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" })
}
