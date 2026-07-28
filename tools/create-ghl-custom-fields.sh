#!/bin/bash
# Creates the Retirement Everest custom contact fields in the HAG GHL account.
# Run:
#   export GHL_PIT="pit-...."          # from GHL → Settings → Integrations → Private Integrations
#   export GHL_LOCATION_ID="24UgqDfh5TcJs5IPnA25"   # optional; defaults to HAG
#   bash tools/create-ghl-custom-fields.sh
#
# Never commit a real PIT. Safe to re-run — GHL rejects duplicates.

set -euo pipefail

LOCATION_ID="${GHL_LOCATION_ID:-24UgqDfh5TcJs5IPnA25}"
PIT="${GHL_PIT:-}"

if [[ -z "$PIT" ]]; then
  echo "ERROR: Set GHL_PIT in your environment (do not hardcode it in this file)."
  echo "  export GHL_PIT='pit-...'"
  echo "  bash tools/create-ghl-custom-fields.sh"
  exit 1
fi

if [[ "$PIT" == pit-* && ${#PIT} -lt 20 ]]; then
  echo "ERROR: GHL_PIT looks invalid."
  exit 1
fi

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
echo "  re_event_location  (also reEventLocation / eventLocation)  →  RE Event Location"
echo "  re_event_location_slug  (also location / locationSlug)      →  RE Event Location slug"
echo "  re_venue_name  (also venue)                                  →  RE Venue Name"
echo "  re_venue_city  (also city)                                   →  RE Venue City"
echo "  re_event_date  (also eventDate)                              →  RE Event Date"
echo ""
echo "In SMS/email use: {{contact.re_event_location}}  (not hardcoded Kennedy School)"
echo "Branch with If/Else on: {{contact.re_event_location_slug}}"
echo "Preferred webhook keys are snake_case matching the custom field keys."
