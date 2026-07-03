/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getCommitTree} from 'react-devtools-shared/src/devtools/views/Profiler/CommitTreeBuilder';

import type ProfilerStore from 'react-devtools-shared/src/devtools/ProfilerStore';
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

function getTimelineData(context: ToolContext) {
  return context.profilingData.timelineData.length > 0
    ? context.profilingData.timelineData[0]
    : null;
}

function laneLabels(
  lanes: Array<number>,
  laneToLabelMap: Map<number, string>,
): string {
  return lanes.map(lane => laneToLabelMap.get(lane) || `lane${lane}`).join('+');
}

function getSchedulingEventsTool(context: ToolContext): ToolDefinition {
  return {
    name: 'get_scheduling_events',
    description:
      'Returns the update-scheduling events recorded during the session: ' +
      'which component scheduled a render/state update, when (timeline ms), ' +
      'and on which lane (lane labels indicate the event class, e.g. ' +
      'discrete input vs transition). Use before_timeline_ms to look at the ' +
      'window leading up to a commit.',
    inputSchema: {
      type: 'object',
      properties: {
        before_timeline_ms: {
          type: 'number',
          description:
            'Only include events at or before this timeline timestamp.',
        },
        after_timeline_ms: {
          type: 'number',
          description:
            'Only include events at or after this timeline timestamp.',
        },
      },
    },
    execute: async (args: Object) => {
      const timelineData = getTimelineData(context);
      if (timelineData == null) {
        return (
          'No timeline data in this session. Scheduling events require ' +
          'timeline recording support during profiling.'
        );
      }
      const events = timelineData.schedulingEvents.filter(event => {
        if (
          typeof args.before_timeline_ms === 'number' &&
          event.timestamp > args.before_timeline_ms
        ) {
          return false;
        }
        if (
          typeof args.after_timeline_ms === 'number' &&
          event.timestamp < args.after_timeline_ms
        ) {
          return false;
        }
        return true;
      });
      if (events.length === 0) {
        return 'No scheduling events in the requested window.';
      }
      const lines = [
        'Scheduling events (timeline_time_ms;type;component;lanes):',
      ];
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        lines.push(
          [
            round(event.timestamp),
            event.type,
            event.componentName != null ? event.componentName : '',
            laneLabels(event.lanes, timelineData.laneToLabelMap),
          ].join(';'),
        );
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

export function createProfilerTools(
  profilingData: ProfilingDataFrontend,
  rootID: number,
  profilerStore: ProfilerStore,
): Array<ToolDefinition> {
  const context = {profilingData, rootID, profilerStore};
  return [
    getCommitTool(context),
    getComponentCommitsTool(context),
    getRenderCauseTool(context),
    getSchedulingEventsTool(context),
    getInteractionsTool(context),
  ];
}
