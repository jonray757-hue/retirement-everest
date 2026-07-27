#!/bin/bash
# Creates the Retirement Everest custom contact fields in the HAG GHL account.
# Run:  bash tools/create-ghl-custom-fields.sh
# Safe to re-run — GHL rejects duplicates with an error you can ignore.

LOCATION_ID="24UgqDfh5TcJs5IPnA25"
PIT="pit-f4b67ff6-f5cb-4fce-a1cd-7746bf29a25f"   # HAG private integration token (from your Grok sessions)
API="https://services.leadconnectorhq.com/locations/$LOCATION_ID/customFields"

create_field() {
  local name="$1" type="${2:-TEXT}"
  printf '%-32s' "$name:"
  curl -s -X POST "$API" \
    -H "Authorization: Bearer $PIT" \
    -H "Version: 2021-07-28" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"dataType\":\"$type\",\"model\":\"contact\"}" \
    | python3 -c 'import sys,json
try:
  j=json.load(sys.stdin)
  f=j.get("customField") or {}
  print("CREATED  key=" + f.get("fieldKey","?") if f else "ERROR: " + json.dumps(j)[:140])
except Exception as e:
  print("ERROR:", e)'
}

echo "Creating Retirement Everest custom fields in HAG ($LOCATION_ID)..."
create_field "Party Type"
create_field "Spouse Partner Name"
create_field "Seats"
create_field "Seat Label"
create_field "Seating Help Needed"
create_field "RE Buffet"
create_field "RE Sides"
create_field "RE Entree"
create_field "RE Dessert"
create_field "RE Drink"
create_field "RE Drink Category"
create_field "RE Dietary Notes"
# Location — use these so ONE workflow works for every venue
create_field "RE Event Location"          # friendly: "Kennedy School BBQ", "Jake's"
create_field "RE Event Location Slug"     # machine: kennedy-school-bbq, jakes-grill
create_field "RE Venue Name"              # room/venue line
create_field "RE Venue City"
create_field "RE Event Date"
create_field "Preferences Summary" "LARGE_TEXT"
echo "Done."
echo ""
echo "Inbound webhook → Create/Update Contact mapping (key fields):"
echo "  eventLocation / reEventLocation / locationShort  →  RE Event Location"
echo "  location / locationSlug / reEventLocationSlug    →  RE Event Location Slug"
echo "  venue / reVenueName                              →  RE Venue Name"
echo "  city / reVenueCity                               →  RE Venue City"
echo "  eventDate / reEventDate                          →  RE Event Date"
echo ""
echo "In SMS/email use: {{contact.re_event_location}}  (not hardcoded Kennedy School)"
echo "Branch with If/Else on: {{contact.re_event_location_slug}}"
