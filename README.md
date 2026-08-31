# Medical Hub

Admin portal for session and patient management across the Diversa and Rehup clinics.

## Pages

- **Sessions** — each session records a date, patient's name, description, cost, whether it was
  out, and whether it reports to Rosangela. Filter by patient and month, sort by any column, and
  create or edit through the modal.
- **Patients** — search and manage records. The add/edit patient modal is wired to the table.

## Data sources

Diversa reads and writes a Google Sheet through a small Express API in `server/`, authenticated
with a Google Cloud service account. Rehup is still served from the demo data in `src/data.ts`.

### Google setup

1. In Google Cloud, create a project, enable the **Google Sheets API**, and create a service
   account with a JSON key.
2. Share the spreadsheet with the service account email address, with **Editor** access.
3. Copy `.env.example` to `.env` and fill in the sheet id, the service account email, and the
   private key from the JSON file (keep the `\n` sequences).

### Sheet layout

Everything lives on a single tab (`MainSheet`), described in `server/schema.ts`:

| Range | Contents |
| --- | --- |
| `A:F` | One session per row: date, patient, description, amount, out, reports Rosangela |
| `AA` | The list of patient names |

Row 1 holds the headers and data starts at row 2, so a record's id is simply its row number.
Dates are stored as `DD/MM/YYYY` and converted to ISO on the way in and back on the way out;
amounts are read from formatted values such as `RD$4,500.00` and written as plain numbers, so the
cell's own currency format keeps rendering them. Deleting a session clears its row instead of
removing it, which keeps every other row number — and therefore every id — valid.

Patients exist as names only. Renaming one rewrites the name on all of that patient's session
rows as well, since sessions reference patients by name.

The monthly tabs in the spreadsheet are not read or written by the app.

## Run

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite dev server and the API together; Vite proxies `/api` to
`http://localhost:8787`. Use `npm run dev:web` or `npm run dev:api` to run just one of them.
