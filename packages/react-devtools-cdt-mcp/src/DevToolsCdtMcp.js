/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {installFacade, createTools} from 'react-devtools-facade';

import type {Facade, Tools} from 'react-devtools-facade';

// A tool definition: its chrome-devtools-mcp metadata plus how to invoke the
// underlying react-devtools-facade tool. `call` maps the params object that
// chrome-devtools-mcp passes (parsed + ajv-validated against inputSchema) onto
// the facade tool's positional arguments.
type ToolDefinition = {
  name: string,
  description: string,
  inputSchema: {[string]: mixed},
  call: (tools: Tools, args: {[string]: any}) => mixed,
};

function formatError(error: mixed): string {
  if (error instanceof Error) {
    const cause = (error as any).cause;
    if (cause != null) {
      return error.message + ' Cause: ' + formatError(cause);
    }
    return error.message;
  }
  return String(error);
}

function normalizeToolResult(result: mixed): mixed {
  if (result != null && typeof result === 'object') {
    const objectResult = result as {+[string]: mixed};
    if ('error' in objectResult && typeof objectResult.error !== 'string') {
      return {
        ...objectResult,
        error: formatError(objectResult.error),
      };
    }
  }
  return result;
}

function getComponentForDomElement(tools: Tools, element: mixed): mixed {
  const result = tools.getComponentByHostInstance(element);
  if (
    result != null &&
    typeof result === 'object' &&
    typeof (result as any).error === 'string'
  ) {
    const error = (result as any).error;
    if (error === 'Host instance is required') {
      return {error: 'DOM element is required'};
    }
    if (error === 'Host instance is not managed by React') {
      return {error: 'DOM element is not managed by React'};
    }
  }
  return result;
}

const TOOL_DEFINITIONS: Array<ToolDefinition> = [
  {
    name: 'react_get_component_tree',
    description:
      'Snapshot of the React component tree as {nodes}, where nodes is a ' +
      'flat array of {uid, type, name, key, firstChild, nextSibling}. ' +
      'firstChild/nextSibling link nodes by uid. uid is the stable handle ' +
      'the other tools accept. Covers every mounted root unless rootUid ' +
      'scopes the walk (depth defaults to 20).',
    inputSchema: {
      type: 'object',
      properties: {
        depth: {
          type: 'number',
          description: 'Maximum tree depth to traverse (default 20).',
        },
        rootUid: {
          type: 'string',
          description:
            'Start the snapshot from this component uid (e.g. "r5").',
        },
      },
    },
    call: (tools, args) => {
      const nodesOrError = tools.getComponentTree(args.depth, args.rootUid);
      return Array.isArray(nodesOrError) ? {nodes: nodesOrError} : nodesOrError;
    },
  },
  {
    name: 'react_get_component_by_uid',
    description:
      'Detailed info for one component by uid: ' +
      '{uid, type, name, key?, props?, hooks?}. props excludes children and ' +
      'is normalized for serialization; when includeHooks is true, hooks is ' +
      'the nested hooks tree ({id, name, value, subHooks}), present only for ' +
      'function/forwardRef/memo components.',
    inputSchema: {
      type: 'object',
      properties: {
        uid: {type: 'string', description: 'Component uid, e.g. "r5".'},
        includeHooks: {
          type: 'boolean',
          description:
            'Whether to inspect hooks for function components (default false).',
        },
      },
      required: ['uid'],
    },
    call: (tools, args) =>
      tools.getComponentByUid(args.uid, args.includeHooks === true),
  },
  {
    name: 'react_get_component_by_dom_element',
    description:
      'Detailed info for one React DOM component by DOM element reference: ' +
      '{uid, type, name, key?, props?, hooks?}. The element is an opaque ' +
      'page-side reference, such as the currently selected Chrome DevTools ' +
      'element.',
    inputSchema: {
      type: 'object',
      properties: {
        element: {
          type: 'object',
          'x-mcp-type': 'HTMLElement',
          description:
            'DOM element reference from the Chrome DevTools MCP page snapshot.',
        },
      },
      required: ['element'],
    },
    call: (tools, args) => getComponentForDomElement(tools, args.element),
  },
  {
    name: 'react_find_components',
    description:
      'Find components whose name contains a substring (case-insensitive). ' +
      'Paginated: {page, pageSize, totalCount, totalPages, results}, where ' +
      'results are tree nodes. rootUid limits the search to a subtree.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {type: 'string', description: 'Name substring to match.'},
        rootUid: {
          type: 'string',
          description: "Limit the search to this component's subtree.",
        },
        page: {type: 'number', description: 'Page number (default 1).'},
        pageSize: {
          type: 'number',
          description: 'Results per page (default 10).',
        },
      },
      required: ['name'],
    },
    call: (tools, args) =>
      tools.findComponents(args.name, args.rootUid, args.page, args.pageSize),
  },
  {
    name: 'react_get_component_source',
    description:
      'Source location where a component is defined: ' +
      '{source: {name, fileName, line, column}}, or {source: null} when ' +
      'unavailable (e.g. host components or production builds).',
    inputSchema: {
      type: 'object',
      properties: {
        uid: {type: 'string', description: 'Component uid, e.g. "r5".'},
      },
      required: ['uid'],
    },
    call: (tools, args) => tools.getComponentSource(args.uid),
  },
  {
    name: 'react_get_owner_stack_trace',
    description:
      'Owner stack trace for a component — the chain of JSX creation sites up ' +
      'to the root, as a raw string ({stack}) for source-map symbolication. ' +
      'DEV-only (empty in production).',
    inputSchema: {
      type: 'object',
      properties: {
        uid: {type: 'string', description: 'Component uid, e.g. "r5".'},
      },
      required: ['uid'],
    },
    call: (tools, args) => tools.getOwnerStackTrace(args.uid),
  },
  {
    name: 'react_get_parent_stack',
    description:
      'Rendered parent chain for a component, from immediate parent to root: ' +
      'an array of {uid, name, type}. Parents describe where the node is ' +
      'mounted in the rendered component tree and may include host DOM ' +
      'components and the root. This differs from owners, which describe JSX ' +
      'creation/render ownership.',
    inputSchema: {
      type: 'object',
      properties: {
        uid: {type: 'string', description: 'Component uid, e.g. "r5".'},
      },
      required: ['uid'],
    },
    call: (tools, args) => tools.getParentStack(args.uid),
  },
  {
    name: 'react_get_owner_stack',
    description:
      'JSX owner chain for a component, from immediate owner to root owner: ' +
      'an array of {uid, name, type} (empty for a root component). Owners ' +
      'describe which components created/rendered this element through JSX, ' +
      'not where it is mounted in the rendered component tree. This DEV-only metadata ' +
      'differs from structural parents.',
    inputSchema: {
      type: 'object',
      properties: {
        uid: {type: 'string', description: 'Component uid, e.g. "r5".'},
      },
      required: ['uid'],
    },
    call: (tools, args) => tools.getOwnerStack(args.uid),
  },
  {
    name: 'react_start_profiling',
    description:
      'Start a profiling session that records render timing on every commit. ' +
      'Returns {status: "started", traceName}; errors if a session is already ' +
      'active.',
    inputSchema: {
      type: 'object',
      properties: {
        traceName: {
          type: 'string',
          description: 'Trace name (auto-generated if omitted).',
        },
      },
    },
    call: (tools, args) => tools.startProfiling(args.traceName),
  },
  {
    name: 'react_stop_profiling',
    description:
      'Stop the active profiling session. Returns ' +
      '{status: "stopped", traceName, commits} (commits recorded); errors if none ' +
      'is active.',
    inputSchema: {type: 'object', properties: {}},
    call: tools => tools.stopProfiling(),
  },
  {
    name: 'react_get_trace_overview',
    description:
      'Per-commit overview of a trace — one row each: ' +
      '{commit, committedAt, renderDuration, layoutDuration, ' +
      'passiveDuration, componentsChanged}. Durations are in ms (null if the ' +
      'build omits profiler timing).',
    inputSchema: {
      type: 'object',
      properties: {
        traceName: {type: 'string', description: 'The trace to query.'},
      },
      required: ['traceName'],
    },
    call: (tools, args) => tools.getTraceOverview(args.traceName),
  },
  {
    name: 'react_get_commit_report',
    description:
      'Detailed report for one commit of a trace: ' +
      '{committedAt, priority, renderDuration, layoutDuration, ' +
      'passiveDuration, components}, where components is ' +
      '{uid, name, type, actualDuration, selfDuration} sorted by ' +
      'actualDuration descending.',
    inputSchema: {
      type: 'object',
      properties: {
        traceName: {type: 'string', description: 'The trace to query.'},
        commitIndex: {
          type: 'integer',
          minimum: 0,
          description: 'Zero-based commit index within the trace.',
        },
      },
      required: ['traceName', 'commitIndex'],
    },
    call: (tools, args) =>
      tools.getCommitReport(args.traceName, args.commitIndex),
  },
];

// A chrome-devtools-mcp third-party tool. `execute` runs in the page and
// returns the facade tool's result, which chrome-devtools-mcp forwards to the
// MCP client.
export type CdtMcpTool = {
  name: string,
  description: string,
  inputSchema: {[string]: mixed},
  execute: (args: {[string]: any}) => mixed,
};

export type CdtMcpToolGroup = {
  name: string,
  description: string,
  tools: Array<CdtMcpTool>,
};

type Registration = {
  facade: Facade,
  unregister: () => void,
};

type ToolDiscoveryEvent = {
  respondWith: (toolGroup: CdtMcpToolGroup) => void,
};

const registrations: WeakMap<any, Registration> = new WeakMap();

/**
 * Build the chrome-devtools-mcp tool group from an assembled set of facade
 * tools. Each tool returns its facade result directly.
 */
export function buildToolGroup(tools: Tools): CdtMcpToolGroup {
  return {
    name: 'react',
    description:
      'Inspect and profile the running React app. Components are addressed by ' +
      'stable uids (e.g. "r5") from react_get_component_tree; pass a uid ' +
      'to the other tools.',
    tools: TOOL_DEFINITIONS.map(definition => ({
      name: definition.name,
      description: definition.description,
      inputSchema: definition.inputSchema,
      execute: (args: {[string]: any}) =>
        normalizeToolResult(definition.call(tools, args || {})),
    })),
  };
}

/**
 * Install the facade and register the React tools with chrome-devtools-mcp.
 *
 * The facade is installed EAGERLY (synchronously, when this runs) so the
 * DevTools hook is in place before React initializes. The tools, however, are
 * built LAZILY inside the `devtoolstooldiscovery` handler — no tool work
 * happens until chrome-devtools-mcp actually discovers them. The tool group is
 * memoized so component uids stay stable across repeated discovery.
 *
 * chrome-devtools-mcp dispatches a `devtoolstooldiscovery` event and expects a
 * synchronous `respondWith(toolGroup)`.
 *
 * Best run once per page before React initializes so the first commit is
 * captured. If a DevTools hook is already installed (e.g. the React DevTools
 * browser extension), installFacade attaches to it instead of installing a
 * second one. Returns the Facade and an `unregister` function that removes the
 * discovery listener.
 */
export function register(target?: any = globalThis): {
  facade: Facade,
  unregister: () => void,
} {
  const existingRegistration: Registration | void = registrations.get(target);
  if (existingRegistration !== undefined) {
    return existingRegistration;
  }

  const facade = installFacade(target);

  let toolGroup: CdtMcpToolGroup | null = null;
  const listener = (event: ToolDiscoveryEvent) => {
    if (toolGroup === null) {
      toolGroup = buildToolGroup(createTools(facade));
    }
    event.respondWith(toolGroup);
  };
  target.addEventListener('devtoolstooldiscovery', listener);

  let isRegistered = true;
  const registration: Registration = {
    facade,
    unregister: () => {
      if (!isRegistered) {
        return;
      }
      isRegistered = false;
      target.removeEventListener('devtoolstooldiscovery', listener);
      registrations.delete(target);
    },
  };

  registrations.set(target, registration);
  return registration;
}
