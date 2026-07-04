/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getCommitTree} from 'react-devtools-shared/src/devtools/views/Profiler/CommitTreeBuilder';
import {getHookSourceLocationKey} from 'react-devtools-shared/src/hookSourceLocation';
import {meta} from 'react-devtools-shared/src/hydration';

import type ProfilerStore from 'react-devtools-shared/src/devtools/ProfilerStore';
import type {ProfilingDataFrontend} from 'react-devtools-shared/src/devtools/views/Profiler/types';
import type {
  HookNames,
  InspectedElement,
} from 'react-devtools-shared/src/frontend/types';

// Caps keep the summary comfortably inside a small model context window.
// The chat prompt tells the model when a section has been truncated.
const MAX_COMMIT_ROWS = 60;
const MAX_COMPONENT_ROWS = 15;
const MAX_SELECTED_COMMIT_COMPONENTS = 10;

const round = (value: number): number => Math.round(value * 10) / 10;

type ComponentAggregate = {
  displayName: string,
  renderCount: number,
  totalSelfDuration: number,
  maxSelfDuration: number,
  // Renders where the component itself had no prop/state/hook/context change,
  // i.e. it re-rendered only because a parent rendered.
  parentCausedRenders: number,
};

function getDisplayName(
  profilerStore: ProfilerStore,
  rootID: number,
  commitIndex: number,
  fiberID: number,
): string {
  try {
    const commitTree = getCommitTree({commitIndex, profilerStore, rootID});
    const node = commitTree.nodes.get(fiberID);
    if (node != null && node.displayName != null) {
      return node.displayName;
    }
  } catch (error) {
    // Fall through; a missing name should never break the chat.
  }
  return `fiber:${fiberID}`;
}

// Builds a compact, plain-text overview of the recorded profiling session.
// One line per commit and top-N aggregates, in the spirit of Chrome DevTools'
// performance agent trace summary: dense enough to reason about, small enough
// to always fit in context.
export function buildProfileSummary(
  profilingData: ProfilingDataFrontend,
  rootID: number,
  profilerStore: ProfilerStore,
): string {
  const dataForRoot = profilingData.dataForRoots.get(rootID);
  if (dataForRoot == null) {
    return 'No profiling data recorded for the selected root.';
  }

  const {commitData, displayName} = dataForRoot;

  const lines = [];
  lines.push('## Profiling session');
  lines.push(`Root: "${displayName}" (rootID ${rootID})`);

  let totalRenderDuration = 0;
  for (let i = 0; i < commitData.length; i++) {
    totalRenderDuration += commitData[i].duration;
  }
  lines.push(
    `Commits: ${commitData.length}, total render time: ${round(totalRenderDuration)}ms`,
  );
  lines.push('');

  lines.push(
    '## Commits (number;time_ms;render_ms;priority;components_rendered)',
  );
  const commitRowCount = Math.min(commitData.length, MAX_COMMIT_ROWS);
  for (let commitIndex = 0; commitIndex < commitRowCount; commitIndex++) {
    const commit = commitData[commitIndex];
    lines.push(
      [
        commitIndex + 1,
        round(commit.timestamp),
        round(commit.duration),
        commit.priorityLevel != null ? commit.priorityLevel : '',
        commit.fiberActualDurations.size,
      ].join(';'),
    );
  }
  if (commitData.length > MAX_COMMIT_ROWS) {
    lines.push(
      `(truncated: ${commitData.length - MAX_COMMIT_ROWS} more commits not listed — use get_commits to page or filter by min_render_ms)`,
    );
  }
  lines.push('');

  // Aggregate per component (by display name) across all commits.
  const aggregates: Map<string, ComponentAggregate> = new Map();
  for (let commitIndex = 0; commitIndex < commitData.length; commitIndex++) {
    const commit = commitData[commitIndex];
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const [fiberID, selfDuration] of commit.fiberSelfDurations) {
      const name = getDisplayName(profilerStore, rootID, commitIndex, fiberID);

      let aggregate = aggregates.get(name);
      if (aggregate == null) {
        aggregate = {
          displayName: name,
          renderCount: 0,
          totalSelfDuration: 0,
          maxSelfDuration: 0,
          parentCausedRenders: 0,
        };
        aggregates.set(name, aggregate);
      }

      aggregate.renderCount++;
      aggregate.totalSelfDuration += selfDuration;
      aggregate.maxSelfDuration = Math.max(
        aggregate.maxSelfDuration,
        selfDuration,
      );

      const changeDescriptions = commit.changeDescriptions;
      if (changeDescriptions != null) {
        const change = changeDescriptions.get(fiberID);
        if (
          change != null &&
          !change.isFirstMount &&
          !change.didHooksChange &&
          (change.props == null || change.props.length === 0) &&
          (change.state == null || change.state.length === 0) &&
          (change.context == null || change.context === false)
        ) {
          aggregate.parentCausedRenders++;
        }
      }
    }
  }

  const rankedComponents = Array.from(aggregates.values()).sort(
    (a, b) => b.totalSelfDuration - a.totalSelfDuration,
  );

  lines.push(
    '## Top components by total self time (name;renders;total_self_ms;max_self_ms;parent_caused_renders)',
  );
  const componentRowCount = Math.min(
    rankedComponents.length,
    MAX_COMPONENT_ROWS,
  );
  for (let i = 0; i < componentRowCount; i++) {
    const aggregate = rankedComponents[i];
    lines.push(
      [
        aggregate.displayName,
        aggregate.renderCount,
        round(aggregate.totalSelfDuration),
        round(aggregate.maxSelfDuration),
        aggregate.parentCausedRenders,
      ].join(';'),
    );
  }
  if (rankedComponents.length > MAX_COMPONENT_ROWS) {
    lines.push(
      `(truncated: ${rankedComponents.length - MAX_COMPONENT_ROWS} more components not listed)`,
    );
  }

  return lines.join('\n');
}

const MAX_VALUE_PREVIEW_LENGTH = 150;

// Hydrated inspection data replaces deep/complex values with placeholder
// objects whose previews live under Symbol keys (see hydration.js meta).
function getDehydratedPreview(value: any): string | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  // $FlowFixMe[invalid-computed-prop]: Symbol-keyed metadata.
  const preview = value[meta.preview_short];
  if (typeof preview === 'string') {
    return preview;
  }
  if (typeof value.preview_short === 'string') {
    return value.preview_short;
  }
  return null;
}

// Values coming from element inspection may contain functions, cycles, or
// dehydrated placeholders for deep objects; render a short, safe preview.
export function serializeValue(value: any): string {
  const preview = getDehydratedPreview(value);
  if (preview != null) {
    return preview;
  }

  let serialized;
  if (Array.isArray(value)) {
    // Surface per-item previews for arrays of dehydrated objects, which
    // would otherwise JSON.stringify to "{}" (their data is Symbol-keyed).
    const parts = value.slice(0, 10).map(item => {
      const itemPreview = getDehydratedPreview(item);
      if (itemPreview != null) {
        return itemPreview;
      }
      try {
        return JSON.stringify(item) ?? String(item);
      } catch (error) {
        return String(item);
      }
    });
    serialized = `[${parts.join(', ')}${value.length > 10 ? ', …' : ''}]`;
  } else {
    try {
      serialized =
        value === undefined
          ? 'undefined'
          : (JSON.stringify(value) ?? String(value));
    } catch (error) {
      serialized = String(value);
    }
  }
  if (serialized.length > MAX_VALUE_PREVIEW_LENGTH) {
    serialized = serialized.slice(0, MAX_VALUE_PREVIEW_LENGTH) + '…';
  }
  return serialized;
}

// Collects the hooks (including sub-hooks of custom hooks) whose ids are in
// changedHookIds, mirroring how the "What caused this update?" sidebar
// resolves hook indices to names.
function collectChangedHooks(
  hooks: any,
  changedHookIds: Array<number>,
  hookNames: HookNames | null,
  result: Array<string>,
): void {
  if (!Array.isArray(hooks)) {
    return;
  }
  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    if (hook == null) {
      continue;
    }
    if (hook.id !== null && changedHookIds.includes(hook.id)) {
      let parsedName = null;
      if (hook.hookSource != null && hookNames != null) {
        parsedName =
          hookNames.get(getHookSourceLocationKey(hook.hookSource)) || null;
      }
      result.push(
        `#${hook.id + 1} ${hook.name}${parsedName != null ? `(${parsedName})` : ''} — current value: ${serializeValue(hook.value)}`,
      );
    }
    if (hook.subHooks != null) {
      collectChangedHooks(hook.subHooks, changedHookIds, hookNames, result);
    }
  }
}

// Describes what the user currently has selected in the Profiler UI,
// so questions like "why is this slow?" have a referent.
// If the selected component is currently inspected (selection is synced with
// the Components tab), changed hooks/props are resolved to names and current
// values instead of bare indices.
export function buildSelectionContext(
  profilingData: ProfilingDataFrontend,
  rootID: number,
  profilerStore: ProfilerStore,
  selectedCommitIndex: number | null,
  selectedFiberID: number | null,
  selectedFiberName: string | null,
  inspectedElement: InspectedElement | null,
  hookNames: HookNames | null,
): string {
  if (selectedCommitIndex === null) {
    return '';
  }
  const dataForRoot = profilingData.dataForRoots.get(rootID);
  if (dataForRoot == null) {
    return '';
  }
  const commit = dataForRoot.commitData[selectedCommitIndex];
  if (commit == null) {
    return '';
  }

  const lines = [];
  lines.push('## Current selection in the Profiler UI');
  lines.push(
    `Selected commit: ${selectedCommitIndex + 1} (render ${round(commit.duration)}ms` +
      (commit.priorityLevel != null
        ? `, priority ${commit.priorityLevel})`
        : ')'),
  );

  const ranked = Array.from(commit.fiberSelfDurations.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  lines.push(
    'Components rendered in this commit, by self time (name;self_ms;actual_ms):',
  );
  const rowCount = Math.min(ranked.length, MAX_SELECTED_COMMIT_COMPONENTS);
  for (let i = 0; i < rowCount; i++) {
    const [fiberID, selfDuration] = ranked[i];
    const actualDuration = commit.fiberActualDurations.get(fiberID) || 0;
    lines.push(
      [
        getDisplayName(profilerStore, rootID, selectedCommitIndex, fiberID),
        round(selfDuration),
        round(actualDuration),
      ].join(';'),
    );
  }
  if (ranked.length > MAX_SELECTED_COMMIT_COMPONENTS) {
    lines.push(`(truncated: ${ranked.length - rowCount} more)`);
  }

  if (selectedFiberID !== null) {
    const name =
      selectedFiberName != null
        ? selectedFiberName
        : `fiber:${selectedFiberID}`;
    lines.push(`Selected component: "${name}"`);

    // Only trust inspection data if it is actually for the selected fiber.
    // (Selection is synced with the Components tab, so it usually is, but the
    // fiber may have unmounted or the profile may have been imported.)
    const inspected =
      inspectedElement != null && inspectedElement.id === selectedFiberID
        ? inspectedElement
        : null;

    const changeDescriptions = commit.changeDescriptions;
    const change =
      changeDescriptions != null
        ? changeDescriptions.get(selectedFiberID)
        : null;
    if (change != null) {
      if (change.isFirstMount) {
        lines.push('Why it rendered: first mount.');
      } else {
        const reasons = [];
        if (change.props != null && change.props.length > 0) {
          const props = change.props.map(propName => {
            if (inspected != null && inspected.props != null) {
              return `${propName} (current value: ${serializeValue(inspected.props[propName])})`;
            }
            return propName;
          });
          reasons.push(`props changed: ${props.join(', ')}`);
        }
        if (change.state != null && change.state.length > 0) {
          const stateKeys = change.state.map(stateKey => {
            if (inspected != null && inspected.state != null) {
              return `${stateKey} (current value: ${serializeValue(inspected.state[stateKey])})`;
            }
            return stateKey;
          });
          reasons.push(`state changed: ${stateKeys.join(', ')}`);
        }
        if (change.didHooksChange) {
          const changedHookIds = change.hooks;
          const hookDetails: Array<string> = [];
          if (
            changedHookIds != null &&
            changedHookIds.length > 0 &&
            inspected != null
          ) {
            collectChangedHooks(
              inspected.hooks,
              changedHookIds,
              hookNames,
              hookDetails,
            );
          }
          if (hookDetails.length > 0) {
            reasons.push(`hooks changed: ${hookDetails.join(', ')}`);
          } else if (changedHookIds != null && changedHookIds.length > 0) {
            reasons.push(
              `hooks changed: ${changedHookIds.map(id => `#${id + 1}`).join(', ')}`,
            );
          } else {
            reasons.push('hooks changed');
          }
        }
        if (change.context === true) {
          reasons.push('context changed');
        } else if (Array.isArray(change.context) && change.context.length > 0) {
          reasons.push(`context changed: ${change.context.join(', ')}`);
        }
        lines.push(
          reasons.length > 0
            ? `Why it rendered: ${reasons.join('; ')}.`
            : 'Why it rendered: no own changes detected (the parent re-rendered).',
        );
      }
    }

    // Give the model the component's current props for grounding, even when
    // they did not change. Values reflect the app's current state, not the
    // state at commit time.
    if (inspected != null && inspected.props != null) {
      const propNames = Object.keys(inspected.props);
      if (propNames.length > 0) {
        const preview = propNames
          .slice(0, 10)
          .map(
            propName =>
              `${propName}=${serializeValue(inspected.props[propName])}`,
          )
          .join(', ');
        lines.push(
          `Current props: ${preview}${propNames.length > 10 ? ` (${propNames.length - 10} more)` : ''}`,
        );
      }
    }
  }

  return lines.join('\n');
}

// Injected into the system prompt when the recorded session includes
// user interaction events.
export const INTERACTION_GUIDANCE: string = [
  '## Correlating commits with user interactions',
  'This session recorded the user interactions of the ORIGINAL run (event',
  'type + timestamp only). Interaction timestamps use THE SAME clock as',
  'commit timestamps (ms from profiling start), so an interaction at time T',
  'directly precedes commits with timestamps shortly after T.',
  'To explain WHY a commit happened, follow the causal chain:',
  '  interaction event -> update scheduled (see updaters / change reasons)',
  '  -> commit(s).',
  'Use get_interactions to inspect events; get_render_cause shows which',
  'component scheduled each commit. When change descriptions mention hook',
  'indices (e.g. "hooks changed: #1"), call get_component_details to resolve',
  'what those hooks actually are and currently hold.',
].join('\n');

// Builds the "what did the user do" section of the summary from interaction
// events recorded during the session.
export function buildInteractionsSummary(
  profilingData: ProfilingDataFrontend,
): string {
  const events = profilingData.userInputEvents;
  if (events == null || events.length === 0) {
    return '';
  }
  const MAX_INTERACTION_ROWS = 30;
  const lines = [];
  lines.push(
    '## User interactions (type;time_ms — same clock as commit timestamps)',
  );
  const rowCount = Math.min(events.length, MAX_INTERACTION_ROWS);
  for (let i = 0; i < rowCount; i++) {
    lines.push(`${events[i].type};${round(events[i].timestamp)}`);
  }
  if (events.length > MAX_INTERACTION_ROWS) {
    lines.push(
      `(truncated: ${events.length - MAX_INTERACTION_ROWS} more events — use get_interactions)`,
    );
  }
  return lines.join('\n');
}

export function buildSystemPrompt(
  profileSummary: string,
  selectionContext: string,
  extraGuidance: string = '',
): string {
  return [
    'You are an assistant embedded in the React DevTools Profiler.',
    'You help developers understand and optimize React rendering performance.',
    '',
    'The user has recorded a profiling session. A summary is provided below.',
    'You may also have tools. Prefer calling tools over guessing: use',
    'get_commit / get_render_cause / get_component_commits to inspect commits',
    'before citing specifics that are not in the summary. Before recommending',
    'code changes, call get_component_source to read the actual component',
    'code (and get_source_file for related files) so fixes cite real lines.',
    'All durations are in milliseconds. Lines in tables are semicolon-delimited.',
    'Commits are numbered starting at 1, matching the Profiler UI.',
    '"self time" excludes children; "actual time" includes children.',
    '"parent_caused_renders" counts renders where the component had no prop, state,',
    'hook, or context change of its own — usually addressable with React.memo or by',
    'restructuring the parent.',
    'Hooks are numbered like the React DevTools sidebar (#1 is the first hook).',
    'A hook shown as State(newItemText) is a useState hook whose variable is named',
    '"newItemText". "current value" reflects the app right now, not the value at',
    'the time of the profiled commit.',
    '',
    'Ground every claim in the data below. If the data does not contain the answer,',
    'say so rather than guessing. If a table was truncated, mention that your view',
    'is partial. Keep answers focused and actionable, and refer to components and',
    'commits by name/index as they appear in the data.',
    '',
    profileSummary,
    selectionContext !== '' ? '\n' + selectionContext : '',
    extraGuidance !== '' ? '\n' + extraGuidance : '',
  ].join('\n');
}
