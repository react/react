/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

// eslint-disable-next-line no-undef
type ChildProcess = child_process$ChildProcess;
type JSONSchemaObject = {
  type?: string,
  properties?: {[string]: JSONSchemaObject, ...},
  required?: Array<string>,
  ...
};
type CommandResult = {
  stdout: string,
  stderr: string,
};
type SpawnOptions = {
  cwd: string,
  detached?: boolean,
  env: {[string]: string | void},
  logFile: string,
};
type CommandOptions = {
  cwd: string,
  env: {[string]: string | void},
  logFile: string,
  timeout?: number,
};
type Chrome = {
  run: (args: Array<string>) => Promise<CommandResult>,
  json: (args: Array<string>) => Promise<mixed>,
};
type TreeNode = {
  uid: string,
  type: string,
  name: string,
  key?: string | null,
  firstChild?: string | null,
  nextSibling?: string | null,
};
type SnapshotNode = {
  id?: string,
  role?: string,
  name?: string,
  children?: Array<SnapshotNode>,
};
type ToolDefinition = {
  name: string,
  description: string,
  inputSchema: JSONSchemaObject,
};
type ToolGroup = {
  name: string,
  description: string,
  tools: Array<ToolDefinition>,
};
type ToolDiscovery = {
  thirdPartyDeveloperTools?: ToolGroup | Array<ToolGroup>,
  ...
};
type SourceResult = {
  source: null | {
    name: string,
    fileName: string,
    line: number,
    column: number,
    ...
  },
  ...
};
type PageReadiness = {
  hasApp: boolean,
  hasHook: boolean,
};
type ComponentDetails = {
  name: string,
  type: string,
  hooks: Array<{name: string, ...}>,
  ...
};
type SearchResult = {
  page: number,
  pageSize: number,
  totalCount: number,
  totalPages: number,
  results: Array<{name: string, ...}>,
  ...
};
type DomLookupResult = {
  type: string,
  name: string,
  ...
};
type OwnersStackResult = {
  stack: string,
  ...
};
type Owner = {
  name: string,
  ...
};
type ErrorPayload = {
  error: string,
  ...
};
type StartProfilingResult = {
  status: string,
  traceName: string,
  ...
};
type StopProfilingResult = {
  status: string,
  traceName: string,
  commits: number,
  ...
};
type TraceOverviewCommit = {
  commit: number,
  componentsChanged: number,
  ...
};
type CommitReport = {
  components: Array<{name: string, ...}>,
  ...
};

const TOOL_NAMES = [
  'react_get_component_tree',
  'react_get_component_by_uid',
  'react_get_component_by_dom_element',
  'react_find_components',
  'react_get_component_source',
  'react_get_owner_stack_trace',
  'react_get_owner_stack',
  'react_start_profiling',
  'react_stop_profiling',
  'react_get_trace_overview',
  'react_get_commit_report',
];

const PACKAGE_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PACKAGE_DIR, '..', '..');
const FIXTURE_DIR = path.join(PACKAGE_DIR, 'fixtures', 'app');
const BUILT_MODULES_DIR = path.join(REPO_ROOT, 'build', 'oss-experimental');
const LOG_DIR =
  process.env.E2E_LOG_DIR ||
  path.join(REPO_ROOT, 'tmp', 'react-devtools-cdt-mcp-e2e');

const SESSION_ID = `react-devtools-cdt-mcp-${process.pid}-${Date.now()}`;

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createError(message: string): Error {
  // eslint-disable-next-line react-internal/prod-error-codes
  return new Error(message);
}

function ensureBuiltModules(): void {
  if (!fs.existsSync(BUILT_MODULES_DIR)) {
    throw createError(
      'Missing build/oss-experimental. Run `yarn build-for-devtools` from ' +
        'the repo root before running react-devtools-cdt-mcp E2E tests.'
    );
  }
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', undefined, () => {
      const address = server.address();
      if (address == null || typeof address === 'string') {
        reject(createError('Failed to allocate a TCP port'));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

function appendLog(logFile: string, text: string | Buffer): void {
  fs.appendFileSync(logFile, text);
}

function formatCommand(command: string, args: Array<string>): string {
  return `$ ${[command, ...args].map(arg => JSON.stringify(arg)).join(' ')}\n`;
}

function spawnLogged(
  command: string,
  args: Array<string>,
  options: SpawnOptions
): ChildProcess {
  const child = childProcess.spawn(command, args, {
    cwd: options.cwd,
    detached: options.detached === true,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  appendLog(options.logFile, formatCommand(command, args));
  child.stdout.on('data', chunk => appendLog(options.logFile, chunk));
  child.stderr.on('data', chunk => appendLog(options.logFile, chunk));
  return child;
}

function runCommand(
  command: string,
  args: Array<string>,
  options: CommandOptions
): Promise<CommandResult> {
  const timeout = options.timeout || 120000;
  const logFile = options.logFile;
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    appendLog(logFile, formatCommand(command, args));
    const child = childProcess.spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(createError(`Command timed out after ${timeout}ms: ${command}`));
    }, timeout);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      appendLog(logFile, chunk);
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
      appendLog(logFile, chunk);
    });
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({stdout, stderr});
      } else {
        reject(
          createError(
            `Command failed with exit code ${code}: ${command} ${args.join(
              ' '
            )}\n${stderr || stdout}`
          )
        );
      }
    });
  });
}

function getChromeDevToolsBin(): string {
  let packageJsonPath: string;
  try {
    packageJsonPath = require.resolve('chrome-devtools-mcp/package.json', {
      paths: [PACKAGE_DIR],
    });
  } catch (error) {
    throw createError(
      'Missing chrome-devtools-mcp dependency. Run `yarn install` before ' +
        'running react-devtools-cdt-mcp E2E tests.'
    );
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (
    packageJson == null ||
    typeof packageJson !== 'object' ||
    packageJson.bin == null ||
    typeof packageJson.bin !== 'object' ||
    typeof packageJson.bin['chrome-devtools'] !== 'string'
  ) {
    throw createError(
      'chrome-devtools-mcp package.json is missing the chrome-devtools bin'
    );
  }
  return path.resolve(
    path.dirname(packageJsonPath),
    packageJson.bin['chrome-devtools']
  );
}

async function waitForHttp(url: string, timeout: number): Promise<void> {
  const deadline = Date.now() + timeout;
  let lastError: Error = createError('No response yet');
  while (Date.now() < deadline) {
    try {
      const statusCode: number = await new Promise((resolve, reject) => {
        // eslint-disable-next-line no-undef
        const request = http.get(url, (response: http$IncomingMessage<>) => {
          response.resume();
          response.on('end', () => resolve(response.statusCode || 0));
        });
        request.on('error', reject);
        request.setTimeout(1000, () => {
          request.destroy(createError('HTTP request timed out'));
        });
      });
      if (statusCode >= 200 && statusCode < 400) {
        return;
      }
      lastError = createError(`HTTP ${statusCode}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw createError(`Timed out waiting for ${url}: ${lastError.message}`);
}

async function waitForPageReady(
  chrome: Chrome,
  timeout: number
): Promise<void> {
  const deadline = Date.now() + timeout;
  let lastResult: mixed = null;
  while (Date.now() < deadline) {
    const result = await evaluatePageReadiness(
      chrome,
      `() => ({
      hasApp: document.querySelector('main.app') !== null,
      hasHook: window.__REACT_DEVTOOLS_GLOBAL_HOOK__ != null,
      hasDiscoveryListener: window.__dtmcp != null ||
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ != null,
    })`
    );
    lastResult = result;
    if (result.hasApp === true && result.hasHook === true) {
      return;
    }
    await sleep(250);
  }
  throw createError(
    `Timed out waiting for fixture readiness: ${
      JSON.stringify(lastResult) || String(lastResult)
    }`
  );
}

function parseJsonOutput(stdout: string): mixed {
  const text = stdout.trim();
  assert.notStrictEqual(text, '', 'Expected command to print JSON');
  const parsed = JSON.parse(text);
  if (
    Array.isArray(parsed) &&
    parsed.length === 1 &&
    parsed[0] &&
    parsed[0].type === 'text' &&
    typeof parsed[0].text === 'string'
  ) {
    throw createError(parsed[0].text);
  }
  return parsed;
}

function parseJsonFromText(text: string): mixed {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```json\n([\s\S]*?)\n```/);
  if (fenced) {
    return JSON.parse(fenced[1]);
  }
  return JSON.parse(trimmed);
}

function unwrapTextResponse(response: mixed): string {
  if (Array.isArray(response)) {
    return response.join('\n');
  }
  if (typeof response === 'string') {
    return response;
  }
  if (response != null && typeof response === 'object') {
    const message = response.message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return JSON.stringify(response) || String(response);
}

function formatValue(value: mixed): string {
  return JSON.stringify(value) || String(value);
}

function expectObject(value: mixed, message: string): {+[string]: mixed, ...} {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw createError(`${message}. Saw: ${formatValue(value)}`);
  }
  return value;
}

function expectString(value: mixed, message: string): string {
  if (typeof value !== 'string') {
    throw createError(`${message}. Saw: ${formatValue(value)}`);
  }
  return value;
}

function expectNumber(value: mixed, message: string): number {
  if (typeof value !== 'number') {
    throw createError(`${message}. Saw: ${formatValue(value)}`);
  }
  return value;
}

function expectArray(value: mixed, message: string): $ReadOnlyArray<mixed> {
  if (!Array.isArray(value)) {
    throw createError(`${message}. Saw: ${formatValue(value)}`);
  }
  return value;
}

function expectOptionalString(value: mixed, message: string): string | null {
  if (value == null) {
    return null;
  }
  return expectString(value, message);
}

function parseJSONSchemaObject(
  value: mixed,
  message: string
): JSONSchemaObject {
  const object = expectObject(value, message);
  const schema: JSONSchemaObject = {};
  if (object.type != null) {
    schema.type = expectString(object.type, `${message}.type must be a string`);
  }
  if (object.properties != null) {
    const rawProperties = expectObject(
      object.properties,
      `${message}.properties must be an object`
    );
    const properties: {[string]: JSONSchemaObject, ...} = {};
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const key of Object.keys(rawProperties)) {
      properties[key] = parseJSONSchemaObject(
        rawProperties[key],
        `${message}.properties.${key}`
      );
    }
    schema.properties = properties;
  }
  if (object.required != null) {
    schema.required = expectArray(
      object.required,
      `${message}.required must be an array`
    ).map((item, index) =>
      expectString(item, `${message}.required[${index}] must be a string`)
    );
  }
  return schema;
}

function parseToolDefinition(value: mixed): ToolDefinition {
  const object = expectObject(value, 'Expected tool definition object');
  return {
    name: expectString(object.name, 'Expected tool definition name'),
    description: expectString(
      object.description,
      'Expected tool definition description'
    ),
    inputSchema: parseJSONSchemaObject(
      object.inputSchema,
      'Expected tool definition inputSchema'
    ),
  };
}

function parseToolGroup(value: mixed): ToolGroup {
  const object = expectObject(value, 'Expected tool group object');
  return {
    name: expectString(object.name, 'Expected tool group name'),
    description: expectString(
      object.description,
      'Expected tool group description'
    ),
    tools: expectArray(object.tools, 'Expected tool group tools').map(
      parseToolDefinition
    ),
  };
}

function parseToolDiscovery(value: mixed): ToolDiscovery {
  const object = expectObject(value, 'Expected tool discovery object');
  const rawToolGroups = object.thirdPartyDeveloperTools;
  if (rawToolGroups == null) {
    return {};
  }
  return {
    thirdPartyDeveloperTools: Array.isArray(rawToolGroups)
      ? rawToolGroups.map(parseToolGroup)
      : parseToolGroup(rawToolGroups),
  };
}

function parsePageReadiness(value: mixed): PageReadiness {
  const object = expectObject(value, 'Expected page readiness object');
  return {
    hasApp: object.hasApp === true,
    hasHook: object.hasHook === true,
  };
}

async function evaluatePageReadiness(
  chrome: Chrome,
  fn: string
): Promise<PageReadiness> {
  const output = await chrome.json(['evaluate_script', fn]);
  return parsePageReadiness(parseJsonFromText(unwrapTextResponse(output)));
}

function parseToolResponse(output: mixed): mixed {
  return parseJsonFromText(unwrapTextResponse(output));
}

function parseTreeNode(value: mixed): TreeNode {
  const object = expectObject(value, 'Expected tree node object');
  return {
    uid: expectString(object.uid, 'Expected tree node uid'),
    type: expectString(object.type, 'Expected tree node type'),
    name: expectString(object.name, 'Expected tree node name'),
    key: expectOptionalString(object.key, 'Expected tree node key'),
    firstChild: expectOptionalString(
      object.firstChild,
      'Expected tree node firstChild'
    ),
    nextSibling: expectOptionalString(
      object.nextSibling,
      'Expected tree node nextSibling'
    ),
  };
}

function parseTree(value: mixed): Array<TreeNode> {
  const object = expectObject(value, 'Expected component tree response object');
  return expectArray(object.nodes, 'Expected component tree nodes array').map(
    parseTreeNode
  );
}

function parseNamedObject(value: mixed, message: string): {name: string, ...} {
  const object = expectObject(value, message);
  return {
    name: expectString(object.name, `${message} name`),
  };
}

function parseComponentDetails(value: mixed): ComponentDetails {
  const object = expectObject(value, 'Expected component details object');
  return {
    ...object,
    name: expectString(object.name, 'Expected component details name'),
    type: expectString(object.type, 'Expected component details type'),
    hooks: expectArray(object.hooks, 'Expected component details hooks').map(
      (hook, index) =>
        parseNamedObject(hook, `Expected component hook ${index}`)
    ),
  };
}

function parseComponentType(value: mixed): string {
  return expectString(
    expectObject(value, 'Expected component details object').type,
    'Expected component details type'
  );
}

function parseSearchResult(value: mixed): SearchResult {
  const object = expectObject(value, 'Expected search result object');
  return {
    ...object,
    page: expectNumber(object.page, 'Expected search result page'),
    pageSize: expectNumber(object.pageSize, 'Expected search result pageSize'),
    totalCount: expectNumber(
      object.totalCount,
      'Expected search result totalCount'
    ),
    totalPages: expectNumber(
      object.totalPages,
      'Expected search result totalPages'
    ),
    results: expectArray(object.results, 'Expected search result results').map(
      (result, index) =>
        parseNamedObject(result, `Expected search result ${index}`)
    ),
  };
}

function parseSnapshotNode(value: mixed): SnapshotNode {
  const object = expectObject(value, 'Expected snapshot node object');
  const snapshotNode: SnapshotNode = {};
  if (object.id != null) {
    snapshotNode.id = expectString(object.id, 'Expected snapshot node id');
  }
  if (object.role != null) {
    snapshotNode.role = expectString(
      object.role,
      'Expected snapshot node role'
    );
  }
  if (object.name != null) {
    snapshotNode.name = expectString(
      object.name,
      'Expected snapshot node name'
    );
  }
  if (object.children != null) {
    snapshotNode.children = expectArray(
      object.children,
      'Expected snapshot node children'
    ).map(parseSnapshotNode);
  }
  return snapshotNode;
}

function parseSnapshotResponse(value: mixed): {snapshot: SnapshotNode, ...} {
  const object = expectObject(value, 'Expected snapshot response object');
  return {
    snapshot: parseSnapshotNode(object.snapshot),
  };
}

function parseDomLookupResult(value: mixed): DomLookupResult {
  const object = expectObject(value, 'Expected DOM lookup result object');
  return {
    ...object,
    type: expectString(object.type, 'Expected DOM lookup result type'),
    name: expectString(object.name, 'Expected DOM lookup result name'),
  };
}

function parseSourceResult(value: mixed): SourceResult {
  const object = expectObject(value, 'Expected source result object');
  if (object.source == null) {
    return {source: null};
  }
  const source = expectObject(object.source, 'Expected source object');
  return {
    ...object,
    source: {
      ...source,
      name: expectString(source.name, 'Expected source name'),
      fileName: expectString(source.fileName, 'Expected source fileName'),
      line: expectNumber(source.line, 'Expected source line'),
      column: expectNumber(source.column, 'Expected source column'),
    },
  };
}

function parseOwnersStack(value: mixed): OwnersStackResult {
  const object = expectObject(value, 'Expected owners stack object');
  return {
    ...object,
    stack: expectString(object.stack, 'Expected owners stack string'),
  };
}

function parseOwnersBranch(value: mixed): Array<Owner> {
  return expectArray(value, 'Expected owners branch array').map(
    (owner, index) => parseNamedObject(owner, `Expected owner ${index}`)
  );
}

function parseErrorPayload(value: mixed): ErrorPayload {
  const object = expectObject(value, 'Expected error payload object');
  return {
    ...object,
    error: expectString(object.error, 'Expected error payload error'),
  };
}

function parseStartProfilingResult(value: mixed): StartProfilingResult {
  const object = expectObject(value, 'Expected start profiling result object');
  return {
    ...object,
    status: expectString(object.status, 'Expected start profiling status'),
    traceName: expectString(
      object.traceName,
      'Expected start profiling traceName'
    ),
  };
}

function parseStopProfilingResult(value: mixed): StopProfilingResult {
  const object = expectObject(value, 'Expected stop profiling result object');
  return {
    ...object,
    status: expectString(object.status, 'Expected stop profiling status'),
    traceName: expectString(
      object.traceName,
      'Expected stop profiling traceName'
    ),
    commits: expectNumber(object.commits, 'Expected stop profiling commits'),
  };
}

function parseTraceOverview(value: mixed): Array<TraceOverviewCommit> {
  return expectArray(value, 'Expected trace overview array').map(
    (commit, index) => {
      const object = expectObject(commit, `Expected trace overview ${index}`);
      return {
        ...object,
        commit: expectNumber(
          object.commit,
          `Expected trace overview ${index} commit`
        ),
        componentsChanged: expectNumber(
          object.componentsChanged,
          `Expected trace overview ${index} componentsChanged`
        ),
      };
    }
  );
}

function parseCommitReport(value: mixed): CommitReport {
  const object = expectObject(value, 'Expected commit report object');
  return {
    ...object,
    components: expectArray(
      object.components,
      'Expected commit report components'
    ).map((component, index) =>
      parseNamedObject(component, `Expected commit report component ${index}`)
    ),
  };
}

function findNode(
  tree: Array<TreeNode>,
  predicate: (node: TreeNode) => boolean,
  message: string
): TreeNode {
  const node = tree.find(predicate);
  if (node == null) {
    throw createError(
      `${message}. Saw: ${tree
        .map(item => `${item.name}:${item.type}`)
        .join(', ')}`
    );
  }
  return node;
}

function flattenSnapshot(
  node: SnapshotNode,
  result: Array<SnapshotNode>
): Array<SnapshotNode> {
  result.push(node);
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const child of node.children || []) {
    flattenSnapshot(child, result);
  }
  return result;
}

function findSnapshotNode(
  snapshot: SnapshotNode,
  predicate: (node: SnapshotNode) => boolean,
  message: string
): SnapshotNode {
  const node = flattenSnapshot(snapshot, []).find(predicate);
  if (node == null) {
    throw createError(message);
  }
  return node;
}

function assertHasSchema(tool: ToolDefinition): void {
  assert.strictEqual(typeof tool.description, 'string');
  assert(tool.description.length > 0);
  assert.strictEqual(tool.inputSchema.type, 'object');
}

function getReactToolGroup(discovery: ToolDiscovery): ToolGroup | null {
  const toolGroups = discovery.thirdPartyDeveloperTools;
  if (Array.isArray(toolGroups)) {
    return toolGroups.find(group => group.name === 'react') || null;
  }
  if (
    toolGroups != null &&
    typeof toolGroups === 'object' &&
    toolGroups.name === 'react'
  ) {
    return toolGroups;
  }
  return null;
}

function assertSourceReference(sourceResult: SourceResult): void {
  if (sourceResult.source === null) {
    return;
  }
  const source = sourceResult.source;
  assert.strictEqual(typeof source.name, 'string');
  assert.strictEqual(typeof source.fileName, 'string');
  assert(
    /App\.js|bundle\.js|webpack/.test(source.fileName),
    `Expected source file to reference App.js, bundle.js, or webpack. Saw: ${source.fileName}`
  );
  assert.strictEqual(typeof source.line, 'number');
  assert.strictEqual(typeof source.column, 'number');
}

async function runE2E(chrome: Chrome, appUrl: string): Promise<void> {
  await chrome.json(['navigate_page', '--type', 'url', '--url', appUrl]);
  await waitForPageReady(chrome, 30000);

  log('Checking third-party tool discovery...');
  const discovery = parseToolDiscovery(
    await chrome.json(['list_3p_developer_tools'])
  );
  const toolGroup = getReactToolGroup(discovery);
  if (toolGroup == null) {
    throw createError('Expected a third-party tool group');
  }
  assert.strictEqual(toolGroup.name, 'react');
  assert.deepStrictEqual(
    toolGroup.tools.map(tool => tool.name),
    TOOL_NAMES
  );
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const tool of toolGroup.tools) {
    assertHasSchema(tool);
  }
  const domTool = toolGroup.tools.find(
    tool => tool.name === 'react_get_component_by_dom_element'
  );
  if (domTool == null) {
    throw createError(
      'Expected react_get_component_by_dom_element in discovery'
    );
  }
  const inputSchemaProperties = domTool.inputSchema.properties;
  if (inputSchemaProperties == null) {
    throw createError('Expected DOM lookup tool schema properties');
  }
  const domElementSchema = inputSchemaProperties.element;
  if (domElementSchema == null) {
    throw createError('Expected DOM lookup tool element schema');
  }
  const domElementSchemaProperties = domElementSchema.properties;
  if (domElementSchemaProperties == null) {
    throw createError('Expected DOM lookup tool element schema properties');
  }
  assert.strictEqual(domElementSchema.type, 'object');
  assert.deepStrictEqual(domElementSchemaProperties, {uid: {type: 'string'}});
  assert.deepStrictEqual(domElementSchema.required, ['uid']);

  log('Checking tree, details, search, and DOM lookup...');
  const callTool = (toolName: string, params?: {...}): Promise<mixed> =>
    chrome
      .json([
        'execute_3p_developer_tool',
        toolName,
        '--params',
        JSON.stringify(params || {}),
      ])
      .then(parseToolResponse);

  const tree = parseTree(await callTool('react_get_component_tree'));
  const counter = findNode(
    tree,
    node => node.name === 'Counter' && node.type === 'function',
    'Expected function component Counter'
  );
  const todo = findNode(
    tree,
    node => node.name === 'Todo' && node.type === 'function',
    'Expected function component Todo'
  );
  const memoBox = findNode(
    tree,
    node => node.name.includes('MemoBox') && node.type === 'memo',
    'Expected memo component MemoBox'
  );
  const fancyInput = findNode(
    tree,
    node => node.name.includes('FancyInput') && node.type === 'forwardRef',
    'Expected forwardRef component FancyInput'
  );
  const input = findNode(
    tree,
    node => node.name === 'input' && node.type === 'host',
    'Expected host input'
  );

  const counterDetails = parseComponentDetails(
    await callTool('react_get_component_by_uid', {
      uid: counter.uid,
      includeHooks: true,
    })
  );
  assert.strictEqual(counterDetails.name, 'Counter');
  assert(
    counterDetails.hooks.some(hook => hook.name === 'State'),
    'Expected Counter details to include a State hook'
  );

  assert.strictEqual(
    parseComponentType(
      await callTool('react_get_component_by_uid', {uid: memoBox.uid})
    ),
    'memo'
  );
  assert.strictEqual(
    parseComponentType(
      await callTool('react_get_component_by_uid', {uid: fancyInput.uid})
    ),
    'forwardRef'
  );
  assert.strictEqual(
    parseComponentType(
      await callTool('react_get_component_by_uid', {uid: input.uid})
    ),
    'host'
  );

  const todoSearch = parseSearchResult(
    await callTool('react_find_components', {
      name: 'Todo',
      pageSize: 2,
    })
  );
  assert.strictEqual(todoSearch.page, 1);
  assert.strictEqual(todoSearch.pageSize, 2);
  assert.strictEqual(todoSearch.totalCount, 4);
  assert.strictEqual(todoSearch.totalPages, 2);
  assert.deepStrictEqual(
    todoSearch.results.map(result => result.name),
    ['TodoList', 'Todo']
  );

  const snapshot = parseSnapshotResponse(await chrome.json(['take_snapshot']));
  const buttonNode = findSnapshotNode(
    snapshot.snapshot,
    node => node.role === 'button' && node.name === '+1',
    'Expected +1 button in snapshot'
  );
  const buttonUid = buttonNode.id;
  if (buttonUid == null) {
    throw createError('Expected +1 button uid');
  }
  const domLookup = parseDomLookupResult(
    await callTool('react_get_component_by_dom_element', {
      element: {uid: buttonUid},
    })
  );
  assert.strictEqual(domLookup.type, 'host');
  assert.strictEqual(domLookup.name, 'button');

  log('Checking source, owners, and error payloads...');
  const source = parseSourceResult(
    await callTool('react_get_component_source', {
      uid: counter.uid,
    })
  );
  assertSourceReference(source);

  const ownersStack = parseOwnersStack(
    await callTool('react_get_owner_stack_trace', {uid: todo.uid})
  );
  assert.strictEqual(typeof ownersStack.stack, 'string');
  if (ownersStack.stack.length > 0) {
    assert(
      /Todo|TodoList|App\.js/.test(ownersStack.stack),
      `Expected owners stack to reference Todo, TodoList, or App.js. Saw: ${ownersStack.stack}`
    );
  }

  const ownersBranch = parseOwnersBranch(
    await callTool('react_get_owner_stack', {
      uid: todo.uid,
    })
  );
  assert(
    ownersBranch.some(owner => owner.name === 'TodoList'),
    'Expected Todo owners branch to include TodoList'
  );

  const invalidUid = parseErrorPayload(
    await callTool('react_get_component_by_uid', {
      uid: 'r999999',
    })
  );
  assert.deepStrictEqual(invalidUid, {
    error: 'Component not found: "r999999"',
  });

  log('Checking profiling through a real CLI click...');
  const traceName = `e2e-${Date.now()}`;
  assert.deepStrictEqual(
    parseStartProfilingResult(
      await callTool('react_start_profiling', {traceName})
    ),
    {
      status: 'started',
      traceName,
    }
  );
  await chrome.json(['click', buttonUid]);
  const stopResult = parseStopProfilingResult(
    await callTool('react_stop_profiling')
  );
  assert.strictEqual(stopResult.status, 'stopped');
  assert.strictEqual(stopResult.traceName, traceName);
  assert(
    stopResult.commits >= 1,
    'Expected profiling to record at least one commit'
  );

  const overview = parseTraceOverview(
    await callTool('react_get_trace_overview', {traceName})
  );
  assert(overview.length >= 1, 'Expected at least one profiling commit');
  assert(
    overview.some(commit => commit.componentsChanged >= 1),
    'Expected at least one changed component in trace overview'
  );

  let foundCounterCommit = false;
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const commit of overview) {
    const report = parseCommitReport(
      await callTool('react_get_commit_report', {
        traceName,
        commitIndex: commit.commit,
      })
    );
    if (report.components.some(component => component.name === 'Counter')) {
      foundCounterCommit = true;
      break;
    }
  }
  assert(foundCounterCommit, 'Expected a profiling commit involving Counter');
}

async function main(): Promise<void> {
  ensureBuiltModules();
  fs.mkdirSync(LOG_DIR, {recursive: true});

  const fixtureLog = path.join(LOG_DIR, 'fixture-server.log');
  const chromeLog = path.join(LOG_DIR, 'chrome-devtools.log');
  const cliLog = path.join(LOG_DIR, 'chrome-devtools-cli.log');
  fs.writeFileSync(fixtureLog, '');
  fs.writeFileSync(chromeLog, '');
  fs.writeFileSync(cliLog, '');

  const chromeDevToolsBin = getChromeDevToolsBin();
  const port = await getFreePort();
  const appUrl = `http://127.0.0.1:${port}/`;

  let fixture: ?ChildProcess;
  const runChrome = (args: Array<string>): Promise<CommandResult> =>
    runCommand(
      process.execPath,
      [chromeDevToolsBin, ...args, '--sessionId', SESSION_ID],
      {
        cwd: PACKAGE_DIR,
        env: process.env,
        logFile: cliLog,
        timeout: 120000,
      }
    );
  const chrome: Chrome = {
    run: runChrome,
    async json(args: Array<string>): Promise<mixed> {
      const result = await runChrome([...args, '--output-format', 'json']);
      return parseJsonOutput(result.stdout);
    },
  };

  try {
    log(`Starting fixture at ${appUrl}`);
    fixture = spawnLogged('yarn', ['start'], {
      cwd: FIXTURE_DIR,
      detached: true,
      env: {
        ...process.env,
        BROWSER: 'none',
        CI: 'true',
        E2E: 'true',
        HOST: '127.0.0.1',
        PORT: String(port),
      },
      logFile: fixtureLog,
    });
    await waitForHttp(appUrl, 60000);

    const startArgs = [
      'start',
      '--categoryExperimentalThirdParty=true',
      '--headless=true',
      '--isolated=true',
      '--usageStatistics=false',
      '--logFile',
      chromeLog,
    ];
    if (process.env.CHROME_EXECUTABLE_PATH) {
      startArgs.push('--executablePath', process.env.CHROME_EXECUTABLE_PATH);
    }
    log('Starting chrome-devtools daemon...');
    await chrome.run(startArgs);

    await runE2E(chrome, appUrl);
    log('react-devtools-cdt-mcp E2E passed.');
  } finally {
    try {
      await chrome.run(['stop']);
    } catch (error) {
      appendLog(cliLog, `Failed to stop chrome-devtools: ${error.stack}\n`);
    }
    if (fixture && fixture.pid) {
      try {
        process.kill(-fixture.pid, 'SIGTERM');
      } catch (error) {
        try {
          fixture.kill('SIGTERM');
        } catch (innerError) {
          appendLog(
            fixtureLog,
            `Failed to stop fixture server: ${innerError.stack}\n`
          );
        }
      }
    }
  }
}

module.exports = {main};
