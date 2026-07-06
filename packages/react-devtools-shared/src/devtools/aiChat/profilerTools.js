/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getCommitTree} from 'react-devtools-shared/src/devtools/views/Profiler/CommitTreeBuilder';
import {
  inspectElement,
  convertInspectedElementBackendToFrontend,
} from 'react-devtools-shared/src/backendAPI';
import {serializeValue} from './profileSummary';
import {
  formatSourceWindow,
  getKnownSourceContent,
  getKnownSourceStats,
  getOriginalSource,
  hasLoadedAnySources,
  searchKnownSources,
} from './sourceFiles';

import type {FetchFile} from './sourceFiles';
import type Store from 'react-devtools-shared/src/devtools/store';
import type ProfilerStore from 'react-devtools-shared/src/devtools/ProfilerStore';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type {ProfilingDataFrontend} from 'react-devtools-shared/src/devtools/views/Profiler/types';
import type {ToolDefinition} from './types';

const round = (value: number): number => Math.round(value * 10) / 10;

function formatChange(change: Object): string {
  if (change.isFirstMount) {
    return 'first mount';
  }
  const reasons = [];
  if (change.props != null && change.props.length > 0) {
    reasons.push(`props changed: ${change.props.join(', ')}`);
  }
  if (change.state != null && change.state.length > 0) {
    reasons.push(`state changed: ${change.state.join(', ')}`);
  }
  if (change.didHooksChange) {
    reasons.push(
      change.hooks != null && change.hooks.length > 0
        ? `hooks changed: ${change.hooks.map(id => `#${id + 1}`).join(', ')}`
        : 'hooks changed',
    );
  }
  if (change.context === true) {
    reasons.push('context changed');
  } else if (Array.isArray(change.context) && change.context.length > 0) {
    reasons.push(`context changed: ${change.context.join(', ')}`);
  }
  return reasons.length > 0
    ? reasons.join('; ')
    : 'no own changes (parent re-rendered)';
}

type ToolContext = {
  profilingData: ProfilingDataFrontend,
  rootID: number,
  profilerStore: ProfilerStore,
  store: Store,
  bridge: FrontendBridge,
  fetchFile: FetchFile | null,
};

// commitNumber is 1-based, matching the Profiler UI and the summary table.
function getCommitOrThrow(context: ToolContext, commitNumber: number) {
  const dataForRoot = context.profilingData.dataForRoots.get(context.rootID);
  if (dataForRoot == null) {
    throw new Error('No profiling data for the selected root.');
  }
  const commit = dataForRoot.commitData[commitNumber - 1];
  if (commit == null) {
    throw new Error(
      `Commit ${commitNumber} does not exist. Valid range: 1-${dataForRoot.commitData.length}.`,
    );
  }
  return {dataForRoot, commit};
}

function getCommitsTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_commits',
    description:
      'Lists commits of the session (number, timestamp, render duration, ' +
      'priority, components rendered). Use when the summary table was ' +
      'truncated or to find slow commits in large sessions: filter with ' +
      'min_render_ms and/or page with start_number/end_number.',
    inputSchema: {
      type: 'object',
      properties: {
        start_number: {
          type: 'integer',
          description: 'First commit number to include (1-based). Default 1.',
        },
        end_number: {
          type: 'integer',
          description: 'Last commit number to include. Default: last commit.',
        },
        min_render_ms: {
          type: 'number',
          description:
            'Only include commits with render duration >= this value.',
        },
      },
    },
    execute: async (args: Object) => {
      const dataForRoot = context.profilingData.dataForRoots.get(
        context.rootID,
      );
      if (dataForRoot == null) {
        throw new Error('No profiling data for the selected root.');
      }
      const commitData = dataForRoot.commitData;
      const total = commitData.length;
      const start = Math.max(
        1,
        typeof args.start_number === 'number' ? args.start_number : 1,
      );
      const end = Math.min(
        total,
        typeof args.end_number === 'number' ? args.end_number : total,
      );
      const minRenderMs =
        typeof args.min_render_ms === 'number' ? args.min_render_ms : 0;

      const MAX_ROWS = 100;
      const lines = [
        `Commits ${start}-${end} of ${total}` +
          (minRenderMs > 0 ? ` with render >= ${minRenderMs}ms` : '') +
          ' (number;time_ms;render_ms;layout_effects_ms;passive_effects_ms;priority;components_rendered):',
      ];
      let shown = 0;
      let matched = 0;
      for (let number = start; number <= end; number++) {
        const commit = commitData[number - 1];
        if (commit.duration < minRenderMs) {
          continue;
        }
        matched++;
        if (shown >= MAX_ROWS) {
          continue;
        }
        shown++;
        lines.push(
          [
            number,
            round(commit.timestamp),
            round(commit.duration),
            commit.effectDuration != null ? round(commit.effectDuration) : '',
            commit.passiveEffectDuration != null
              ? round(commit.passiveEffectDuration)
              : '',
            commit.priorityLevel != null ? commit.priorityLevel : '',
            commit.fiberActualDurations.size,
          ].join(';'),
        );
      }
      if (matched === 0) {
        return 'No commits match the requested window/filter.';
      }
      if (matched > shown) {
        lines.push(
          `(${matched - shown} more matching commits not shown — narrow the window or raise min_render_ms)`,
        );
      }
      return lines.join('\n');
    },
  };
}

function getCommitTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_commit',
    description:
      'Returns the rendered component tree for one commit of the recorded ' +
      'profiling session, with self/actual durations in ms per component. ' +
      'Components that did not render in this commit appear without timings. ' +
      'Use min_self_ms to prune fast subtrees in large commits.',
    inputSchema: {
      type: 'object',
      properties: {
        commit_number: {
          type: 'integer',
          description:
            'Commit number as shown in the commit table and Profiler UI (1-based).',
        },
        min_self_ms: {
          type: 'number',
          description:
            'Prune subtrees containing no component with self time >= this value. Default 0.',
        },
      },
      required: ['commit_number'],
    },
    execute: async (args: Object) => {
      const commitNumber = args.commit_number;
      const minSelfMs =
        typeof args.min_self_ms === 'number' ? args.min_self_ms : 0;
      const {commit} = getCommitOrThrow(context, commitNumber);
      const commitTree = getCommitTree({
        commitIndex: commitNumber - 1,
        profilerStore: context.profilerStore,
        rootID: context.rootID,
      });

      const lines = [];
      lines.push(
        `Commit ${commitNumber}: render ${round(commit.duration)}ms` +
          (commit.effectDuration != null
            ? `, layout effects ${round(commit.effectDuration)}ms`
            : '') +
          (commit.passiveEffectDuration != null
            ? `, passive effects ${round(commit.passiveEffectDuration)}ms`
            : '') +
          (commit.priorityLevel != null
            ? `, priority ${commit.priorityLevel}`
            : '') +
          `, at +${round(commit.timestamp)}ms`,
      );
      if (commit.updaters != null && commit.updaters.length > 0) {
        lines.push(
          `Update scheduled by: ${commit.updaters
            .map(updater => updater.displayName || `fiber:${updater.id}`)
            .join(', ')}`,
        );
      }
      lines.push('Tree (indent = depth; self/actual in ms):');

      // Prune subtrees with no rendered work above the threshold.
      const subtreeHasWork = (id: number): boolean => {
        const node = commitTree.nodes.get(id);
        if (node == null) {
          return false;
        }
        const selfDuration = commit.fiberSelfDurations.get(id);
        if (selfDuration != null && selfDuration >= minSelfMs) {
          return true;
        }
        return node.children.some(subtreeHasWork);
      };

      const visit = (id: number, depth: number) => {
        const node = commitTree.nodes.get(id);
        if (node == null || !subtreeHasWork(id)) {
          return;
        }
        const name = node.displayName != null ? node.displayName : `#${id}`;
        const selfDuration = commit.fiberSelfDurations.get(id);
        const actualDuration = commit.fiberActualDurations.get(id);
        const timing =
          actualDuration != null
            ? ` self=${round(selfDuration || 0)} actual=${round(actualDuration)}`
            : '';
        if (depth >= 0) {
          lines.push(`${'  '.repeat(depth)}${name} id=${id}${timing}`);
        }
        node.children.forEach(childID => visit(childID, depth + 1));
      };
      // The root node itself is synthetic; start at depth -1 so its children
      // print at depth 0.
      visit(commitTree.rootID, -1);

      return lines.join('\n');
    },
  };
}

function getComponentCommitsTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_component_commits',
    description:
      'Returns every commit in which components matching a display name ' +
      'rendered, with durations and the reason each render happened ' +
      '(props/state/hooks/context changes). Name match is case-insensitive ' +
      'substring.',
    inputSchema: {
      type: 'object',
      properties: {
        component_name: {
          type: 'string',
          description: 'Component display name (e.g. "UserListItem").',
        },
      },
      required: ['component_name'],
    },
    execute: async (args: Object) => {
      const query = String(args.component_name || '').toLowerCase();
      if (query === '') {
        throw new Error('component_name is required.');
      }
      const dataForRoot = context.profilingData.dataForRoots.get(
        context.rootID,
      );
      if (dataForRoot == null) {
        throw new Error('No profiling data for the selected root.');
      }

      const lines = [];
      let matches = 0;
      for (
        let commitIndex = 0;
        commitIndex < dataForRoot.commitData.length;
        commitIndex++
      ) {
        const commit = dataForRoot.commitData[commitIndex];
        const commitTree = getCommitTree({
          commitIndex,
          profilerStore: context.profilerStore,
          rootID: context.rootID,
        });
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const [fiberID, selfDuration] of commit.fiberSelfDurations) {
          const node = commitTree.nodes.get(fiberID);
          const name =
            node != null && node.displayName != null ? node.displayName : '';
          if (!name.toLowerCase().includes(query)) {
            continue;
          }
          matches++;
          const actualDuration = commit.fiberActualDurations.get(fiberID) || 0;
          const change =
            commit.changeDescriptions != null
              ? commit.changeDescriptions.get(fiberID)
              : null;
          lines.push(
            `commit ${commitIndex + 1} (+${round(commit.timestamp)}ms): ${name} id=${fiberID} ` +
              `self=${round(selfDuration)}ms actual=${round(actualDuration)}ms — ` +
              (change != null ? formatChange(change) : 'reason not recorded'),
          );
        }
      }

      if (matches === 0) {
        return `No renders found for components matching "${args.component_name}".`;
      }
      lines.unshift(`${matches} render(s) matching "${args.component_name}":`);
      return lines.join('\n');
    },
  };
}

function getRenderCauseTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_render_cause',
    description:
      'Returns why a commit happened: which components scheduled the update ' +
      'and, for every component that rendered, what changed ' +
      '(props/state/hooks/context or parent-caused).',
    inputSchema: {
      type: 'object',
      properties: {
        commit_number: {
          type: 'integer',
          description:
            'Commit number as shown in the commit table and Profiler UI (1-based).',
        },
      },
      required: ['commit_number'],
    },
    execute: async (args: Object) => {
      const commitNumber = args.commit_number;
      const {commit} = getCommitOrThrow(context, commitNumber);
      const commitTree = getCommitTree({
        commitIndex: commitNumber - 1,
        profilerStore: context.profilerStore,
        rootID: context.rootID,
      });

      const lines = [];
      lines.push(
        `Commit ${commitNumber}: render ${round(commit.duration)}ms at +${round(commit.timestamp)}ms` +
          (commit.effectDuration != null
            ? `, layout effects ${round(commit.effectDuration)}ms`
            : '') +
          (commit.passiveEffectDuration != null
            ? `, passive effects ${round(commit.passiveEffectDuration)}ms`
            : '') +
          (commit.priorityLevel != null
            ? `, priority ${commit.priorityLevel}`
            : ''),
      );
      if (commit.updaters != null && commit.updaters.length > 0) {
        lines.push(
          `Update scheduled by: ${commit.updaters
            .map(updater => updater.displayName || `fiber:${updater.id}`)
            .join(', ')}`,
        );
      } else {
        lines.push('Update scheduled by: (not recorded)');
      }

      if (commit.changeDescriptions == null) {
        lines.push(
          'Change descriptions were not recorded for this session. ' +
            'Enable "Record why each component rendered" in Profiler settings and re-record.',
        );
        return lines.join('\n');
      }

      lines.push('Per-component render reasons:');
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const [fiberID, change] of commit.changeDescriptions) {
        const node = commitTree.nodes.get(fiberID);
        const name =
          node != null && node.displayName != null
            ? node.displayName
            : `fiber:${fiberID}`;
        lines.push(`- ${name} id=${fiberID}: ${formatChange(change)}`);
      }
      return lines.join('\n');
    },
  };
}

function getInteractionsTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_interactions',
    description:
      'Returns the user interaction events (clicks, key presses, scrolls — ' +
      'event types and timestamps only) recorded during the profiling ' +
      'session. Timestamps share the commit clock (ms from profiling ' +
      'start). Optionally filtered to a time window.',
    inputSchema: {
      type: 'object',
      properties: {
        start_ms: {type: 'number', description: 'Window start.'},
        end_ms: {type: 'number', description: 'Window end.'},
      },
    },
    execute: async (args: Object) => {
      const allEvents = context.profilingData.userInputEvents;
      if (allEvents == null || allEvents.length === 0) {
        return (
          'No interaction events were recorded. Either the "Record user ' +
          'interaction events" setting was off, or no interactions ' +
          'happened while profiling.'
        );
      }
      const events = allEvents.filter(event => {
        if (
          typeof args.start_ms === 'number' &&
          event.timestamp < args.start_ms
        ) {
          return false;
        }
        if (typeof args.end_ms === 'number' && event.timestamp > args.end_ms) {
          return false;
        }
        return true;
      });
      if (events.length === 0) {
        return 'No interaction events in the requested window.';
      }
      const lines = [
        'Interaction events (time_ms;type — same clock as commits):',
      ];
      for (let i = 0; i < events.length; i++) {
        lines.push(`${round(events[i].timestamp)};${events[i].type}`);
      }
      return lines.join('\n');
    },
  };
}

type InspectedComponent = {
  mountedID: number,
  candidateIDs: Array<number>,
  inspected: Object,
};

// Shared resolution for tools that inspect a live component: finds fiber ids
// matching a display name in the profiled commit trees (newest first), picks
// the first still-mounted one, and inspects it over the bridge.
// Returns a user-facing message string when inspection is not possible.
async function inspectComponent(
  context: ToolContext,
  args: Object,
): Promise<InspectedComponent | string> {
  if (context.profilingData.imported) {
    return (
      'This profile was imported from a file; live component inspection ' +
      'is unavailable. Reason about the recorded change descriptions instead.'
    );
  }

  // Resolve candidate fiber ids from the profiled commit trees.
  const candidateIDs: Array<number> = [];
  if (typeof args.fiber_id === 'number') {
    candidateIDs.push(args.fiber_id);
  } else {
    const query = String(args.component_name || '').toLowerCase();
    if (query === '') {
      throw new Error('Provide component_name or fiber_id.');
    }
    const dataForRoot = context.profilingData.dataForRoots.get(context.rootID);
    if (dataForRoot == null) {
      throw new Error('No profiling data for the selected root.');
    }
    // Search newest commit first so current fibers win.
    for (
      let commitIndex = dataForRoot.commitData.length - 1;
      commitIndex >= 0 && candidateIDs.length < 10;
      commitIndex--
    ) {
      const commitTree = getCommitTree({
        commitIndex,
        profilerStore: context.profilerStore,
        rootID: context.rootID,
      });
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const [fiberID, node] of commitTree.nodes) {
        if (
          node.displayName != null &&
          node.displayName.toLowerCase().includes(query) &&
          !candidateIDs.includes(fiberID)
        ) {
          candidateIDs.push(fiberID);
        }
      }
    }
    if (candidateIDs.length === 0) {
      return `No component matching "${args.component_name}" found in the profile.`;
    }
  }

  // Inspect the first candidate that is still mounted.
  const mountedID = candidateIDs.find(id => context.store.containsElement(id));
  if (mountedID == null) {
    return (
      'The component is no longer mounted, so it cannot be inspected. ' +
      'Use the recorded change descriptions instead.'
    );
  }
  const rendererID = context.store.getRendererIDForElement(mountedID);
  if (rendererID == null) {
    return 'Could not determine the renderer for this component.';
  }

  const payload = await inspectElement(
    context.bridge,
    true, // forceFullData
    mountedID,
    null,
    rendererID,
    false,
  );
  if (payload.type !== 'full-data') {
    return `Inspection did not return data (${payload.type}).`;
  }
  const inspected = convertInspectedElementBackendToFrontend(payload.value);
  return {mountedID, candidateIDs, inspected};
}

function formatHooksTree(hooks: any, lines: Array<string>, depth: number) {
  if (!Array.isArray(hooks)) {
    return;
  }
  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    if (hook == null) {
      continue;
    }
    const indent = '  '.repeat(depth + 1);
    const label = hook.id !== null ? `#${hook.id + 1} ` : '';
    lines.push(
      `${indent}${label}${hook.name}${hook.value !== undefined ? ` = ${serializeValue(hook.value)}` : ''}`,
    );
    if (hook.subHooks != null && hook.subHooks.length > 0) {
      formatHooksTree(hook.subHooks, lines, depth + 1);
    }
  }
}

function getComponentDetailsTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_component_details',
    description:
      'Inspects a live component and returns its CURRENT props and hooks ' +
      '(hook types like State/Reducer/custom hooks, with current values). ' +
      'Use this to resolve hook indices from change descriptions (e.g. ' +
      '"hooks changed: #1") into what the hooks actually hold. Values ' +
      'reflect the app right now, not the profiled commit. Only works ' +
      'while the component is still mounted (not for imported profiles).',
    inputSchema: {
      type: 'object',
      properties: {
        component_name: {
          type: 'string',
          description:
            'Component display name (case-insensitive substring match).',
        },
        fiber_id: {
          type: 'integer',
          description: 'Exact fiber id (overrides component_name).',
        },
      },
    },
    execute: async (args: Object) => {
      const resolved = await inspectComponent(context, args);
      if (typeof resolved === 'string') {
        return resolved;
      }
      const {mountedID, candidateIDs, inspected} = resolved;

      const lines = [];
      lines.push(
        `${inspected.displayName || 'Component'} (fiber id ${mountedID}) — ` +
          'current values (the app NOW, not at commit time):',
      );

      const props = inspected.props;
      if (props != null && Object.keys(props).length > 0) {
        lines.push('Props:');
        const propNames = Object.keys(props);
        for (let i = 0; i < Math.min(propNames.length, 15); i++) {
          lines.push(
            `  ${propNames[i]} = ${serializeValue(props[propNames[i]])}`,
          );
        }
      } else {
        lines.push('Props: (none)');
      }

      if (inspected.state != null) {
        lines.push(`State (class): ${serializeValue(inspected.state)}`);
      }

      if (Array.isArray(inspected.hooks) && inspected.hooks.length > 0) {
        lines.push(
          'Hooks (numbered like change descriptions; nested = custom hooks):',
        );
        formatHooksTree(inspected.hooks, lines, 0);
      } else {
        lines.push('Hooks: (none)');
      }

      if (candidateIDs.length > 1) {
        lines.push(
          `(${candidateIDs.length - 1} other instance(s) matched: ids ${candidateIDs
            .filter(id => id !== mountedID)
            .join(', ')} — pass fiber_id to inspect a specific one)`,
        );
      }
      return lines.join('\n');
    },
  };
}

function getComponentSourceTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_component_source',
    description:
      'Returns the ORIGINAL source code of a component (reconstructed from ' +
      "the page's source maps), with line numbers and the definition line " +
      'marked. Use before suggesting code changes so recommendations cite ' +
      'real code. Requires the app to serve source maps and the component ' +
      'to still be mounted. Note: this is the CURRENT code, which may ' +
      'differ from what ran during the recorded session.',
    inputSchema: {
      type: 'object',
      properties: {
        component_name: {
          type: 'string',
          description:
            'Component display name (case-insensitive substring match).',
        },
        fiber_id: {
          type: 'integer',
          description: 'Exact fiber id (overrides component_name).',
        },
      },
    },
    execute: async (args: Object) => {
      if (context.fetchFile == null) {
        return 'Source fetching is not available in this environment.';
      }
      const fetchFile = context.fetchFile;

      const resolved = await inspectComponent(context, args);
      if (typeof resolved === 'string') {
        return resolved;
      }
      const {inspected} = resolved;
      const componentName =
        inspected.displayName != null
          ? inspected.displayName
          : String(args.component_name || '');

      // Candidate runtime locations, most reliable first. The function
      // location can be distorted by HOC/factory wrappers (it points at
      // where the function object was created); hook call sites are by
      // definition inside the component's own body.
      const candidates = [];
      const hookSource = findFirstHookCallSite(inspected.hooks);
      if (hookSource != null) {
        candidates.push({
          url: hookSource.fileName,
          line: hookSource.lineNumber,
          column: hookSource.columnNumber,
          origin: 'hook call site',
        });
      }
      const source = inspected.source;
      if (source != null) {
        // ReactFunctionLocation tuple: [functionName, fileName, line, column].
        candidates.push({
          url: source[1],
          line: source[2],
          column: source[3],
          origin: 'function location',
        });
      }
      if (candidates.length === 0) {
        return (
          'No source location is available for this component (host ' +
          'component, or a production build without source info).'
        );
      }

      let bestWithContent = null;
      let bestPathOnly = null;
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const original = await getOriginalSource(
          fetchFile,
          candidate.url,
          candidate.line,
          candidate.column,
        );
        if (original == null) {
          continue;
        }
        if (original.content == null) {
          if (bestPathOnly == null) {
            bestPathOnly = {candidate, original};
          }
          continue;
        }
        const nameMatches =
          componentName !== '' && original.content.includes(componentName);
        if (nameMatches) {
          bestWithContent = {candidate, original, nameMatches: true};
          break;
        }
        if (bestWithContent == null) {
          bestWithContent = {candidate, original, nameMatches: false};
        }
      }

      if (bestWithContent != null) {
        const {candidate, original, nameMatches} = bestWithContent;
        const lines = [
          `// ${original.url} (via ${candidate.origin}; current code — may differ from the profiled run)`,
        ];
        if (!nameMatches && componentName !== '') {
          const suggestions = searchKnownSources(componentName).slice(0, 5);
          lines.push(
            `// WARNING: this file does not mention "${componentName}" — the ` +
              'source map may have resolved the wrong module.' +
              (suggestions.length > 0
                ? ` Files whose path matches the name: ${suggestions.join(', ')} (read with get_source_file).`
                : ' Try list_source_files to browse known files.'),
          );
        }
        lines.push(formatSourceWindow(original.content, original.line));
        return lines.join('\n');
      }

      if (bestPathOnly != null) {
        const {original} = bestPathOnly;
        return (
          `Original location: ${original.url}:${original.line ?? '?'} — but ` +
          'the source map does not embed the file contents (no sourcesContent).'
        );
      }

      const first = candidates[0];
      return (
        `Only the build location is known: ${first.url}:${first.line}. ` +
        'No source map could be loaded (the app may not serve source maps).'
      );
    },
  };
}

// Walks the inspected hooks tree for the first hook with a recorded call
// site. Hook call sites live in the component's own body, making them a
// reliable anchor for locating its implementation.
function findFirstHookCallSite(hooks: any): Object | null {
  if (!Array.isArray(hooks)) {
    return null;
  }
  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    if (hook == null) {
      continue;
    }
    const hookSource = hook.hookSource;
    if (
      hookSource != null &&
      typeof hookSource.fileName === 'string' &&
      typeof hookSource.lineNumber === 'number' &&
      typeof hookSource.columnNumber === 'number'
    ) {
      return hookSource;
    }
    const nested = findFirstHookCallSite(hook.subHooks);
    if (nested != null) {
      return nested;
    }
  }
  return null;
}

function getSourceFileTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_source_file',
    description:
      'Reads a related original source file by path, from the source maps ' +
      'already loaded this session (call get_component_source first to load ' +
      'them). Use to follow imports (e.g. read the parent component that ' +
      'passes the props). Path is matched as a substring.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path or suffix (e.g. "UserList/UserForm.js").',
        },
      },
      required: ['path'],
    },
    execute: async (args: Object) => {
      const query = String(args.path || '');
      if (query === '') {
        throw new Error('path is required.');
      }
      if (!hasLoadedAnySources()) {
        return (
          'No source maps loaded yet. Call get_component_source for a ' +
          "component first; that loads the app bundle's source map."
        );
      }
      const matches = searchKnownSources(query);
      if (matches.length === 0) {
        const stats = getKnownSourceStats();
        return (
          `No known source file matches "${query}". ${stats.files} file(s) ` +
          `are known from ${stats.bundles} loaded bundle map(s) — call ` +
          'list_source_files to browse them. Note: files only become known ' +
          'after get_component_source loads their bundle, so components in ' +
          'other code-split chunks may not be visible yet.'
        );
      }
      if (matches.length > 1) {
        return (
          `${matches.length} files match "${query}" — be more specific:\n` +
          matches.slice(0, 20).join('\n')
        );
      }
      const content = getKnownSourceContent(matches[0]);
      if (content == null) {
        return `Could not read ${matches[0]}.`;
      }
      return [
        `// ${matches[0]} (current code; may differ from the profiled run)`,
        formatSourceWindow(content, null),
      ].join('\n');
    },
  };
}

function listSourceFilesTool(context: ToolContext): ToolDefinition {
  return {
    name: 'list_source_files',
    description:
      'Lists the original source file paths known from source maps loaded ' +
      'this session (maps load when get_component_source runs). Use this ' +
      'to discover exact paths instead of guessing them for ' +
      'get_source_file. Optional query filters by substring.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Substring to filter paths (case-insensitive).',
        },
      },
    },
    execute: async (args: Object) => {
      if (!hasLoadedAnySources()) {
        return (
          'No source maps loaded yet. Call get_component_source for a ' +
          "component first; that loads its bundle's source map."
        );
      }
      const matches = searchKnownSources(String(args.query || ''));
      const stats = getKnownSourceStats();
      if (matches.length === 0) {
        return (
          `No paths match. ${stats.files} file(s) known from ` +
          `${stats.bundles} bundle map(s); try a shorter query.`
        );
      }
      const MAX_LISTED = 100;
      const lines = [
        `${matches.length} of ${stats.files} known file(s)` +
          (matches.length > MAX_LISTED ? ` (showing ${MAX_LISTED})` : '') +
          ':',
      ];
      for (let i = 0; i < Math.min(matches.length, MAX_LISTED); i++) {
        lines.push(matches[i]);
      }
      return lines.join('\n');
    },
  };
}

// --- React 19.2+ Performance Track tools ---
// Spans come from wrapping console.timeStamp while profiling (see
// backend/performanceTrackCapture.js). They share the commit clock. These
// tools are only registered when spans exist, so the prompt never
// advertises them for apps (React <19.2 / production builds) that can't
// produce them.

const SCHEDULER_TRACK_GROUP = 'Scheduler ⚛';
const COMPONENTS_TRACK = 'Components ⚛';

// DEV component render spans are prefixed with a zero-width space when the
// entry carries a props diff; strip it for matching and display.
const cleanSpanName = (name: string): string => name.replace(/^​/, '');

function getTrackSpans(context: ToolContext) {
  const spans = context.profilingData.performanceTrackSpans;
  return spans != null ? spans : [];
}

// Rows are lane;phase;start;end;duration — semicolon-delimited like the
// summary tables.
function formatSpanRow(span: Object): string {
  return [
    span.track,
    cleanSpanName(span.name),
    round(span.start),
    round(span.end),
    round(span.end - span.start),
  ].join(';');
}

function resolveWindow(
  context: ToolContext,
  args: Object,
): {startMs: number, endMs: number, label: string} {
  if (typeof args.commit_number === 'number') {
    const {commit} = getCommitOrThrow(context, args.commit_number);
    // Scheduling (event, update, blocked time) precedes the commit
    // timestamp; look further back than forward.
    return {
      startMs: commit.timestamp - 1000,
      endMs: commit.timestamp + 500,
      label: `around commit ${args.commit_number} (t=${round(commit.timestamp)}ms)`,
    };
  }
  const startMs = typeof args.start_ms === 'number' ? args.start_ms : -Infinity;
  const endMs = typeof args.end_ms === 'number' ? args.end_ms : Infinity;
  const label =
    startMs === -Infinity && endMs === Infinity
      ? 'entire session'
      : `window ${startMs === -Infinity ? 'start' : round(startMs)}-${
          endMs === Infinity ? 'end' : round(endMs)
        }ms`;
  return {startMs, endMs, label};
}

const MAX_SPAN_ROWS = 300;

function listSpanRows(spans: Array<Object>): Array<string> {
  const lines = [];
  const rowCount = Math.min(spans.length, MAX_SPAN_ROWS);
  for (let i = 0; i < rowCount; i++) {
    lines.push(formatSpanRow(spans[i]));
  }
  if (spans.length > MAX_SPAN_ROWS) {
    lines.push(
      `(truncated: ${spans.length - MAX_SPAN_ROWS} more spans — narrow the window)`,
    );
  }
  return lines;
}

function getSchedulerPhasesTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_scheduler_phases',
    description:
      'Returns React scheduler phase spans (Event, Update, Blocked, ' +
      'Render, Commit, Remaining Effects, Cascading Update...) per ' +
      'priority lane (Blocking, Transition...), from React 19.2+ ' +
      'Performance Tracks. Shows what happened BEFORE and between ' +
      'renders — input event to update to render latency, blocked time, ' +
      'interruptions. Same clock as commits. Filter by commit_number ' +
      '(window around that commit) or start_ms/end_ms.',
    inputSchema: {
      type: 'object',
      properties: {
        commit_number: {
          type: 'integer',
          description: '1-based commit; shows spans around its timestamp.',
        },
        start_ms: {type: 'number', description: 'Window start.'},
        end_ms: {type: 'number', description: 'Window end.'},
      },
    },
    execute: async (args: Object) => {
      const {startMs, endMs, label} = resolveWindow(context, args);
      const spans = getTrackSpans(context)
        .filter(
          span =>
            span.trackGroup === SCHEDULER_TRACK_GROUP &&
            span.end >= startMs &&
            span.start <= endMs,
        )
        .sort((a, b) => a.start - b.start);
      if (spans.length === 0) {
        return `No scheduler phase spans in ${label}.`;
      }
      const lines = [
        `Scheduler phases, ${label} (lane;phase;start_ms;end_ms;duration_ms):`,
        ...listSpanRows(spans),
      ];
      return lines.join('\n');
    },
  };
}

function getCascadingUpdatesTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_cascading_updates',
    description:
      'Returns cascading updates recorded by React 19.2+ Performance ' +
      'Tracks: updates scheduled while React was already rendering or ' +
      'committing (e.g. setState in an effect), a common cause of ' +
      'unexpected extra commits. Each is cross-referenced with the next ' +
      'commit at or after it.',
    inputSchema: {type: 'object', properties: {}},
    execute: async (args: Object) => {
      const cascading = getTrackSpans(context)
        .filter(span => cleanSpanName(span.name).includes('Cascading'))
        .sort((a, b) => a.start - b.start);
      if (cascading.length === 0) {
        return 'No cascading updates were recorded in this session.';
      }
      const dataForRoot = context.profilingData.dataForRoots.get(
        context.rootID,
      );
      const commitData = dataForRoot != null ? dataForRoot.commitData : [];
      const lines = [
        `${cascading.length} cascading update(s) ` +
          '(lane;phase;start_ms;end_ms;duration_ms;next_commit):',
      ];
      const rowCount = Math.min(cascading.length, MAX_SPAN_ROWS);
      for (let i = 0; i < rowCount; i++) {
        const span = cascading[i];
        let nextCommit = '';
        for (let c = 0; c < commitData.length; c++) {
          if (commitData[c].timestamp >= span.start) {
            nextCommit = String(c + 1);
            break;
          }
        }
        lines.push(`${formatSpanRow(span)};${nextCommit}`);
      }
      lines.push(
        'Use get_render_cause on the next_commit to see which components ' +
          'rendered, and get_component_source to find the scheduling code.',
      );
      return lines.join('\n');
    },
  };
}

function getComponentTrackSpansTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_component_track_spans',
    description:
      'Returns per-component render and effect spans from React 19.2+ ' +
      'Performance Tracks — wall-clock placement of individual renders ' +
      '(split across yields) and INDIVIDUAL effect timings, which the ' +
      'aggregate effect durations cannot show. Filter by component_name ' +
      '(substring), commit_number, or start_ms/end_ms.',
    inputSchema: {
      type: 'object',
      properties: {
        component_name: {
          type: 'string',
          description: 'Case-insensitive substring of the span name.',
        },
        commit_number: {
          type: 'integer',
          description: '1-based commit; shows spans around its timestamp.',
        },
        start_ms: {type: 'number', description: 'Window start.'},
        end_ms: {type: 'number', description: 'Window end.'},
      },
    },
    execute: async (args: Object) => {
      const {startMs, endMs, label} = resolveWindow(context, args);
      const nameQuery =
        typeof args.component_name === 'string'
          ? args.component_name.toLowerCase()
          : null;
      const spans = getTrackSpans(context)
        .filter(span => {
          if (span.track !== COMPONENTS_TRACK) {
            return false;
          }
          if (span.end < startMs || span.start > endMs) {
            return false;
          }
          if (
            nameQuery != null &&
            !cleanSpanName(span.name).toLowerCase().includes(nameQuery)
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => a.start - b.start);
      if (spans.length === 0) {
        return `No component track spans match (${label}${
          nameQuery != null ? `, name~"${nameQuery}"` : ''
        }).`;
      }
      const lines = [
        `Component spans, ${label} (track;name;start_ms;end_ms;duration_ms):`,
        ...listSpanRows(spans),
      ];
      const dropped = context.profilingData.droppedPerformanceTrackSpans;
      if (dropped != null && dropped > 0) {
        lines.push(
          `(note: ${dropped} component spans were dropped at capture time — view is partial)`,
        );
      }
      return lines.join('\n');
    },
  };
}

export function createProfilerTools(
  profilingData: ProfilingDataFrontend,
  rootID: number,
  profilerStore: ProfilerStore,
  store: Store,
  bridge: FrontendBridge,
  fetchFile: FetchFile | null,
): Array<ToolDefinition> {
  const context = {
    profilingData,
    rootID,
    profilerStore,
    store,
    bridge,
    fetchFile,
  };
  const tools = [
    getCommitsTool(context),
    getCommitTool(context),
    getComponentCommitsTool(context),
    getRenderCauseTool(context),
    getInteractionsTool(context),
    getComponentDetailsTool(context),
    getComponentSourceTool(context),
    getSourceFileTool(context),
    listSourceFilesTool(context),
  ];
  // Performance Track tools only exist when the profiled app emitted spans
  // (React 19.2+ dev/profiling builds) — never advertise dead tools.
  const trackSpans = profilingData.performanceTrackSpans;
  if (trackSpans != null && trackSpans.length > 0) {
    tools.push(
      getSchedulerPhasesTool(context),
      getCascadingUpdatesTool(context),
      getComponentTrackSpansTool(context),
    );
  }
  return tools;
}
