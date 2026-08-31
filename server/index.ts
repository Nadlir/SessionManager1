import cors from "cors"
import express, { type NextFunction, type Request, type Response } from "express"
import { config } from "./config"
import {
  PATIENT_COLUMN,
  PATIENT_RANGE,
  rowToSession,
  SESSION_COLUMNS,
  SESSION_RANGE,
  sessionToRow,
  type PatientRecord,
  type SessionRecord,
} from "./schema"
import { appendRange, clearRange, readRange, writeRange } from "./sheets"

const app = express()
app.use(cors())
app.use(express.json())

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next)
  }
}

async function loadSessions(): Promise<SessionRecord[]> {
  const rows = await readRange(SESSION_RANGE)
  return rows
    .map((row, index) => rowToSession(row, index + 2))
    // Only rows with nothing at all in them are spacers; a session with a missing field is
    // still a session.
    .filter(
      (session) =>
        session.date !== "" ||
        session.patientName !== "" ||
        session.description !== "" ||
        session.cost !== 0,
    )
}

async function loadPatients(): Promise<PatientRecord[]> {
  const rows = await readRange(PATIENT_RANGE)
  return rows
    .map((row, index) => ({ name: String(row[0] ?? "").trim(), rowNumber: index + 2 }))
    .filter((entry) => entry.name !== "")
    .map((entry) => ({ id: String(entry.rowNumber), name: entry.name }))
}

function sessionFromBody(body: Partial<SessionRecord>): Omit<SessionRecord, "id"> {
  return {
    patientName: body.patientName?.trim() ?? "",
    date: body.date ?? "",
    description: body.description?.trim() ?? "",
    cost: Number(body.cost ?? 0),
    out: Boolean(body.out),
    reportsRosangela: Boolean(body.reportsRosangela),
  }
}

/** Row ids come from the client, so they must be validated before reaching a range. */
function rowNumber(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed >= 2 ? parsed : null
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, spreadsheetId: config.spreadsheetId, tab: config.tab })
})

app.get(
  "/api/patients",
  asyncRoute(async (_req, res) => {
    res.json(await loadPatients())
  }),
)

app.post(
  "/api/patients",
  asyncRoute(async (req, res) => {
    const name = String((req.body as { name?: string }).name ?? "").trim()
    if (!name) {
      res.status(400).json({ error: "Patient name is required" })
      return
    }

    const existing = await loadPatients()
    if (existing.some((patient) => patient.name.toLowerCase() === name.toLowerCase())) {
      res.status(409).json({ error: "Patient already exists" })
      return
    }

    // The patient column is detached from the session table, so the next free cell is targeted
    // directly instead of appending, which would land under the A:F table.
    const nextRow = existing.length + 2
    await writeRange(`${PATIENT_COLUMN}${nextRow}`, [[name]])
    res.status(201).json({ id: String(nextRow), name })
  }),
)

app.put(
  "/api/patients/:id",
  asyncRoute(async (req, res) => {
    const row = rowNumber(String(req.params.id))
    const name = String((req.body as { name?: string }).name ?? "").trim()
    if (!row || !name) {
      res.status(400).json({ error: "A row id and a name are required" })
      return
    }
    await writeRange(`${PATIENT_COLUMN}${row}`, [[name]])
    res.json({ id: String(row), name })
  }),
)

app.get(
  "/api/sessions",
  asyncRoute(async (_req, res) => {
    res.json(await loadSessions())
  }),
)

app.post(
  "/api/sessions",
  asyncRoute(async (req, res) => {
    const session = sessionFromBody(req.body as Partial<SessionRecord>)
    await appendRange(SESSION_COLUMNS, [sessionToRow(session)])

    // The append response reports the written range inconsistently across locales, so the row is
    // located by reloading instead.
    const sessions = await loadSessions()
    const created = sessions[sessions.length - 1]
    res.status(201).json(created ?? { ...session, id: "" })
  }),
)

app.put(
  "/api/sessions/:id",
  asyncRoute(async (req, res) => {
    const row = rowNumber(String(req.params.id))
    if (!row) {
      res.status(400).json({ error: "Invalid session id" })
      return
    }
    const session = sessionFromBody(req.body as Partial<SessionRecord>)
    await writeRange(`A${row}:F${row}`, [sessionToRow(session)])
    res.json({ ...session, id: String(row) })
  }),
)

app.delete(
  "/api/sessions/:id",
  asyncRoute(async (req, res) => {
    const row = rowNumber(String(req.params.id))
    if (!row) {
      res.status(400).json({ error: "Invalid session id" })
      return
    }
    await clearRange(`A${row}:F${row}`)
    res.status(204).end()
  }),
)

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error"
  console.error("[api]", message)
  res.status(500).json({ error: message })
})

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port} (tab: ${config.tab})`)
})
