# Integrations — Shared store, GHL & Google Sheets

## Overview

The command center **Outreach** tab stores webhook URLs in your browser. When you're ready to go live:

1. Open `host.html` → **Outreach**
2. Paste your webhook URLs → **Save integrations**
3. Use **Export ▾** on location reports or **Send guest link** for invites

---

## Durable shared store (seats + preferences) — required for multi-device

Guest phones and the command center must share **one** live database. Free jsonblob bins expire in ~24 hours and caused Safari/Chrome/phone to disagree.

**Use Google Apps Script** (`tools/re-shared-store.gs`) — free, lasts through the Aug 27 event.

1. Open [setup guide](../tools/setup-shared-store.html) or `tools/setup-shared-store.html`
2. Deploy web app (Execute as Me, access **Anyone**) → copy `/exec` URL
3. Paste into Outreach → **Durable shared store URL** → Save → **Test shared store**
4. **Also** put that URL in `locations.js` as `sharedStoreUrl` and push to GitHub so **guest** devices get it without host localStorage

Until `sharedStoreUrl` is set on the live site, the app falls back to short-lived jsonblob.

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
| Full guest sheet → CSV | Name, email, phone, status, seats, party, drink, diet, waitlist |
| Call list → CSV | Name / phone / seat / status for calling |
| Waitlist holds → CSV | Standby seats only, in list order |
| Kitchen / diet → CSV | Seats + adult drink + dietary notes |
| Cost summary → CSV | Headcount, seated vs waitlist, drink mix, estimated F&B |
| Copy table for Sheets | Tab-separated — paste with Cmd/Ctrl+V |
| Push to Google Sheet | POSTs the full guest sheet to your Apps Script webhook |

Each location can use its own tab — the push uses the location short name as the sheet tab.

---

## GoHighLevel (GHL)

### One workflow for every venue (location custom fields)

Do **not** hardcode “Kennedy School” in SMS/email. Map the webhook into contact custom fields and use merge tags.

**Custom fields (HAG)** — already created:

| Custom field | Field key | Webhook keys to map |
|--------------|-----------|---------------------|
| **RE Event Location** | `contact.re_event_location` | **`re_event_location`** (preferred) · also `reEventLocation`, `eventLocation`, `locationShort` |
| **RE Event Location Slug** | `contact.re_event_location_slug` | **`re_event_location_slug`** · also `location`, `locationSlug`, `reEventLocationSlug` |
| **RE Venue Name** | `contact.re_venue_name` | **`re_venue_name`** · also `venue`, `reVenueName` |
| **RE Venue City** | `contact.re_venue_city` | **`re_venue_city`** · also `city`, `reVenueCity` |
| **RE Event Date** | `contact.re_event_date` | **`re_event_date`** · also `eventDate`, `reEventDate` |

**Important:** Inbound webhook → Create/Update Contact should map the custom field **RE Event Location** from webhook key **`re_event_location`** (snake_case, same as the merge tag). Payloads now send both snake_case and camelCase. Example values: `Kennedy School BBQ`, `Jake's`, `Edgefield`.

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

## Contacts tab (command center)

**Contacts** merges three sources into one directory:

| Source | How it appears |
|--------|----------------|
| Guest form submits | Status **registered** — name, email, phone, full food/seat preferences |
| Invite queue / Send guest link | Status **invited** |
| **+ Add contact** | Status **talking** — people you're emailing/texting about events (position, company, notes) |

### Quick connect (Email / Text via GHL)

Does **not** open Mac Mail or Messages. It POSTs to the same HAG inbound webhook:

```json
{
  "event": "host_quick_connect",
  "channel": "sms",
  "sendSms": "yes",
  "sendEmail": "no",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "5035550100",
  "position": "Advisor",
  "company": "Acme Wealth",
  "subject": "Retirement Everest — Kennedy School",
  "message": "Hi Jane, …",
  "sms": "Hi Jane, …",
  "location": "kennedy-school",
  "locationName": "Kennedy School",
  "preferencesSummary": "…",
  "source": "retirement-everest-contacts"
}
```

**GHL workflow (required for delivery):**

1. Trigger: **Inbound Webhook** (same HAG hook URL)
2. **Create/Update Contact** — map `firstName`, `lastName`, `email`, `phone`, optional `position` → title
3. **If/Else** on `{{event}}` or a custom field you map from `event`:
   - If `host_quick_connect` **and** `channel` = `sms` → **Send SMS** body = `{{message}}` or `{{sms}}`
   - If `host_quick_connect` **and** `channel` = `email` → **Send Email** subject = `{{subject}}`, body = `{{message}}`
4. Keep existing branches for `preference_submitted` and `invite_queued`

Without the Send SMS / Send Email actions, contacts still update in GHL but nothing is delivered.

Open: `host.html?view=contacts`

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