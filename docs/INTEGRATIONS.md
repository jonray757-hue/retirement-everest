# Integrations — GHL & Google Sheets

## Overview

The command center **Outreach** tab stores webhook URLs in your browser. When you're ready to go live:

1. Open `host.html` → **Outreach**
2. Paste your webhook URLs → **Save integrations**
3. Use **Export ▾** on location reports or **Send guest link** for invites

---

## Google Sheets (jonray757@gmail.com)

### Step 1 — Create your master spreadsheet

1. Sign in to [Google Sheets](https://sheets.google.com) as **jonray757@gmail.com**
2. Create a new spreadsheet named **Retirement Everest Events**
3. Copy the **Sheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

### Step 2 — Deploy the webhook script

1. In the spreadsheet: **Extensions → Apps Script**
2. Delete any default code and paste the contents of `tools/google-sheets-webhook.gs`
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the **Web app URL** (ends in `/exec`)

### Step 3 — Connect in command center

1. `host.html` → **Outreach** → Integrations
2. Paste:
   - **Google Sheets webhook URL** → the `/exec` URL from step 2
   - **Google Sheet ID** → from step 1
   - **Default tab name** → `Orders` (or a location name like `Edgefield`)
3. **Save integrations**

### Step 4 — Export data

On any **Location Report**:

| Export option | What it does |
|---------------|--------------|
| Orders → CSV download | Full order detail file |
| Orders → copy for Sheets | Tab-separated — paste directly into a sheet |
| Guest list → CSV | Names + RSVP links only |
| Cost summary → CSV | Estimated totals for planning |
| Push orders to Google Sheet | POSTs rows to your Apps Script webhook |

Each location can use its own tab — the push uses the location short name as the sheet tab.

---

## GoHighLevel (GHL)

When your GHL workflow is ready:

1. Create an **Inbound Webhook** trigger in GHL
2. Copy the webhook URL
3. Paste into **GHL webhook URL** in Outreach → Integrations
4. When you **Save to queue** on an invite, the host sends:

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "5035550100",
  "location": "edgefield",
  "guestLink": "https://yoursite.com/guest.html?location=edgefield",
  "message": "Full invite text…",
  "source": "retirement-everest-host"
}
```

Map these fields in your GHL workflow to send SMS/email automations.

Until GHL is connected, use **Open email** and **Open SMS** — they launch your device's mail/SMS apps with the message pre-filled.

---

## Marketing kit

`marketing-kit.html` — browse flyers, mailers, and digital ad creatives per location. Selections save in your browser. Use **Print / PDF** to export.

Poster art: `assets/hero-poster.jpg` (your Retirement Everest documentary poster).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Push to Sheet does nothing | Confirm Apps Script is deployed as "Anyone". Check the script's **Executions** log in Apps Script. |
| CORS errors in browser console | Expected with Apps Script — we use `no-cors` mode; verify rows appear in the sheet. |
| Invites not in GHL | Webhook URL must be saved in Outreach. Use **Save to queue**, not just Copy. |
| Export empty | Guests must submit RSVPs on the guest page first (localStorage per browser). |