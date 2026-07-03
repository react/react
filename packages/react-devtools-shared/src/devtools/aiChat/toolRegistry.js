/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ToolDefinition} from './types';

// Mirrors Chrome DevTools' per-function-result budget (~16k tokens).
export const MAX_TOOL_RESULT_CHARS = 64_000;

export default class ToolRegistry {
  _tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this._tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | null {
    return this._tools.get(name) || null;
  }

  get size(): number {
    return this._tools.size;
  }

  getAll(): Array<ToolDefinition> {
    return Array.from(this._tools.values());
  }

  // OpenAI-compatible tool declarations for the chat completions request.
  toProviderTools(): Array<Object> {
    return this.getAll().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  // Runs a tool call and normalizes the outcome into a string for the model.
  // Errors (including oversized results) are returned as error text rather
  // than thrown, so the model can react and retry with a narrower query.
  async execute(name: string, argumentsJSON: string): Promise<string> {
    const tool = this.get(name);
    if (tool == null) {
      return `Error: unknown tool "${name}".`;
    }

    let args = {};
    if (argumentsJSON.trim() !== '') {
      try {
        args = JSON.parse(argumentsJSON);
      } catch (error) {
        return `Error: arguments for "${name}" are not valid JSON. Fix the arguments and call the tool again.`;
      }
    }

    let result;
    try {
      result = await tool.execute(args);
    } catch (error) {
      return `Error executing "${name}": ${error.message}`;
    }

    if (result.length > MAX_TOOL_RESULT_CHARS) {
      return (
        result.slice(0, MAX_TOOL_RESULT_CHARS) +
        `\n\n[Result truncated at ${MAX_TOOL_RESULT_CHARS} characters. ` +
        'Narrow the query (e.g. a specific commit, component, or filter) and call again.]'
      );
    }
    return result;
  }
}
