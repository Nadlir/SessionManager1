import { useEffect, useState } from "react"
import { useHub } from "../context/HubContext"
import type { Patient } from "../types"
import { Icon } from "./Icon"

interface PatientModalProps {
  open: boolean
  patient?: Patient | null
  onClose: () => void
}

export function PatientModal({ open, patient, onClose }: PatientModalProps) {
  const { addPatient, updatePatient } = useHub()
  const [name, setName] = useState("")

  useEffect(() => {
    if (!open) return
    setName(patient?.name ?? "")
  }, [open, patient])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const isEdit = Boolean(patient)
  const canSubmit = name.trim().length > 0

  function submit() {
    if (!canSubmit) return
    if (patient) {
      updatePatient(patient.id, { name })
    } else {
      addPatient({ name })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-background/40 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close modal" onClick={onClose} />
      <div className="bg-surface-lowest w-full max-w-[520px] rounded-xl shadow-xl overflow-hidden flex flex-col bg-surface relative">
        <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <h3 className="text-headline-md font-headline-md text-on-surface">
            {isEdit ? "Edit Patient" : "Add New Patient"}
          </h3>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-outline-variant/20 text-on-surface-variant transition-colors"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <form
          className="flex flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="p-6 flex flex-col gap-2">
            <label className="text-label-md font-label-md text-on-surface-variant">Full Name</label>
            <input
              className="w-full bg-surface border border-outline-variant/50 rounded-lg py-2 px-4 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Enter full name"
              type="text"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Patients are stored as a name only. Renaming one also updates their sessions.
            </p>
          </div>

          <div className="px-6 py-4 bg-surface-container-low/50 border-t border-outline-variant/30 flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg font-label-md text-primary hover:bg-amber-accent/30 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-6 py-2 bg-primary-container text-on-primary rounded-lg font-label-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEdit ? "Save Patient" : "Add Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
