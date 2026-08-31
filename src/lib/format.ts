import type { Clinic, Currency, Patient, Session } from "../types"

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
}

const CURRENCY_LOCALE: Record<Currency, string> = {
  USD: "en-US",
  GBP: "en-GB",
  DOP: "es-DO",
}

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  GBP: "£",
  DOP: "RD$",
}

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: "currency",
    currency,
  }).format(amount)
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** A billing month runs from the 26th of the previous calendar month to the 25th of its own. */
export const MONTH_START_DAY = 26

export function monthKey(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  if (!year || !month || !day) return iso.slice(0, 7)

  const shifted = new Date(Date.UTC(year, month - 1, 1))
  if (day >= MONTH_START_DAY) {
    shifted.setUTCMonth(shifted.getUTCMonth() + 1)
  }
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

/** Human readable bounds of a billing month, e.g. "26 Jun – 25 Jul 2026". */
export function monthRangeLabel(key: string): string {
  const [year, month] = key.split("-").map(Number)
  const start = new Date(year, month - 2, MONTH_START_DAY)
  const end = new Date(year, month - 1, MONTH_START_DAY - 1)
  const format = (date: Date, withYear: boolean) =>
    date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    })
  return `${format(start, start.getFullYear() !== end.getFullYear())} – ${format(end, true)}`
}

export function nextPatientId(patients: Patient[]): string {
  const max = patients.reduce((acc, patient) => {
    const numeric = Number(patient.id.replace(/\D/g, ""))
    return Number.isFinite(numeric) ? Math.max(acc, numeric) : acc
  }, 10000)
  return `PT-${max + 1}`
}

export function nextSessionId(sessions: Session[]): string {
  const max = sessions.reduce((acc, session) => {
    const numeric = Number(session.id.replace(/\D/g, ""))
    return Number.isFinite(numeric) ? Math.max(acc, numeric) : acc
  }, 1000)
  return `SES-${max + 1}`
}

export const CLINIC_CURRENCY: Record<Clinic, Currency> = {
  diversa: "DOP",
  rehup: "GBP",
}

export const DEFAULT_SESSION_COST = 0
