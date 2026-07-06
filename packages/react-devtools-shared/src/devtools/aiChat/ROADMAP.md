# AI Chat Roadmap v2: React-layer correlation + Skills

## Goal

Make the Profiler AI chat answer *"what user action caused this render, and
where did the time go?"* using only data React DevTools itself records —
no external MCP servers, no Chrome debug ports, no replaying user flows.

We adopt the *techniques* of Chrome DevTools' performance agent and
chrome-devtools-mcp (dense summaries, drill-down tools with byte budgets,
compact serialization) but apply them at the React DevTools layer, where
everything shares one clock and describes the original session.

Decision record: an earlier milestone connected external MCP servers
(preserved on the `profiler-ai-chat-mcp-backup` branch). It was dropped
because its correlation story required *replaying* the user flow in a
debug-port Chrome — fragile (state drift), unsafe for destructive actions,
heavy on setup, and expensive in tokens (dozens of tool schemas per request).
The React layer already records causality (`updaters`, `changeDescriptions`,
timeline `schedulingEvents` with lanes) from the original interaction.

North-star demo: record a session in the UserList playground with one typed
name and one Save click; ask "what did the user do, and which action was
expensive?" The model reads the recorded interaction events and scheduling
events, ties the Save click to the slow commit, drills into it with tools,
and recommends the fix — all from one recording, one clock, zero setup.

## Milestones

### N0 — Re-land the agent loop (MCP-free)

Cherry-pick from `profiler-ai-chat-mcp-backup` (commit f39781a69), stripping
all MCP code (McpClient, useMcpServers, MCP settings UI, consent flow,
MCP_SETUP.md, trace-correlation guidance):

- `client.js`: streamed OpenAI-compatible `tool_calls` parsing.
- `agentLoop.js`: model<->tool cycle, max 8 iterations, abortable.
- `toolRegistry.js`: 64KB per-result budget, narrow-your-query errors.
- `profilerTools.js`: get_commit, get_component_commits, get_render_cause.
- Transcript UI: tool-call rows + collapsible results.
- Keep the two bug fixes from that commit (pure setMessages updaters via the
  `streaming` marker; useMcpServers' JSON-string localStorage pattern is
  dropped along with the file, but the lesson is recorded in ROADMAP/memory).

### N1 — User interaction capture (opt-out, default ON)

Record real browser input events during profiling, on the profiling clock,
so sessions carry their own cause data:

- New setting "Record user interaction events (clicks, key presses) while
  profiling" — **default true** — in Profiler settings, stored like
  recordChangeDescriptions (Store property + session storage key
  `SESSION_STORAGE_RECORD_USER_INPUT_EVENTS_KEY`).
- Flag flows through the existing path: `ProfilerStore.startProfiling()` →
  bridge `startProfiling` payload (`ProfilingSettings.recordUserInputEvents`,
  optional so old payloads stay valid) → `agent.js` →
  `renderer.startProfiling`.
- IMPLEMENTATION NOTE (changed from the original plan): capture lives in
  `renderer.js`, NOT `profilingHooks` — the timeline hooks only exist when
  React was built with scheduling-profiler support (`injectProfilingHooks`),
  which standard development builds lack. The renderer always exists, and
  its clock is the commit clock, eliminating the timeline-offset caveat.
  Listeners must attach to the renderer's `global` (the window being
  profiled), not the module's own `window` — with react-devtools-inline the
  backend can run in a different window than the page.
- Events ride a new optional `userInputEvents` field on the profiling
  payload (backend → frontend → export), coalesced per type at 50ms, capped
  at 500.
- **Privacy**: record event *types and timings only* — never key values,
  input text, or target content.

### N2 — React-layer correlation in the chat

- Summary gains a "## User interactions" section (event type + timestamp,
  top-N, truncation notes) and scheduling-event counts.
- New tools:
  - `get_scheduling_events(commit_index?)` — schedule-render /
    schedule-state-update events with component names, lanes (mapped to
    human-readable labels via laneToLabelMap), and timestamps; optionally
    filtered to the window before a given commit.
  - `get_interactions(start_ms?, end_ms?)` — recorded input events in a
    time window.
- Prompt guidance: everything shares the profiling clock; note the small
  fixed offset between timeline startTime and profiling start; typical
  chain to cite: input event → scheduling event (component, lane) →
  commit(s) → slow components (get_commit / get_render_cause).
- Extend the UserList demo verification: typed keystrokes correlate with
  fast form commits; the click correlates with the slow list commit.

### N3 — Skills (unchanged from v1 plan)

SKILL.md-format instruction packs: catalog (name+description) in the system
prompt, `load_skill` tool for the body; bundled `react-performance` and
`wasted-renders` skills; user-added skills via settings.

### N4 — Hardening

Loop/tool unit tests, token budgets across accumulated tool results,
malformed-tool-call tolerance for small models.

## Risks / notes

- **React-layer visibility only**: no paint/layout/GC/third-party-script
  costs. Commit effect durations partially cover post-render work. If
  browser-level depth is ever needed, users can import a Chrome Performance
  trace into the Timeline tab (nativeEvents et al. populate from the import)
  — same chat tools work on it, still no external servers.
- **Clock skew**: timeline timestamps are relative to timeline start,
  commits to profiling start; both from performance.now() within one
  session, differing by a small fixed offset. Expose the offset rather than
  pretending it's zero.
- **Listener overhead**: passive capture-phase listeners are ~free; still
  gated behind the setting and the profiling window only.
- **Learned the hard way** (keep in mind for new code): `useLocalStorage`
  snapshots via JSON.parse — only store primitives (serialize arrays to
  JSON strings); `setMessages` updaters must stay pure (no ref mutation) or
  streamed updates duplicate under rebasing.

## Provider architecture v2 (planned)

### Goal

Replace the ad-hoc provider presets with a well-architected provider layer
(modeled on opencode's proven split) that makes adding providers cheap and
supports two auth kinds per provider: **api-key** and **subscription**
(imported OAuth tokens). First targets: OpenAI (api key) and OpenAI Codex
via ChatGPT subscription. The "Custom" preset is removed; custom needs are
covered by the OpenAI-compatible provider definition shape itself.

### Architecture (opencode-inspired, zero new dependencies)

Three seams, mirroring the industry-standard shapes without taking the
Vercel AI SDK dependency (~100–125 KB gz for core+one provider; too heavy
for the panel today, and the repo is dependency-conservative):

1. **Provider catalog** — data, not code:
   `{id, label, baseUrl, wire, authMethods, models, headers?}`.
2. **Auth loader** (opencode's key trick) — per provider, resolves stored
   credentials into request options `{baseUrl, headers, fetch?}`; a custom
   fetch injects bearer tokens, adds provider headers, refreshes expired
   tokens, and retries once on 401.
3. **Wire adapters** behind a LanguageModelV2-shaped seam
   (`doStream(callOptions) -> stream parts: text-delta | tool-call |
   finish`): `openai-chat` (today's client, unchanged) and
   `openai-responses` (new, for Codex). Mirror the concepts, not exact SDK
   types (the spec churns V1→V2→V3); adopting real `@ai-sdk/*` packages
   later stays possible behind this seam.

### Codex subscription — feasibility findings (2026-07-05 research)

- OAuth is PKCE against auth.openai.com with client id
  `app_EMoamEEZ73f0CkXaXp7hrann`, redirect **locked to
  http://localhost:1455/auth/callback** — a browser extension cannot run
  this flow (chrome.identity needs its own redirect URI; OpenAI rejects
  others). **In-panel OAuth is off the table.**
- Practical path: **token import** — the user logs in once with Codex CLI
  (`codex login`), then pastes `~/.codex/auth.json` contents (access +
  refresh token + account id) into settings. The auth loader refreshes via
  the token endpoint (refresh TTL ≈ 30 days) and stores rotated tokens.
- Tokens call ChatGPT's private backend
  (`chatgpt.com/backend-api/codex/responses`), **Responses API** wire:
  `store: false` (stateless — resend full history), `input_text` content
  parts, `ChatGPT-Account-Id` header from the JWT claim.
- Open risks to validate first: CORS/origin acceptance of that backend from
  an extension origin (browser CORS is bypassed by host_permissions, but
  the server may reject unknown origins — same failure mode as local
  Ollama); refresh endpoint CORS; ToS gray area (community tools frame it
  as personal use of one's own subscription; OpenAI can break it anytime).
  Ship behind honest UI copy.

### Workflow

- **P0 — provider core refactor**: catalog + auth loader + wire-adapter
  seam; settings UI rendered from provider definitions (auth fields per
  method); remove Custom; Ollama cloud/local become catalog entries over
  the openai-chat adapter. No behavior change.
- **P1 — Codex subscription provider** (user priority): probe spike first
  (validate backend + refresh from extension origin with a pasted token),
  then token-import auth method (paste auth.json), loader with refresh +
  ChatGPT-Account-Id, openai-responses adapter with tool-calling mapping.
- **P2 — OpenAI api-key provider**: near-free after P0 (openai-chat
  adapter + catalog entry + key field).
- **P3 — scale-out (later)**: optionally consume the models.dev JSON
  catalog for provider/model metadata; more providers (Anthropic requires
  the anthropic-dangerous-direct-browser-access header; OpenRouter etc.)
  become catalog entries + small adapters.
- **P4 — re-evaluate adopting the real AI SDK** if provider count or wire
  dialects outgrow the hand-rolled adapters.

## Provider layer hardening (v2.1)

### Why

P0+P1 shipped with a dispatcher bug (`resolveRequest` became async but was
called without `await`, so every provider failed with "Unsupported wire
protocol undefined"). The bug was one keyword, but it exposed the real
gap: **nothing guards this layer.** Flow does not cover the aiChat
directory (a deliberate type error passes `yarn flow dom-node`), and the
DevTools suite has zero tests for providers/wire/auth. Live backend spikes
validated the wire formats but not the in-app call path.

### Goal

Keep the catalog + auth-loader + wire-adapter architecture (it is the
right shape and its wire formats are live-validated), but make the layer
provably correct: every seam covered by unit tests that run in
`yarn test-build-devtools`, so a regression like the missing await fails
the suite instead of shipping.

### Workflow

- **R0 — fix + fresh-eyes review (done 2026-07-06)**: `await` fix
  (44979c9bb); audit of all async call paths in aiChat (agentLoop,
  providerRuntime, codexAuth — no other missed awaits).
- **R1 — unit tests for the provider layer**:
  - `providerRuntime`: resolves baseUrl/model/headers per auth method;
    error strings for missing key/model/tokens; subscription branch mocks
    codexAuth.
  - `wire/openaiChat` + `wire/openaiResponses`: feed captured real SSE
    fixtures (text stream, tool-call stream, error event) through the
    parse loop via mocked fetch; assert CompletionResult (content,
    toolCalls with id/name/argumentsJSON); request-body shape assertions
    (instructions/input mapping, tool flattening, store:false).
  - `codexAuth`: parse variants (full auth.json vs tokens object vs
    garbage), JWT exp decoding + expiry error, stored-text round-trip.
  - `client`: dispatch per wire value; error branch actually throws.
- **R2 — end-to-end smoke in the extension** (manual, user): Ollama Cloud
  + Codex both answer with tool use.
- Then resume P2/P3 as planned.

## Performance Tracks capture (v3)

### Why

React 19.2+ replaced the old scheduling profiler with Performance Tracks
(`ReactFiberPerformanceTrack.js`): scheduler lane phases (Event → Update
→ Render → Commit → Remaining Effects), per-effect spans, yields, and
cascading-update attribution — exactly the causality data the chat lost
when `get_scheduling_events` was removed. Since PR #32736 nearly all
entries are emitted via `console.timeStamp(label, start, end, track,
trackGroup, color)`, which never enters the performance timeline; the
officially blessed consumption path (stated in that PR) is patching
`console.timeStamp`. Timings share the profiler clock (`performance.now`),
so conversion is `t - profilingStartTime`.

### Version policy (decided 2026-07-06)

Tracks are a **progressive enhancement, never a dependency** — React 18/17
apps emit nothing and must keep today's full experience. No version
sniffing: wrap `console.timeStamp` during every recording; the presence of
captured spans IS the capability check. Do NOT resurrect the React-18
legacy `injectProfilingHooks` timeline path (needs profiling builds nobody
runs in dev; backup on `profiler-ai-chat-mcp-backup`).

### Workflow

- **T1 — capture**: in the backend (renderer.js, alongside userInputEvents
  capture), wrap `console.timeStamp` only while profiling (pass-through +
  restore on stop); record {label, start, end, track, trackGroup, color}
  rebased to the commit clock; coalesce + cap like input events; ride
  `ProfilingDataFrontend` (export-safe, optional field).
- **T2 — expose**: tools `get_scheduler_phases` (per-lane phase breakdown
  around a commit/time window) and `get_cascading_updates` (warning spans
  with the component/method that scheduled them); one availability line in
  the profile summary ("Scheduler phase data: available" / "not available —
  requires React 19.2+ development build"); tools listed in the prompt only
  when data exists; guidance: prefer phase data when present, else reason
  from commit data and say the analysis is commit-level.
- **T3 — verify**: shell app (19.2+ dev) — chat ties a click to Event →
  Update → Render phases and flags a cascading update; then an 18.x app —
  chat degrades with the explicit version message.
