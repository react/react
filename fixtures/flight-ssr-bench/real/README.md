# Real captured payloads

Benchmarks the Flight server render over real pages instead of the
synthetic app: RSC navigation payloads captured from the logged-in Vercel
dashboard (2026-07-11), revived from wire format back into renderable
models. Contains real account data — don't publish this branch.

| payload | route | shape |
|---|---|---|
| t-deployments | team deployments | typical element-heavy route |
| t-domains | team domains | one 210 KB plain-data blob (testTlds) |
| t-usage | team usage | 1 MB of model rows, chart data + skeletons |
| p-overview | project overview | mixed |

revive.js turns each "$"-encoding back into what it encoded: element
tuples into elements, import rows into registered client references
carrying the captured chunk lists, row backrefs into shared objects,
promises into resolved promises, "$h"/"$F" into registered no-op server
actions. Refs to rows the capture never delivered (aborted PPR streams,
~9-10 per page) revive as null and are reported as holes. Re-serializing
t-deployments reproduces the capture within 1 KB with an identical
row-class distribution.

Run from the fixture directory against the copied prod builds:

    NODE_ENV=production node --conditions react-server --expose-gc \
      real/real-bench.js [name ...]

Each iteration revives a fresh model (a server renders fresh data per
request) and renders through renderToPipeableStream into a null sink.
Reports p50/p95/p99, output bytes, GC count/time via v8.GCProfiler, and
revive coverage stats.
