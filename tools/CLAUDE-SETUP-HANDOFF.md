# Handoff for Claude (or any agent) — durable store + Sheets

**Do not** fight browser automation on script.google.com Ace editor. Manual copy-paste is faster and reliable.

## Repo
- Local: `/Users/ramseykoaharris/Downloads/retirement-everest-multi`
- GitHub: `https://github.com/jonray757-hue/retirement-everest` (`main`)
- Pages: `https://jonray757-hue.github.io/retirement-everest/`

## Live setup UI (best path for Johnny)
https://jonray757-hue.github.io/retirement-everest/tools/setup-shared-store.html

Has both scripts embedded + **Copy** buttons + URL test + handoff message generator.

## Raw code (if needed)
- Shared store: https://raw.githubusercontent.com/jonray757-hue/retirement-everest/main/tools/re-shared-store.gs  
- Sheets webhook: https://raw.githubusercontent.com/jonray757-hue/retirement-everest/main/tools/google-sheets-webhook.gs  

## What Grok / Claude does after URLs exist
1. Set `RETIREMENT_EVEREST.sharedStoreUrl` in `locations.js` to the shared-store `/exec` URL  
2. Optional: `integrations.js` → `DEFAULT_INTEGRATIONS.sharedStoreUrl`, `googleSheetsWebhookUrl`, `googleSheetId`  
3. Bump `?v=` on `host.html` / `guest.html` script tags  
4. Commit as **Johnny Harris** `<johnny@blacksandcapitalgroup.com>`  
5. `git push origin main`  
6. Health-check: `GET {sharedStoreUrl}?key=health` → `{"ok":true,"durable":true,...}`

## What only a human (or logged-in Google browser) must do
1. Create Apps Script project(s)  
2. Paste code, Run `setupOnce` (shared store), authorize  
3. Deploy → Web app → **Anyone** → copy `/exec`  
4. GHL custom fields / workflows (HAG location `24UgqDfh5TcJs5IPnA25`)

## GHL already in code
- Webhook URL in `locations.js` / `integrations.js`  
- Field docs: `docs/INTEGRATIONS.md`  
- Guest + invite + contacts push `re_event_location` snake_case  

## Not available on this Mac
- `clasp`, `gcloud`, `node`/`npx` — don't plan clasp deploy unless installed first.
