import { JWT } from "google-auth-library";

async function saveToSheets(lead: any): Promise<string> {
  const jwt = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  const token = await jwt.fetchIdToken(
    "https://sheets.googleapis.com/"
  );
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEETS_ID}/values/Sheet1!A1:append?valueInputOption=RAW`;
  const body = {
    values: [[new Date().toISOString(), lead.name, lead.phone, lead.email, JSON.stringify(lead)]]
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

async function saveToPipedrive(lead: any): Promise<string> {
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

export async function saveLead(lead: any): Promise<string> {
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
