# Adding a New Location

## Quick workflow (feed Grok a menu)

1. Copy `templates/location-template.json` → `templates/my-venue.json`
2. Fill in venue info and paste your menu items into the correct `menus` block for your event type
3. Send the file to Grok with: *"Add this location to Retirement Everest"*
4. Grok adds it to `locations.js` — the hub, guest page, host dashboard, and cost planner update automatically

## Event types

| Type | Use when | Guest picks |
|------|----------|-------------|
| `screening` | Plated dinner after film (Edgefield) | Salad + entrée + dessert |
| `preorder` | Pub / à la carte (Chapel) | Optional arrival bite + main + drink |
| `retreat` | Overnight stay (Bonneville) | Room + party size + per-person meals |

## Menu item fields

```json
{ "id": "m1", "name": "Item name", "desc": "Short description", "price": 20.00 }
```

Optional flags: `veg`, `vegan`, `special`, `cat` (Snack/Salad for preorder starters), `sleeps` (rooms)

## Themes

| Theme | Look |
|-------|------|
| `gold` | Edgefield — warm gold on dark |
| `forest` | Bonneville — earth tones |
| `navy` | Chapel — ice blue on navy |

## Storage keys

Each location needs a unique `storageKey` (e.g. `myvenue_orders_v1`). Guest orders save to browser localStorage under this key.

## After adding

- Hub card appears at `index.html`
- Guest page: `guest.html?location=YOUR-SLUG`
- Host dashboard picks it up in the location dropdown
- Set the event date in **Event Planner** to generate the checklist