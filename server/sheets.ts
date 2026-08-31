import { google, type sheets_v4 } from "googleapis"
import { config } from "./config"

let client: sheets_v4.Sheets | null = null

function sheets(): sheets_v4.Sheets {
  if (!client) {
    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })
    client = google.sheets({ version: "v4", auth })
  }
  return client
}

function ref(range: string): string {
  return `'${config.tab}'!${range}`
}

export async function readRange(range: string): Promise<unknown[][]> {
  const response = await sheets().spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: ref(range),
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  })
  return (response.data.values ?? []) as unknown[][]
}

export async function writeRange(range: string, values: unknown[][]): Promise<void> {
  await sheets().spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: ref(range),
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  })
}

export async function appendRange(range: string, values: unknown[][]): Promise<void> {
  await sheets().spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: ref(range),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "OVERWRITE",
    requestBody: { values },
  })
}

export async function clearRange(range: string): Promise<void> {
  await sheets().spreadsheets.values.clear({
    spreadsheetId: config.spreadsheetId,
    range: ref(range),
  })
}
