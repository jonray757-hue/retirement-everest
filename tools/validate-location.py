#!/usr/bin/env python3
"""Validate a location JSON file before adding to locations.js."""
import json, sys

REQUIRED = ['id', 'slug', 'type', 'theme', 'name', 'shortName', 'city', 'storageKey', 'menus']
TYPES = {'screening', 'preorder', 'retreat'}
MENUS = {
    'screening': {'salads', 'entrees', 'desserts'},
    'preorder': {'starters', 'mains', 'drinks'},
    'retreat': {'rooms', 'starters', 'drinks', 'dinners'},
}

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else 'templates/location-template.json'
    with open(path) as f:
        data = json.load(f)
    errors = []
    for key in REQUIRED:
        if key not in data or (key != 'menus' and not data[key]):
            errors.append(f'Missing required field: {key}')
    if data.get('type') not in TYPES:
        errors.append(f"type must be one of {TYPES}")
    t = data.get('type')
    if t in MENUS:
        for m in MENUS[t]:
            if m not in data.get('menus', {}):
                errors.append(f'Missing menus.{m} for type {t}')
    if errors:
        print('INVALID:')
        for e in errors: print(' -', e)
        sys.exit(1)
    print(f'OK: {data["shortName"]} ({data["slug"]}) ready to add')

if __name__ == '__main__':
    main()