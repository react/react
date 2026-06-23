# Flight SSR Benchmark

Measures the performance overhead of the React Server Components (RSC) Flight pipeline compared to plain Fizz server-side rendering, across both Node and Edge (web streams) APIs.

## Prerequisites

Build React from the repo root first:

```sh
yarn build-for-flight-prod
```

Then install the fixture's dependencies:

```sh
cd fixtures/flight-ssr-bench
yarn install
```

## Scripts

| Script | Purpose |
| --- | --- |
| `yarn bench` | Sequential benchmark with Flight script injection (realistic framework pipeline). Best for measuring Edge vs Node overhead. |
| `yarn bench:bare` | Sequential benchmark without script injection. Best for measuring React-internal changes (e.g. Flight serialization optimizations) with less noise from stream plumbing. |
| `yarn bench:server` | HTTP server benchmark using autocannon at c=1 and c=10. Best for measuring real-world req/s. The c=1 results are also useful for tracking React-internal changes. |
| `yarn bench:concurrent` | In-process concurrent benchmark (50 in-flight renders). Measures throughput under load without HTTP overhead. |
| `yarn bench:profile` | CPU profiling via V8 inspector. Saves `.cpuprofile` files to `build/profiles/`. |
| `yarn start` | Starts the HTTP server for manual browser testing at `http://localhost:3001`. Append `.rsc` to any Flight URL to see the raw Flight payload. |

## What it measures

Each script benchmarks 8 render variants:

- **Fizz (Node, sync/async)** -- plain `renderToPipeableStream`, no RSC
- **Fizz (Edge, sync/async)** -- plain `renderToReadableStream`, no RSC
- **Flight + Fizz (Node, sync/async)** -- full RSC pipeline: Flight server (`renderToPipeableStream`) -> Flight client (`createFromNodeStream`) -> Fizz (`renderToPipeableStream`)
- **Flight + Fizz (Edge, sync/async)** -- full RSC pipeline: Flight server (`renderToReadableStream`) -> Flight client (`createFromReadableStream`) -> Fizz (`renderToReadableStream`)

The "sync" variants use a fully synchronous app (no Suspense boundaries). The "async" variants use per-row async components with staggered delays and individual Suspense boundaries (~250 boundaries per render).

### Script injection

The `yarn bench` and `yarn bench:server` scripts simulate what real frameworks do: tee the Flight stream and inject `<script>` hydration tags into the HTML output. This uses a `setTimeout(0)`-buffered Transform/TransformStream to avoid splitting mid-HTML-tag. `yarn bench:bare` skips this for cleaner React-internal measurement.

## Test app

A dashboard with ~25 components (16 client components), rendering:

- 200 product rows with nested reviews, specifications, and supplier data (~325KB Flight payload)
- 50 activity feed items
- Stats grid with 24-month chart data
- Sidebar with navigation and recent activity

## Output

The overhead tables show two comparisons:

1. **Flight overhead** -- Flight+Fizz vs Fizz-only (how much RSC adds)
2. **Edge vs Node** -- web streams vs Node streams (stream implementation cost)

Delta is shown as percentage change plus a factor (e.g. `+120% 2.20x` means 2.2x slower).
