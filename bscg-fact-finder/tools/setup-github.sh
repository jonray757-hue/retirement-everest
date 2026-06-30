#!/bin/bash
# One-time setup for standalone bscg-fact-finder GitHub Pages
set -euo pipefail

USER="jonray757-hue"
REPO="bscg-fact-finder"
KEY="${HOME}/.ssh/id_ed25519_github.pub"

echo "=== BSCG Fact Finder — GitHub setup ==="
echo ""
echo "1) Create empty repo (no README):"
echo "   https://github.com/new?name=${REPO}&description=BSCG+Fact+Finder"
echo ""
echo "2) Add deploy key with WRITE access:"
echo "   https://github.com/${USER}/${REPO}/settings/keys"
echo ""
echo "   Paste this key:"
cat "$KEY"
echo ""
read -r -p "Press Enter after repo + deploy key are saved..."

cd "$(dirname "$0")/.."
export GIT_SSH_COMMAND="ssh -i ${HOME}/.ssh/id_ed25519_github -o IdentitiesOnly=yes"

if git remote get-url origin &>/dev/null; then
  git remote set-url origin "git@github.com:${USER}/${REPO}.git"
else
  git remote add origin "git@github.com:${USER}/${REPO}.git"
fi

git push -u origin main

echo ""
echo "3) Enable Pages: Repo → Settings → Pages → Source: GitHub Actions"
echo ""
echo "Live URL: https://${USER}.github.io/${REPO}/"