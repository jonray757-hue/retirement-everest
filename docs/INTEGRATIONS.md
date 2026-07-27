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

### One workflow for every venue (location custom fields)

Do **not** hardcode “Kennedy School” in SMS/email. Map the webhook into contact custom fields and use merge tags.

**Custom fields (HAG)** — already created:

| Custom field | Field key | Webhook keys to map |
|--------------|-----------|---------------------|
| **RE Event Location** | `contact.re_event_location` | `eventLocation` or `reEventLocation` or `locationShort` |
| **RE Event Location Slug** | `contact.re_event_location_slug` | `location` or `locationSlug` or `reEventLocationSlug` |
| **RE Venue Name** | `contact.re_venue_name` | `venue` or `reVenueName` |
| **RE Venue City** | `contact.re_venue_city` | `city` or `reVenueCity` |
| **RE Event Date** | `contact.re_event_date` | `eventDate` or `reEventDate` |

**Guest preference submit** also sends: `firstName`, `lastName`, `email`, `phone`, food prefs (`buffet`, `sides`, `entree`, …), seating, `preferencesSummary`.

**In the inbound webhook workflow:**

1. Trigger: Inbound Webhook  
2. **Create/Update Contact** — map standard + custom fields above  
3. SMS/email body examples:

```text
Hi {{contact.first_name}}, thanks for sharing your preferences for
Retirement Everest at {{contact.re_event_location}}
{{contact.re_venue_city}}.
```

4. Optional **If/Else** only when copy must differ by venue:
   - If `{{contact.re_event_location_slug}}` is `kennedy-school-bbq` → BBQ seating copy  
   - Else → generic plated-dinner copy  

Slug examples: `kennedy-school-bbq`, `jakes-grill`, `edgefield`, `the-cove`, `ringside`.

Re-create missing fields: `bash tools/create-ghl-custom-fields.sh`

---

### Host invite queue (Outreach)

1. Webhook URL is set in Outreach → Integrations (defaults to HAG)  
2. When you **Also push to HAG GHL** on an invite, the host sends:

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

Until GHL is connected for invites, use **Email them** / **Text them** — they launch Mail / Messages with the message pre-filled.

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