#!/usr/bin/env bash
# CI only; pinned Linux x64 binaries stay in an ephemeral runner directory.
set -euo pipefail
: "${RUNNER_TEMP:?This script runs only in a disposable CI runner}"
DEST="$RUNNER_TEMP/nmlb-providers"
mkdir "$DEST"
fetch() { curl --proto '=https' --tlsv1.2 -fLsS --max-time 120 "$1" -o "$2"; }
fetch 'https://github.com/vale-cli/vale/releases/download/v3.26.0/vale_3.26.0_Linux_64-bit.tar.gz' "$DEST/vale.tgz"
fetch 'https://github.com/rvben/rumdl/releases/download/v0.3.2/rumdl-v0.3.2-x86_64-unknown-linux-gnu.tar.gz' "$DEST/rumdl.tgz"
fetch 'https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz' "$DEST/gitleaks.tgz"
(
  cd "$DEST"
  printf '%s\n' \
    '22aa69a556558e4a9dfc63c17030777383d8d3c48dcdfad655fa98e839d666ed  vale.tgz' \
    'f527d1374765d826c1627ceab3d1f46e548268731a495b5b12a3af529b3d79e8  rumdl.tgz' \
    '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  gitleaks.tgz' | sha256sum -c -
  for tool in vale rumdl gitleaks; do
    mkdir "$tool"
    tar -xzf "$tool.tgz" --no-same-owner -C "$tool"
  done
)
npm install --prefix "$DEST/rulesync" --ignore-scripts --no-audit --no-fund --save-exact rulesync@43.6.0
# Preserve the actually resolved npm lock as evidence; it is not the product lockfile.
mkdir -p artifacts/providers
cp "$DEST/rulesync/package-lock.json" artifacts/providers/rulesync-package-lock.json
set +e
node tools/provider-smoke.mjs \
  --rulesync "$DEST/rulesync/node_modules/.bin/rulesync" \
  --vale "$DEST/vale/vale" --rumdl "$DEST/rumdl/rumdl" --gitleaks "$DEST/gitleaks/gitleaks" \
  > artifacts/providers/receipt.json
RESULT=$?
set -e
cat artifacts/providers/receipt.json
exit "$RESULT"
