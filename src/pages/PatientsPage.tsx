import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Icon } from "../components/Icon"
import { PatientModal } from "../components/PatientModal"
import { useHub } from "../context/HubContext"
import { formatLongDate } from "../lib/format"
import type { Patient } from "../types"

const PAGE_SIZE = 8

type SortKey = "name" | "lastVisit"
type SortDirection = "asc" | "desc"

function SortButton({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
}) {
  const active = activeKey === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-xs transition-colors hover:text-primary ${active ? "text-primary" : ""}`}
      title={`Sort by ${label}`}
    >
      {label}
      <Icon
        name={active ? (direction === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
        className={`text-[14px] ${active ? "opacity-100" : "opacity-40"}`}
      />
    </button>
  )
}

export function PatientsPage() {
  const { clinic, clinicPatients } = useHub()
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null)
      setModalOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    setQuery("")
    setPage(1)
  }, [clinic])

  function handleSort(key: SortKey) {
    setPage(1)
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = clinicPatients.filter(
      (patient) => !q || patient.name.toLowerCase().includes(q),
    )

    const factor = sortDirection === "asc" ? 1 : -1
    return matches.sort((a, b) => {
      switch (sortKey) {
        case "lastVisit":
          // Patients without a visit always sort last, regardless of direction.
          if (!a.lastVisit && !b.lastVisit) return 0
          if (!a.lastVisit) return 1
          if (!b.lastVisit) return -1
          return a.lastVisit.localeCompare(b.lastVisit) * factor
        default:
          return a.name.localeCompare(b.name) * factor
      }
    })
  }, [clinicPatients, query, sortKey, sortDirection])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function openModal(patient: Patient | null) {
    setEditing(patient)
    setModalOpen(true)
  }

  return (
    <>
      <header className="bg-surface border-b border-outline-variant shrink-0 flex justify-between items-center h-[10vh] min-h-14 px-4 md:px-8 xl:px-margin-desktop">
        <div className="flex items-center gap-md pl-10 md:pl-0 min-w-0">
          <h2 className="font-headline-md text-headline-md font-bold text-on-background tracking-tight whitespace-nowrap">
            Patients
          </h2>
        </div>
        <div className="flex-1 max-w-[560px] mx-6">
          <div className="relative group">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors"
            />
            <input
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-full py-2 pl-10 pr-4 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Search patients..."
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="bg-primary-container text-on-primary px-5 py-2 rounded-lg font-label-md shadow-[0_4px_12px_hsla(24,96%,61%,0.15)] hover:shadow-[0_6px_16px_hsla(24,96%,61%,0.2)] hover:-translate-y-0.5 transition-all flex items-center gap-2 whitespace-nowrap"
            onClick={() => openModal(null)}
          >
            <Icon name="person_add" className="text-sm" />
            Add New Patient
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col pt-4 pb-4 px-4 md:px-8 xl:px-margin-desktop gap-sm">
        <div className="bg-surface-lowest rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_hsla(210,40%,96%,0.5)] overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-x-auto flex-1 min-h-0 overflow-y-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
                    <SortButton
                      label="Patient Name"
                      sortKey="name"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">
                    <SortButton
                      label="Last Visit"
                      sortKey="lastVisit"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-lg px-4 text-center font-body-sm text-body-sm text-on-surface-variant">
                      No patients match the current filters.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-amber-accent/10 transition-colors group cursor-pointer"
                      onClick={() => openModal(patient)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border border-outline-variant/30 bg-surface-container text-on-surface">
                            {patient.initials}
                          </div>
                          <div className="font-label-md text-label-md text-on-surface">{patient.name}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-body-md text-body-md text-on-surface">
                        {patient.lastVisit ? formatLongDate(patient.lastVisit) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-amber-accent/30"
                          onClick={() => openModal(patient)}
                          title="View"
                        >
                          <Icon name="visibility" className="text-sm" />
                        </button>
                        <button
                          type="button"
                          className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-amber-accent/30"
                          onClick={() => openModal(patient)}
                          title="Edit"
                        >
                          <Icon name="edit" className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-auto shrink-0 border-t border-outline-variant/30 px-4 py-2 flex items-center justify-between bg-surface-container-low/50 rounded-b-xl">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} patients
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-outline-variant/20 text-on-surface-variant disabled:opacity-50"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <Icon name="chevron_left" />
              </button>
              <div className="flex gap-1 font-body-sm text-body-sm">
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPage(value)}
                    className={`w-8 h-8 rounded font-body-sm ${
                      value === currentPage
                        ? "bg-primary-container text-on-primary font-bold"
                        : "hover:bg-outline-variant/20 text-on-surface"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={currentPage >= pageCount}
                className="p-1 rounded hover:bg-outline-variant/20 text-on-surface-variant disabled:opacity-50"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                <Icon name="chevron_right" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <PatientModal
        open={modalOpen}
        patient={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </>
  )
}
