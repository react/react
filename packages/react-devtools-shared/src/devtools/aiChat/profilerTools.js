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
};

function getCommitOrThrow(context: ToolContext, commitIndex: number) {
  const dataForRoot = context.profilingData.dataForRoots.get(context.rootID);
  if (dataForRoot == null) {
    throw new Error('No profiling data for the selected root.');
  }
  const commit = dataForRoot.commitData[commitIndex];
  if (commit == null) {
    throw new Error(
      `Commit ${commitIndex} does not exist. Valid range: 0-${dataForRoot.commitData.length - 1}.`,
    );
  }
  return {dataForRoot, commit};
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
        commit_index: {
          type: 'integer',
          description: 'Zero-based commit index.',
        },
        min_self_ms: {
          type: 'number',
          description:
            'Prune subtrees containing no component with self time >= this value. Default 0.',
        },
      },
      required: ['commit_index'],
    },
    execute: async (args: Object) => {
      const commitIndex = args.commit_index;
      const minSelfMs =
        typeof args.min_self_ms === 'number' ? args.min_self_ms : 0;
      const {commit} = getCommitOrThrow(context, commitIndex);
      const commitTree = getCommitTree({
        commitIndex,
        profilerStore: context.profilerStore,
        rootID: context.rootID,
      });

      const lines = [];
      lines.push(
        `Commit ${commitIndex}: render ${round(commit.duration)}ms` +
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
            `commit ${commitIndex} (+${round(commit.timestamp)}ms): ${name} id=${fiberID} ` +
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
        commit_index: {
          type: 'integer',
          description: 'Zero-based commit index.',
        },
      },
      required: ['commit_index'],
    },
    execute: async (args: Object) => {
      const commitIndex = args.commit_index;
      const {commit} = getCommitOrThrow(context, commitIndex);
      const commitTree = getCommitTree({
        commitIndex,
        profilerStore: context.profilerStore,
        rootID: context.rootID,
      });

      const lines = [];
      lines.push(
        `Commit ${commitIndex}: render ${round(commit.duration)}ms at +${round(commit.timestamp)}ms` +
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
      if (context.profilingData.imported) {
        return (
          'This profile was imported from a file; live component inspection ' +
          'is unavailable. Reason about the recorded change descriptions ' +
          'instead.'
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
        const dataForRoot = context.profilingData.dataForRoots.get(
          context.rootID,
        );
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
      const mountedID = candidateIDs.find(id =>
        context.store.containsElement(id),
      );
      if (mountedID == null) {
        return (
          'The component is no longer mounted, so its current props/hooks ' +
          'cannot be inspected. Use the recorded change descriptions instead.'
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

export function createProfilerTools(
  profilingData: ProfilingDataFrontend,
  rootID: number,
  profilerStore: ProfilerStore,
  store: Store,
  bridge: FrontendBridge,
): Array<ToolDefinition> {
  const context = {profilingData, rootID, profilerStore, store, bridge};
  return [
    getCommitTool(context),
    getComponentCommitsTool(context),
    getRenderCauseTool(context),
    getInteractionsTool(context),
    getComponentDetailsTool(context),
  ];
}
