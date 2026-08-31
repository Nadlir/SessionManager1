import { useEffect, useMemo, useState } from "react"
import { useHub } from "../context/HubContext"
import { CLINIC_CURRENCY, CURRENCY_SYMBOL } from "../lib/format"
import type { Session, SessionDraft } from "../types"
import { Icon } from "./Icon"

interface SessionModalProps {
  open: boolean
  session?: Session | null
  onClose: () => void
}

const emptyDraft: SessionDraft = {
  patientId: null,
  patientName: "",
  date: "",
  description: "",
  cost: "",
  out: false,
  reportsRosangela: false,
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-start gap-sm px-sm py-sm rounded-lg border border-outline-variant bg-surface cursor-pointer hover:bg-surface-container-low transition-colors">
      <input
        type="checkbox"
        className="mt-1 w-4 h-4 rounded border-outline-variant text-primary-container focus:ring-primary-container"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="flex flex-col">
        <span className="font-label-md text-label-md text-on-surface-strong">{label}</span>
        <span className="font-body-sm text-[12px] text-on-surface-variant">{hint}</span>
      </span>
    </label>
  )
}

export function SessionModal({ open, session, onClose }: SessionModalProps) {
  const { clinic, clinicPatients, addSession, updateSession } = useHub()
  const [draft, setDraft] = useState<SessionDraft>(emptyDraft)
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (!open) return
    if (session) {
      setDraft({
        patientId: session.patientId,
        patientName: session.patientName,
        date: session.date,
        description: session.description,
        cost: String(session.cost),
        out: session.out,
        reportsRosangela: session.reportsRosangela,
      })
    } else {
      setDraft(emptyDraft)
    }
  }, [open, session])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const suggestions = useMemo(() => {
    const query = draft.patientName.trim().toLowerCase()
    if (!query) return clinicPatients.slice(0, 6)
    return clinicPatients
      .filter((patient) => patient.name.toLowerCase().includes(query))
      .slice(0, 6)
  }, [clinicPatients, draft.patientName])

  if (!open) return null

  const isEdit = Boolean(session)
  const currencySymbol = CURRENCY_SYMBOL[CLINIC_CURRENCY[clinic]]

  function submit() {
    if (!draft.patientName.trim() || !draft.date || !draft.description.trim() || !draft.cost) {
      return
    }
    if (session) {
      updateSession(session.id, draft)
    } else {
      addSession(draft)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-on-surface/40 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close modal" onClick={onClose} />
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-lg border border-outline-variant flex flex-col overflow-hidden max-h-full relative">
        <div className="px-md py-sm border-b border-outline-variant flex justify-between items-center bg-surface-warm">
          <h2 className="font-headline-md text-headline-md text-on-surface-strong">
            {isEdit ? "Edit Session" : "Add New Session"}
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            className="p-xs text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="p-md space-y-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-strong block">Date</label>
              <div className="relative">
                <Icon
                  name="calendar_today"
                  className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                />
                <input
                  className="w-full pl-10 pr-sm py-sm rounded-lg border border-outline-variant bg-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container font-body-md text-body-md transition-shadow text-on-surface"
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-strong block">Patient's Name</label>
              <div className="relative">
                <Icon
                  name="search"
                  className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                />
                <input
                  className="w-full pl-10 pr-sm py-sm rounded-lg border border-outline-variant bg-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container font-body-md text-body-md transition-shadow"
                  placeholder="Search patients..."
                  type="text"
                  value={draft.patientName}
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      patientName: event.target.value,
                      patientId: null,
                    }))
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
                {showSuggestions && suggestions.length > 0 ? (
                  <div className="absolute z-10 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg overflow-hidden">
                    {suggestions.map((patient) => (
                      <button
                        type="button"
                        key={patient.id}
                        className="w-full text-left px-sm py-sm hover:bg-surface-container-low font-body-sm text-body-sm text-on-surface"
                        onClick={() => {
                          setDraft((current) => ({
                            ...current,
                            patientId: patient.id,
                            patientName: patient.name,
                          }))
                          setShowSuggestions(false)
                        }}
                      >
                        <span className="font-label-md text-label-md">{patient.name}</span>
                        <span className="text-on-surface-variant ml-sm">{patient.id}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-xs">
            <label className="font-label-md text-label-md text-on-surface-strong block">Description</label>
            <textarea
              className="w-full px-sm py-sm rounded-lg border border-outline-variant bg-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container font-body-md text-body-md transition-shadow resize-none"
              placeholder="What was covered in this session..."
              rows={2}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_1fr] gap-md md:items-end">
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-strong block">Cost</label>
              <div className="relative">
                <span className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md pointer-events-none">
                  {currencySymbol}
                </span>
                <input
                  className="w-full pl-8 pr-sm py-sm rounded-lg border border-outline-variant bg-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container font-body-md text-body-md transition-shadow text-on-surface"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={draft.cost}
                  onChange={(event) => setDraft((current) => ({ ...current, cost: event.target.value }))}
                />
              </div>
            </div>
            <ToggleField
              label="Out"
              hint="Outside the clinic"
              checked={draft.out}
              onChange={(value) => setDraft((current) => ({ ...current, out: value }))}
            />
            <ToggleField
              label="Reports Rosangela"
              hint="Included in Rosangela's reports"
              checked={draft.reportsRosangela}
              onChange={(value) => setDraft((current) => ({ ...current, reportsRosangela: value }))}
            />
          </div>
        </div>

        <div className="px-md py-sm border-t border-outline-variant flex justify-end gap-sm bg-surface-warm mt-auto shrink-0">
          <button
            type="button"
            className="px-md py-sm rounded-full font-label-md text-label-md bg-surface text-secondary border border-outline-variant hover:bg-amber-accent transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-md py-sm rounded-full font-label-md text-label-md bg-primary-container text-white hover:bg-orange-500 transition-colors shadow-sm"
            onClick={submit}
          >
            {isEdit ? "Save Changes" : "Create Session"}
          </button>
        </div>
      </div>
    </div>
  )
}
