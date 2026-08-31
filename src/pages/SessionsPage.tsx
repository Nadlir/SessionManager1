import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Icon } from "../components/Icon"
import { SessionModal } from "../components/SessionModal"
import { useHub } from "../context/HubContext"
import {
  CLINIC_CURRENCY,
  formatDate,
  formatMoney,
  monthKey,
  monthLabel,
  monthRangeLabel,
} from "../lib/format"
import type { Currency, Session } from "../types"

/** Shared column template so the header and the rows always line up. */
const GRID_TEMPLATE =
  "md:grid-cols-[112px_minmax(140px,1.4fr)_minmax(160px,2.2fr)_128px_72px_96px_88px] gap-md"

const FALLBACK_ROW_HEIGHT = 41

const COORDINATION_FEE = 15000
/** Clinic's cut of everything Diversa bills, plus an extra cut on outpatient consultations. */
const CLINIC_SHARE = 0.4
const OUTPATIENT_SHARE = 0.2
const TAX_RATE = 0.1

const ALL_MONTHS = ""
type SortKey = "date" | "patient" | "description" | "cost" | "out" | "reports"
type SortDirection = "asc" | "desc"

function SortButton({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "start",
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
  align?: "start" | "center" | "end"
}) {
  const active = activeKey === sortKey
  const justify =
    align === "center" ? "justify-center" : align === "end" ? "justify-end" : "justify-start"
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex w-full items-center gap-xs ${justify} text-[11px] uppercase tracking-wider transition-colors hover:text-primary ${
        active ? "text-primary" : ""
      }`}
      title={`Sort by ${label}`}
    >
      {label}
      <Icon
        name={active ? (direction === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
        className={`text-[13px] ${active ? "opacity-100" : "opacity-40"}`}
      />
    </button>
  )
}

function BooleanCell({ value, label }: { value: boolean; label: string }) {
  return (
    <span
      role="img"
      aria-label={`${label}: ${value ? "yes" : "no"}`}
      title={value ? "Yes" : "No"}
      className={`inline-flex w-5 h-5 items-center justify-center rounded-full ${
        value
          ? "bg-tertiary-container/30 text-on-tertiary-container"
          : "bg-surface-container text-on-surface-variant"
      }`}
    >
      <Icon name={value ? "check" : "close"} className="text-[14px]" />
    </span>
  )
}

interface PayoutBucket {
  count: number
  gross: number
}

function BreakdownRow({
  label,
  bucket,
  currency,
}: {
  label: string
  bucket: PayoutBucket
  currency: Currency
}) {
  return (
    <tr>
      <td className="py-0.5 pr-sm">{label}</td>
      <td className="text-right">{bucket.count}</td>
      <td className="text-right pl-sm">{formatMoney(bucket.gross, currency)}</td>
    </tr>
  )
}

export function SessionsPage() {
  const { clinic, clinicSessions, removeSession } = useHub()

  const [query, setQuery] = useState("")
  const [month, setMonth] = useState(() => monthKey(new Date().toISOString().slice(0, 10)))
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const listRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState(8)

  // The table never scrolls, so the page size is whatever fits in the space the list is given.
  useLayoutEffect(() => {
    const element = listRef.current
    if (!element) return

    const measure = () => {
      const firstRow = element.querySelector<HTMLElement>("[data-session-row]")
      const rowHeight = firstRow?.offsetHeight || FALLBACK_ROW_HEIGHT
      setPageSize(Math.max(1, Math.floor(element.clientHeight / rowHeight)))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null)
      setModalOpen(true)
    }
  }, [searchParams])

  const months = useMemo(() => {
    const keys = Array.from(new Set(clinicSessions.map((item) => monthKey(item.date)))).sort()
    return keys.length > 0 ? keys : [monthKey(new Date().toISOString().slice(0, 10))]
  }, [clinicSessions])

  useEffect(() => {
    setPage(1)
    setQuery("")
  }, [clinic])

  useEffect(() => {
    // An empty month means "all time", which is always a valid choice.
    if (month === ALL_MONTHS || months.includes(month)) return
    setMonth(months[0] ?? ALL_MONTHS)
  }, [month, months])

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
    const matches = clinicSessions.filter((item) => {
      const matchesQuery = item.patientName.toLowerCase().includes(query.trim().toLowerCase())
      const matchesMonth = month ? monthKey(item.date) === month : true
      return matchesQuery && matchesMonth
    })

    const factor = sortDirection === "asc" ? 1 : -1
    return matches.sort((a, b) => {
      switch (sortKey) {
        case "patient":
          return a.patientName.localeCompare(b.patientName) * factor
        case "description":
          return a.description.localeCompare(b.description) * factor
        case "cost":
          return (a.cost - b.cost) * factor
        case "out":
          return (Number(a.out) - Number(b.out)) * factor
        case "reports":
          return (Number(a.reportsRosangela) - Number(b.reportsRosangela)) * factor
        default:
          return a.date.localeCompare(b.date) * factor
      }
    })
  }, [clinicSessions, query, month, sortKey, sortDirection])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const payout = useMemo(() => {
    const bucket = (predicate: (item: Session) => boolean) => {
      const items = filtered.filter(predicate)
      return { count: items.length, gross: items.reduce((sum, item) => sum + item.cost, 0) }
    }

    const billed = bucket((item) => !item.out && !item.reportsRosangela)
    const outpatient = bucket((item) => item.out)
    const rosangela = bucket((item) => item.reportsRosangela)

    const diversa = billed.gross + outpatient.gross + rosangela.gross + COORDINATION_FEE
    const clinicCut = diversa * CLINIC_SHARE
    const outpatientCut = outpatient.gross * OUTPATIENT_SHARE
    const total = diversa - clinicCut - outpatientCut

    return {
      billed,
      outpatient,
      rosangela,
      coordination: COORDINATION_FEE,
      diversa,
      clinicCut,
      outpatientCut,
      total,
      tax: total * TAX_RATE,
      net: total * (1 - TAX_RATE),
    }
  }, [filtered])

  useEffect(() => {
    const close = () => setMenuId(null)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [])

  const currency = CLINIC_CURRENCY[clinic]

  return (
    <>
      <header className="h-[10vh] min-h-14 shrink-0 px-4 md:px-8 xl:px-margin-desktop flex items-center gap-md border-b border-outline-variant/30 bg-surface/50 backdrop-blur-md z-30">
        <h1 className="font-display text-headline-md text-on-background font-bold tracking-tight pl-10 md:pl-0">
          Sessions
        </h1>
        <div className="bg-primary-container/20 border border-primary-container/30 rounded-lg px-sm py-xs hidden sm:flex items-center gap-sm relative shrink-0">
          <Icon name="payments" className="text-lg text-on-primary-container" />
          <div className="flex items-baseline gap-xs">
            <span className="font-label-md text-label-md font-bold text-on-primary-container tracking-tight">
              {formatMoney(payout.net, currency)}
            </span>
            <span className="text-[11px] text-on-primary-container/70 whitespace-nowrap">
              net · {formatMoney(payout.total, currency)} total · {filtered.length} sessions
            </span>
          </div>
          <div className="group relative flex items-center">
            <Icon
              name="info"
              className="text-sm text-on-primary-container cursor-help opacity-70 hover:opacity-100 transition-opacity"
            />
            <div className="absolute top-full right-0 mt-2 w-[420px] p-sm bg-inverse-surface text-inverse-on-surface text-[12px] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none z-50 text-left">
              <p className="font-semibold mb-xs">How the payment is calculated</p>
              <table className="w-full border-collapse tabular-nums">
                <thead>
                  <tr className="text-inverse-on-surface/60 text-[11px] uppercase tracking-wide">
                    <th className="text-left font-medium pb-1">Item</th>
                    <th className="text-right font-medium pb-1">Sessions</th>
                    <th className="text-right font-medium pb-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <BreakdownRow
                    label="Total billed session"
                    bucket={payout.billed}
                    currency={currency}
                  />
                  <BreakdownRow
                    label="Total outpatient consultation"
                    bucket={payout.outpatient}
                    currency={currency}
                  />
                  <BreakdownRow label="Total Rosangela" bucket={payout.rosangela} currency={currency} />
                  <tr>
                    <td className="py-0.5">Total payment coordination</td>
                    <td className="text-right text-inverse-on-surface/60">—</td>
                    <td className="text-right pl-sm">{formatMoney(payout.coordination, currency)}</td>
                  </tr>
                  <tr className="font-semibold border-t border-inverse-on-surface/20">
                    <td className="pt-1" colSpan={2}>
                      Total diversa
                    </td>
                    <td className="text-right pt-1">{formatMoney(payout.diversa, currency)}</td>
                  </tr>
                </tbody>
                <tfoot className="border-t border-inverse-on-surface/20">
                  <tr>
                    <td className="pt-1" colSpan={2}>
                      Clinic share 40% of total diversa
                    </td>
                    <td className="text-right pt-1">− {formatMoney(payout.clinicCut, currency)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2}>Extra 20% of outpatient consultation</td>
                    <td className="text-right">− {formatMoney(payout.outpatientCut, currency)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td colSpan={2}>Total</td>
                    <td className="text-right">{formatMoney(payout.total, currency)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2}>Taxes 10%</td>
                    <td className="text-right">− {formatMoney(payout.tax, currency)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td colSpan={2}>Net payment</td>
                    <td className="text-right">{formatMoney(payout.net, currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="bg-primary text-on-primary font-label-md text-label-md px-md py-xs rounded-lg flex items-center gap-xs hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm active:scale-95 border border-transparent focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background whitespace-nowrap shrink-0 ml-auto"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Icon name="add" filled className="text-lg" />
          Add New Session
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 md:px-8 xl:px-margin-desktop gap-md">
        <div className="bg-surface rounded-xl p-sm border border-outline-variant shadow-sm flex flex-wrap items-center gap-sm relative overflow-hidden shrink-0">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative w-64 shrink-0 z-10">
            <Icon
              name="search"
              className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              className="w-full pl-10 pr-sm py-sm bg-surface-container-lowest border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none placeholder:text-on-surface-variant/70"
              placeholder="Search patient name..."
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="relative z-10">
            <Icon
              name="calendar_month"
              className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <select
              className="pl-10 pr-sm py-sm bg-surface-container-lowest border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none cursor-pointer appearance-none"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value)
                setPage(1)
              }}
            >
              <option value={ALL_MONTHS}>All time</option>
              {months.map((key) => (
                <option key={key} value={key}>
                  {monthLabel(key)}
                </option>
              ))}
            </select>
          </div>
          <span className="relative z-10 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
            {month === ALL_MONTHS ? "Every recorded session" : monthRangeLabel(month)}
          </span>
        </div>

        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          <div
            className={`hidden md:grid ${GRID_TEMPLATE} px-md py-sm bg-surface-container-lowest border-b border-outline-variant font-label-sm text-on-surface-variant shrink-0 z-20`}
          >
            <SortButton
              label="Date"
              sortKey="date"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortButton
              label="Patient's Name"
              sortKey="patient"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortButton
              label="Description"
              sortKey="description"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortButton
              label="Cost"
              sortKey="cost"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
              align="end"
            />
            <SortButton
              label="Out"
              sortKey="out"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
              align="center"
            />
            <SortButton
              label="Reports"
              sortKey="reports"
              activeKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
              align="center"
            />
            <div className="flex items-center justify-end text-[11px] uppercase tracking-wider">
              Actions
            </div>
          </div>

          <div ref={listRef} className="flex flex-col bg-background flex-1 min-h-0 overflow-hidden">
            {pageItems.length === 0 ? (
              <div className="px-md py-lg text-center font-body-sm text-body-sm text-on-surface-variant">
                No sessions match the current filters.
              </div>
            ) : (
              pageItems.map((item) => (
                <div
                  key={item.id}
                  data-session-row
                  className={`grid grid-cols-1 ${GRID_TEMPLATE} items-center px-md py-xs border-b border-outline-variant/50 bg-surface table-row-hover group`}
                >
                  <div className="font-label-md text-[13px] text-on-surface whitespace-nowrap">
                    {formatDate(item.date)}
                  </div>
                  <div className="flex items-center gap-sm min-w-0">
                    <div className="w-7 h-7 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center overflow-hidden flex-shrink-0">
                      <span className="font-label-md text-[11px]">{item.initials}</span>
                    </div>
                    <span className="font-label-md text-[13px] text-on-surface truncate">
                      {item.patientName}
                    </span>
                  </div>
                  <div
                    className="font-body-sm text-[13px] text-on-surface-variant truncate"
                    title={item.description}
                  >
                    {item.description}
                  </div>
                  <div className="font-body-sm text-[13px] text-on-surface font-medium whitespace-nowrap text-right tabular-nums">
                    {formatMoney(item.cost, item.currency)}
                  </div>
                  <div className="flex justify-center">
                    <BooleanCell value={item.out} label="Out" />
                  </div>
                  <div className="flex justify-center">
                    <BooleanCell value={item.reportsRosangela} label="Reports Rosangela" />
                  </div>
                  <div className="flex justify-end gap-xs md:opacity-50 group-hover:opacity-100 transition-opacity relative">
                    <button
                      type="button"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary-container transition-colors"
                      title="Edit"
                      onClick={() => {
                        setEditing(item)
                        setModalOpen(true)
                      }}
                    >
                      <Icon name="edit" className="text-[18px]" />
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary-container transition-colors"
                      title="More options"
                      onClick={(event) => {
                        event.stopPropagation()
                        setMenuId((current) => (current === item.id ? null : item.id))
                      }}
                    >
                      <Icon name="more_vert" className="text-[18px]" />
                    </button>
                    {menuId === item.id ? (
                      <div className="absolute right-0 top-9 z-30 w-40 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-1">
                        <button
                          type="button"
                          className="w-full text-left px-sm py-xs font-body-sm text-body-sm text-error hover:bg-error-container"
                          onClick={() => removeSession(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-md py-sm bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between shrink-0 mt-auto">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} sessions
            </span>
            <div className="flex items-center gap-xs">
              <button
                type="button"
                disabled={currentPage <= 1}
                className="w-8 h-8 rounded-md border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <Icon name="chevron_left" className="text-[20px]" />
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPage(value)}
                  className={`w-8 h-8 rounded-md font-label-sm text-label-sm flex items-center justify-center ${
                    value === currentPage
                      ? "bg-primary-container text-on-primary-container"
                      : "hover:bg-surface-container-low text-on-surface-variant transition-colors"
                  }`}
                >
                  {value}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= pageCount}
                className="w-8 h-8 rounded-md border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                <Icon name="chevron_right" className="text-[20px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SessionModal
        open={modalOpen}
        session={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </>
  )
}
