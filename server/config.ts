import "dotenv/config"

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  spreadsheetId: required("GOOGLE_SHEET_ID"),
  clientEmail: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  // Private keys are stored in .env with literal \n sequences, which must become real newlines.
  privateKey: required("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  tab: process.env.SHEET_TAB ?? "MainSheet",
}
