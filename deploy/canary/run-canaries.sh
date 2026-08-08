#!/usr/bin/env bash
# Run both production canaries in a throwaway container.
#
# Neither script is installed on the host: they are mounted read-only into a
# stock node image which is then discarded. The host has no Node and also runs a
# co-tenant application holding real patient data, so adding a toolchain there to
# run two self-contained scripts would be surface for nothing.
#
# BOTH canaries always run, and the exit codes are combined. An early `set -e`
# would let a residency failure hide an integrity failure, which is the wrong way
# round: when one thing about production is wrong, that is exactly when you want
# to know whether the other is too.
set -uo pipefail

DIR=/opt/towardpcc-canary
IMAGE=node:22-alpine
status=0

run_one() {
  local name="$1"
  echo "=== ${name} ==="
  if docker run --rm --network host \
      -v "${DIR}:/w:ro" -w /w \
      --user 65534:65534 \
      "${IMAGE}" node "${name}"; then
    echo "=== ${name}: PASS ==="
  else
    local rc=$?
    echo "=== ${name}: FAIL (exit ${rc}) ==="
    status=1
  fi
}

run_one check-residency.mjs
run_one check-integrity.mjs

if [ "${status}" -ne 0 ]; then
  echo "CANARY FAILED — production may not match what the site claims."
fi
exit "${status}"
