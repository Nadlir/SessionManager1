/**
 * The spreadsheet keeps everything on one tab:
 *   A: Fecha cita | B: Paciente | C: Descripción | D: Monto | E: Out? | F: Reports Rosangela
 *   AA: the list of patient names
 * Row 1 holds the headers, so data starts at row 2 and a row number doubles as the record id.
 */
export const SESSION_RANGE = "A2:F"
export const SESSION_COLUMNS = "A:F"
export const PATIENT_RANGE = "AA2:AA"
export const PATIENT_COLUMN = "AA"

export interface SessionRecord {
  id: string
  patientName: string
  date: string
  description: string
  cost: number
  out: boolean
  reportsRosangela: boolean
}

export interface PatientRecord {
  id: string
  name: string
}

const TRUTHY = new Set(["true", "yes", "y", "1", "v", "✓", "sí", "si", "כן"])

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value
  return TRUTHY.has(String(value ?? "").trim().toLowerCase())
}

/** Costs arrive as `RD$4,500.00`, as a plain number, or empty. */
export function parseMoney(value: unknown): number {
  if (typeof value === "number") return value
  const digits = String(value ?? "").replace(/[^\d.,-]/g, "").replace(/,/g, "")
  const parsed = Number.parseFloat(digits)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Dates are written as `DD/MM/YYYY`; the app works in ISO `YYYY-MM-DD`. */
export function parseDate(value: unknown): string {
  const text = String(value ?? "").trim()
  if (!text) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10)
}

export function toSheetDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return iso
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

export function rowToSession(row: unknown[], rowNumber: number): SessionRecord {
  return {
    id: String(rowNumber),
    date: parseDate(row[0]),
    patientName: String(row[1] ?? "").trim(),
    description: String(row[2] ?? "").trim(),
    cost: parseMoney(row[3]),
    out: parseBoolean(row[4]),
    reportsRosangela: parseBoolean(row[5]),
  }
}

export function sessionToRow(session: Omit<SessionRecord, "id">): unknown[] {
  return [
    toSheetDate(session.date),
    session.patientName,
    session.description,
    session.cost,
    session.out ? "TRUE" : "FALSE",
    session.reportsRosangela ? "TRUE" : "FALSE",
  ]
}