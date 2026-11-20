/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import SourceMapConsumer from './hooks/SourceMapConsumer';
import type {SourceMapConsumerType} from './hooks/SourceMapConsumer';

const consumers: Map<string, SourceMapConsumerType> = new Map();
const MAX_CACHED_MAPS = 50;

// These operations run in the extension worker, including the large string scan.
export function getSourceMapURL(
  sourceURL: string,
  resource: string,
): string | null {
  if (sourceURL.startsWith('data:') && resource === sourceURL)
    resource = decodeMapText(resource);
  const lines = resource.split(/[\r\n]+/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line) continue;
    if (!line.startsWith('//#')) break;
    const prefix = 'sourceMappingURL=';
    const index = line.indexOf(prefix);
    if (index < 0) continue;
    const reference = line.slice(index + prefix.length);
    if (reference.startsWith('data:')) return reference;
    try {
      return new URL(reference, sourceURL).toString();
    } catch {
      try {
        return new URL(reference).toString();
      } catch {
        return null;
      }
    }
  }
  return null;
}

function decodeMapText(text: string): string {
  if (!text.startsWith('data:')) return text;
  const comma = text.indexOf(',');
  if (comma < 0) throw Error('Invalid inline map');
  const content = decodeURIComponent(text.slice(comma + 1));
  if (!/;base64$/i.test(text.slice(0, comma))) return content;
  const binary = atob(content);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
}

export function loadSourceMap(key: string, text: string): boolean {
  try {
    const consumer = SourceMapConsumer(JSON.parse(decodeMapText(text)));
    consumers.delete(key);
    consumers.set(key, consumer);
    if (consumers.size > MAX_CACHED_MAPS)
      consumers.delete(consumers.keys().next().value);
    return true;
  } catch {
    consumers.delete(key);
    return false;
  }
}

export function resolveSource(
  key: string,
  lineNumber: number,
  columnNumber: number,
) {
  const consumer = consumers.get(key);
  if (consumer === undefined) throw Error('Source map was evicted');
  consumers.delete(key);
  consumers.set(key, consumer);
  const {sourceURL, line, column, ignored} = consumer.originalPositionFor({
    lineNumber,
    columnNumber,
  });
  // Do not clone sourcesContent or decoded mappings back to the UI thread.
  return {sourceURL, line, column, ignored};
}

// Keep an inline map entirely inside this worker: only return its kind and
// whether it loaded, rather than copying the large data URL to the UI and back.
export function prepareSourceMap(
  key: string,
  sourceURL: string,
  resource: string,
) {
  const sourceMapURL = getSourceMapURL(sourceURL, resource);
  if (sourceMapURL === null) return null;
  if (sourceMapURL.startsWith('data:'))
    return {sourceMapURL: 'data:', loaded: loadSourceMap(key, sourceMapURL)};
  return {sourceMapURL, loaded: false};
}
