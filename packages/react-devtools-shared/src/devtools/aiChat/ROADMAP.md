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
