# AI Chat × React Performance Tracks — Design & Implementation Plan

Status: planned (v3 in ROADMAP.md). Prereq: R1 provider tests. P3/P4 and
small UX items are explicitly parked; this is the next feature work.

## 1. Background & motivation

React 19.2+ replaced the old scheduling profiler with **Performance
Tracks** (`react-reconciler/src/ReactFiberPerformanceTrack.js`): custom
tracks rendered in Chrome DevTools' Performance panel. They carry the
causality data the chat lost when `get_scheduling_events` was removed
(the old path is permanently off: `enableSchedulingProfiler =
!enableComponentPerformanceTrack && __PROFILE__`, and the track flag
defaults to `true`).

What the tracks contain that the chat cannot see today:

| Track | Spans |
|---|---|
| `Scheduler ⚛` group, one subtrack per lane (Blocking, Transition, Suspense, Idle, +Gesture experimental) | `Event: <type>` → `Update` → `Render` → `Commit` → `Remaining Effects`; `Blocked`/`Waiting for Paint` gaps; `Cascading Update` warning spans; interrupted/suspended/recovered render phases |
| `Components ⚛` | per-component render spans (split across yields), individual effect spans, Mount/Unmount, errors |

The RDT Profiler and the tracks measure with the **same clock**
(`performance.now()`; our commit timestamps are that clock minus
`profilingStartTime`) and the same fiber timing fields — so correlation
with existing commit data is exact, not heuristic.

## 2. How the data is emitted (research findings, 2026-07-06)

- Since facebook/react PR #32736, nearly all track entries are emitted via
  the extended **`console.timeStamp(label, start, end, trackName,
  trackGroup, color)`** (Chrome 136+ extensibility API). These entries
  **never enter the performance timeline** — `PerformanceObserver` cannot
  see them. The PR states the sanctioned consumption path verbatim: *the
  site should patch `console.timeStamp`*.
- A small **DEV-only** subset still uses `performance.measure()` with
  `detail.devtools` — only entries carrying a `properties` payload
  (changed-props diffs, error details, cascading-update attribution).
  React calls `performance.clearMeasures()` immediately after each one;
  a `PerformanceObserver` still receives them at creation time (spec
  behavior), but React treats this surface as non-API and it may shrink.
- Emission gating (`supportsUserTiming`, ReactFiberPerformanceTrack.js):
  `enableProfilerTimer` (= `__PROFILE__`) + `console.timeStamp` exists +
  (in DEV) `performance.measure` exists. Net availability:

| Profiled app build | Tracks emitted |
|---|---|
| React 19.2+ development | full (Scheduler + Components) |
| React 19.2+ profiling | Scheduler; Components only under `<Profiler>` |
| React 19.2+ production | none |
| React ≤19.1 / 18 / 17 (any build) | none |

## 3. Version policy (decided)

**Progressive enhancement, never a dependency.**

- No version sniffing. The wrapper is installed on every recording; the
  presence of captured spans IS the capability check.
- React 18/17 apps keep today's full experience (commit data, change
  descriptions, input events, source tools) untouched.
- The chat *names* the gap instead of hiding it: summary line + tool
  responses say "requires React 19.2+ development build" when empty.
- Do NOT resurrect the React-18 legacy `injectProfilingHooks` timeline
  path (needs `react-dom/profiling` builds nobody runs in dev; preserved
  on branch `profiler-ai-chat-mcp-backup` if ever needed).

## 4. Architecture

Same pattern as `userInputEvents` (proven end-to-end): capture in the
backend during recording → optional field on the profiling payload →
frontend tools + summary.

```
page (app realm)
  console.timeStamp  ←– wrapped by RDT backend while isProfiling
        │  filter: known React tracks only
        ▼
  trackSpans buffer (cap + count dropped)
        │  stopProfiling: restore console, attach to payload
        ▼
ProfilingDataBackend.performanceTrackSpans?   (bridge, export-safe)
        ▼
ProfilingDataFrontend.performanceTrackSpans?
        ▼
profileSummary availability line  +  tools (conditional)
```

### 4.1 Capture (backend, `renderer.js`)

- Wrap `console.timeStamp` on the **renderer's `global`** (lesson from
  input capture: react-devtools-inline runs the backend in a different
  window than the page — never use module `window`).
- Install at `startProfiling`, restore at `stopProfiling`. Pass-through
  wrapper: call the original with untouched arguments first; capture is
  side-channel only. Never throw out of the wrapper.
- Patch/restore hygiene: keep a ref to the wrapped original; on restore,
  only swap back if `console.timeStamp` is still our wrapper (another
  patcher may have stacked on top — in that case leave the chain intact
  and just stop recording). Coordinate with RDT's existing console
  patching (`backend/console.js`) — different method, no overlap, but the
  restore-order rule applies to both.
- Capture filter: only calls with ≥5 args whose `trackName`/`trackGroup`
  is one of React's (`Components ⚛`, `Scheduler ⚛` group, lane names
  Blocking/Transition/Suspense/Idle/Gesture). The app's own custom tracks
  and plain single-arg `console.timeStamp(label)` marks pass through
  uncaptured.
- Span record: `{name, start, end, track, trackGroup: string | null,
  color: string | null}` with `start/end` rebased to the commit clock
  (`t - profilingStartTime`) at capture time.
- Budgets: cap total spans (e.g. 3000). Scheduler-track spans are few and
  precious — never drop them; when over cap, drop `Components ⚛` spans
  first (shortest first) and count what was dropped so tools can report
  truncation. All caps surfaced, never silent.
- DEV `performance.measure` enrichment (cascading-update attribution —
  component + method name) is **optional stage 2**: a PerformanceObserver
  on `measure` entries matched by name/time to captured spans. Best-effort
  only; feature must be complete without it. Ship T1 without, evaluate
  after.

### 4.2 Transport

- New optional field `performanceTrackSpans?: Array<TrackSpan>` on
  `ProfilingDataBackend` → `ProfilingDataFrontend`, following the
  `userInputEvents` plumbing exactly (bridge serialization, export/import
  round-trip; absent field = older exports stay loadable — no version
  break).

### 4.3 Exposure (frontend)

- **Summary line** (profileSummary.js), always present when profiling
  data exists:
  - available: `Scheduler phase data: available (N phase spans, M
    cascading updates)`
  - empty: `Scheduler phase data: not available — requires React 19.2+
    development build.`
- **Tools** (toolRegistry) — registered ONLY when spans exist, so the
  prompt never advertises dead tools:
  - `get_scheduler_phases({commit_number?, start_ms?, end_ms?})` — the
    lane-phase spans (Event/Update/Render/Commit/Remaining
    Effects/Blocked...) in a window; defaults to the window around the
    given commit. Output: semicolon rows `lane;phase;start_ms;end_ms;
    duration_ms;label`, 64KB budget like the other tools.
  - `get_cascading_updates()` — all `Cascading Update` spans (+
    attribution when the DEV enrichment lands), each with the nearest
    following commit number for cross-reference.
  - `get_component_track_spans({component_name?, commit_number?})` —
    render/effect spans from `Components ⚛` (answers "which individual
    effect was slow", which aggregate `effectDuration` cannot).
- **Prompt guidance** (buildSystemPrompt): prefer phase data when present;
  when absent, reason from commit data and say the analysis is
  commit-level. Correlation hint: track spans, commits, and input events
  share one clock.

## 5. What questions this unlocks

- "Why did the UI freeze after the click?" → Event at t, Update queued,
  40ms Blocked, Render 120ms, Commit 8ms — the wait was render, not
  effects.
- "Commit 5 came out of nowhere" → Cascading Update span: scheduled
  during commit 4 (by `TodoList` `useEffect` once enrichment lands).
- "`effectDuration` says 90ms — which effect?" → per-effect spans name
  the component and the individual cost.
- "Was this a priority problem?" → work on Transition lane preempted by
  Blocking lane, visible as interleaved spans.

## 6. Milestones

- **T1 — capture + transport**: wrapper, filter, rebase, caps, payload
  field, export round-trip. Unit tests: fake `console.timeStamp` calls →
  buffer contents, rebasing, cap policy (scheduler spans survive),
  restore hygiene (stacked patcher case). Acceptance: recording in the
  shell (19.2 dev build) yields spans in `ProfilingDataFrontend`; a
  recording of an 18.x app yields an absent/empty field and no errors.
- **T2 — tools + summary + prompt**: the three tools, conditional
  registration, availability line, guidance. Unit tests: tool output
  formatting/truncation; registry excludes tools when field empty.
  Acceptance: chat answers a phase question citing real span times.
- **T3 — end-to-end verification**: shell — click → phases → cascading
  update flagged, plus tool-driven answer quality check on all three
  tools; then an 18.x fixture — chat states the version limitation
  cleanly. Suite green; extension rebuilt.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| React changes span labels/tracks (they're display strings, not API) | capture is schema-light (strings through); tools group by track/known labels with an "other" bucket; labels centralized in one constants module for cheap updates |
| Another library also wraps `console.timeStamp` | pass-through wrapper + restore-only-if-ours; stacking is safe in both orders |
| Span volume on large apps | caps with priority (scheduler > components), truncation always reported |
| Overhead while recording | wrapper is push-to-array + one arithmetic op; profiling already accepts instrumentation cost |
| DEV `performance.measure` surface shrinks | it's an optional enrichment, not a dependency |
| Chrome < 136 in the profiled browser | React still calls `console.timeStamp` (function has existed for years); capture works regardless of whether Chrome renders the tracks |
