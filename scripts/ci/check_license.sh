#!/bin/bash

set -e

# Make sure we don't introduce accidental references to PATENTS.
EXPECTED='scripts/ci/check_license.sh'
ACTUAL=$(git grep -l PATENTS)

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "PATENTS crept into some new files?"
  diff -u <(echo "$EXPECTED") <(echo "$ACTUAL") || true
  exit 1
fi
