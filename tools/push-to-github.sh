#!/bin/bash
# Usage: ./tools/push-to-github.sh YOUR_GITHUB_USERNAME [repo-name]
set -euo pipefail
USER="${1:?Usage: $0 GITHUB_USERNAME [repo-name]}"
REPO="${2:-retirement-everest}"
cd "$(dirname "$0")/.."
if git remote get-url origin &>/dev/null; then
  git remote set-url origin "git@github.com:${USER}/${REPO}.git"
else
  git remote add origin "git@github.com:${USER}/${REPO}.git"
fi
git push -u origin main
echo ""
echo "Done: https://github.com/${USER}/${REPO}"
echo "Enable Pages: Settings → Pages → main / (root)"