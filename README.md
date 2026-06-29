# Retirement Everest — Event Series

Multi-location guest reservations, host command center, and event planning for private Retirement Everest screenings and retreats.

## Live demo

Deploy to **GitHub Pages** (see below), then share:

- `https://YOUR-USERNAME.github.io/retirement-everest/` — location hub
- `https://YOUR-USERNAME.github.io/retirement-everest/guest.html?location=chapel` — guest RSVP

## Local use

Open `index.html` in a browser, or run a local server:

```bash
cd retirement-everest-multi
python3 -m http.server 8080
# → http://localhost:8080
```

**Host password:** `1234` (change in `locations.js` → `hostPassword`)

## Command center (host)

`host.html` has three tabs:

| Tab | Purpose |
|-----|---------|
| **Overview** | Series-wide totals, all locations, upcoming events |
| **Location Report** | Per-venue orders, rankings, export menu |
| **Event Planner** | Set event date → auto-checklist with due dates |
| **Outreach** | Send guest links, invite queue, GHL + Sheets webhooks |

**Marketing kit:** `marketing-kit.html` — flyers, mailers, social ads per location.

**Integrations:** See `docs/INTEGRATIONS.md` for Google Sheets (jonray757@gmail.com) and GHL setup.

Event dates and checklists save to browser localStorage (`re_events_v1`).

## Adding a new location

1. Fill out `templates/location-template.json` with your menu
2. Send it to Grok: *"Add this location"*
3. Or follow `docs/ADD-LOCATION.md`

## Deploy to GitHub Pages

```bash
cd retirement-everest-multi
git init
git add .
git commit -m "Retirement Everest event series"
# Create repo on github.com (e.g. retirement-everest), then:
git remote add origin https://github.com/YOUR-USERNAME/retirement-everest.git
git branch -M main
git push -u origin main
```

**Enable Pages (one-time):**

1. Repo → **Settings → Pages**
2. **Build and deployment → Source:** choose **GitHub Actions** (recommended)
3. After the deploy workflow runs, the site is live at:
   `https://jonray757-hue.github.io/retirement-everest/`

Alternative: Source **Deploy from branch** → `main` / `/ (root)` also works.

If you see 404, Pages simply isn't enabled yet — the code is fine.

## Data notes

- Guest orders are stored in **browser localStorage** per device/browser
- Deploying live gives everyone the same URLs, but orders don't sync across devices yet
- Next step for production: webhook backend (GHL, Airtable, or Supabase) for cross-device sync

## Locations

| Slug | Venue | Type |
|------|-------|------|
| `edgefield` | McMenamins Edgefield | screening |
| `bonneville` | Bonneville Hot Springs | retreat |
| `chapel` | Chapel Pub | preorder |
| `grand-lodge` | McMenamins Grand Lodge | screening |
| `kennedy-school` | McMenamins Kennedy School | preorder |