#!/bin/bash
# Usage: ./tools/push-to-github.sh [repo-name]
set -euo pipefail
USER="jonray757-hue"
REPO="${1:-bscg-fact-finder}"
cd "$(dirname "$0")/.."
if git remote get-url origin &>/dev/null; then
  git remote set-url origin "git@github.com:${USER}/${REPO}.git"
else
  git remote add origin "git@github.com:${USER}/${REPO}.git"
fi
export GIT_SSH_COMMAND="ssh -i ${HOME}/.ssh/id_ed25519_bscg -o IdentitiesOnly=yes"
git remote set-url origin "git@github.com:${USER}/${REPO}.git"
git push -u origin main
echo ""
echo "Live site (after Pages enabled): https://${USER}.github.io/${REPO}/"
echo "Enable Pages: Repo → Settings → Pages → GitHub Actions"