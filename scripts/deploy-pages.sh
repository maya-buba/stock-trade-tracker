#!/usr/bin/env bash
# Builds the static export and publishes it to the gh-pages branch.
#
# The gh-pages branch holds only built output, so its history is replaced on
# every deploy rather than accumulating build noise.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/maya-buba/stock-trade-tracker.git}"
BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/stock-trade-tracker}"

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

echo "Building with base path ${BASE_PATH}..."
NEXT_PUBLIC_BASE_PATH="$BASE_PATH" npx next build

staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT

cp -r out/. "$staging/"
touch "$staging/.nojekyll"   # keep _next/ from being treated as Jekyll internals

cd "$staging"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(date -u '+%Y-%m-%d %H:%M UTC')"
git push -q -f "$REPO_URL" gh-pages

echo "Deployed. Live in a minute or two at:"
echo "  https://maya-buba.github.io/stock-trade-tracker/"
