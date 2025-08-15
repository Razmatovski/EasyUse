import { JWT } from "google-auth-library";
import { Lead } from './types/lead';

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getSheetsToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const { token } = await jwt.getAccessToken();
  if (!token) {
    throw new Error("Failed to get access token");
  }
  cachedToken = token;
  tokenExpiry = (jwt.credentials.expiry_date ?? 0) - 60_000;
  return token;
}

async function saveToSheets(lead: Lead): Promise<string> {
  const token = await getSheetsToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEETS_ID}/values/Sheet1!A1:append?valueInputOption=RAW`;
  const body = {
    values: [[
      new Date().toISOString(),
      lead.name,
      lead.phone,
      lead.email,
      lead.consent_v,
      lead.consent_ts,
      lead.ip_hash,
      JSON.stringify(lead)
    ]]
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Sheets append failed");
  const data = await res.json();
  return data.updates?.updatedRange ?? Date.now().toString();
}

async function saveToPipedrive(lead: Lead): Promise<string> {
  const url = `${process.env.PIPEDRIVE_BASE_URL || "https://api.pipedrive.com/v1"}/leads?api_token=${process.env.PIPEDRIVE_API_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `${lead.name} ${lead.phone}`,
      person_id: null,
      note: JSON.stringify(lead)
    })
  });
  if (!res.ok) throw new Error("Pipedrive lead create failed");
  const data = await res.json();
  return String(data.data?.id || Date.now());
}

export async function saveLead(lead: Lead): Promise<string> {
  try {
    if (process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      return await saveToSheets(lead);
    }
    if (process.env.PIPEDRIVE_API_TOKEN) {
      return await saveToPipedrive(lead);
    }
  } catch (e) {
    console.error(e);
  }
  return Date.now().toString();
}
