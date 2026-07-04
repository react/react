/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import SourceMapConsumer from 'react-devtools-shared/src/hooks/SourceMapConsumer';

// Reconstructs original source files from the inspected page's source maps
// (the same mechanism hook-name parsing uses): fetch the runtime bundle,
// follow its sourceMappingURL annotation, and read the map's embedded
// sourcesContent. This gives the AI chat real application code with no
// filesystem access — only files the page's own source maps expose.

export type FetchFile = (url: string) => Promise<string>;

type BundleSourceMap = {
  consumer: any,
  contentByURL: Map<string, string>,
};

const SOURCE_MAP_ANNOTATION_PREFIX = 'sourceMappingURL=';

const bundleCache: Map<string, Promise<BundleSourceMap | null>> = new Map();
// All original sources discovered so far (across bundles), for lookups by path.
const knownSources: Map<string, string> = new Map();

function collectSourcesContent(
  sourceMapJSON: Object,
  out: Map<string, string>,
): void {
  if (Array.isArray(sourceMapJSON.sections)) {
    for (let i = 0; i < sourceMapJSON.sections.length; i++) {
      const section = sourceMapJSON.sections[i];
      if (section != null && section.map != null) {
        collectSourcesContent(section.map, out);
      }
    }
    return;
  }
  const sources = sourceMapJSON.sources;
  const sourcesContent = sourceMapJSON.sourcesContent;
  if (!Array.isArray(sources) || !Array.isArray(sourcesContent)) {
    return;
  }
  const sourceRoot =
    typeof sourceMapJSON.sourceRoot === 'string'
      ? sourceMapJSON.sourceRoot
      : '';
  for (let i = 0; i < sources.length; i++) {
    const content = sourcesContent[i];
    if (typeof sources[i] === 'string' && typeof content === 'string') {
      out.set(sourceRoot + sources[i], content);
    }
  }
}

async function loadBundleSourceMapImpl(
  fetchFile: FetchFile,
  bundleURL: string,
): Promise<BundleSourceMap | null> {
  const resource = await fetchFile(bundleURL).catch(() => null);
  if (resource == null) {
    return null;
  }

  // Find the sourceMappingURL annotation at the end of the bundle.
  let sourceMapURL = null;
  const resourceLines = resource.split(/[\r\n]+/);
  for (let i = resourceLines.length - 1; i >= 0; --i) {
    const resourceLine = resourceLines[i];
    if (!resourceLine) {
      continue;
    }
    if (!resourceLine.startsWith('//#')) {
      break;
    }
    const annotationIndex = resourceLine.indexOf(SOURCE_MAP_ANNOTATION_PREFIX);
    if (annotationIndex !== -1) {
      const sourceMapAt = resourceLine.slice(
        annotationIndex + SOURCE_MAP_ANNOTATION_PREFIX.length,
      );
      try {
        sourceMapURL = new URL(sourceMapAt, bundleURL).toString();
      } catch (error) {
        return null;
      }
      break;
    }
  }
  if (sourceMapURL == null) {
    return null;
  }

  const sourceMapContents = await fetchFile(sourceMapURL).catch(() => null);
  if (sourceMapContents == null) {
    return null;
  }

  try {
    const sourceMapJSON = JSON.parse(sourceMapContents);
    const consumer = SourceMapConsumer(sourceMapJSON);
    const contentByURL: Map<string, string> = new Map();
    collectSourcesContent(sourceMapJSON, contentByURL);
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const [url, content] of contentByURL) {
      knownSources.set(url, content);
    }
    return {consumer, contentByURL};
  } catch (error) {
    return null;
  }
}

function loadBundleSourceMap(
  fetchFile: FetchFile,
  bundleURL: string,
): Promise<BundleSourceMap | null> {
  let promise = bundleCache.get(bundleURL);
  if (promise == null) {
    promise = loadBundleSourceMapImpl(fetchFile, bundleURL);
    bundleCache.set(bundleURL, promise);
  }
  return promise;
}

function findContent(
  contentByURL: Map<string, string>,
  sourceURL: string,
): string | null {
  const exact = contentByURL.get(sourceURL);
  if (exact != null) {
    return exact;
  }
  // The consumer may resolve URLs differently than the raw map entries
  // (e.g. webpack:// prefixes); fall back to suffix matching.
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const [url, content] of contentByURL) {
    if (url.endsWith(sourceURL) || sourceURL.endsWith(url)) {
      return content;
    }
  }
  return null;
}

export type OriginalSource = {
  url: string,
  line: number | null,
  content: string | null,
};

// Maps a runtime (bundle) location to the original file and its content.
export async function getOriginalSource(
  fetchFile: FetchFile,
  bundleURL: string,
  line: number,
  column: number,
): Promise<OriginalSource | null> {
  const bundle = await loadBundleSourceMap(fetchFile, bundleURL);
  if (bundle == null) {
    return null;
  }
  let position;
  try {
    position = bundle.consumer.originalPositionFor({
      lineNumber: line,
      columnNumber: column,
    });
  } catch (error) {
    return null;
  }
  if (position == null || position.sourceURL == null) {
    return null;
  }
  return {
    url: position.sourceURL,
    line: typeof position.line === 'number' ? position.line : null,
    content: findContent(bundle.contentByURL, position.sourceURL),
  };
}

// Lookup across all source maps loaded so far in this session.
export function searchKnownSources(pathQuery: string): Array<string> {
  const query = pathQuery.toLowerCase();
  const matches = [];
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const url of knownSources.keys()) {
    if (url.toLowerCase().includes(query)) {
      matches.push(url);
    }
  }
  return matches;
}

export function getKnownSourceContent(url: string): string | null {
  return knownSources.get(url) ?? null;
}

export function hasLoadedAnySources(): boolean {
  return knownSources.size > 0;
}

const MAX_SOURCE_LINES = 400;
const WINDOW_RADIUS = 100;

// Renders file content with 1-based line numbers, windowed around focusLine
// when the file is large. Line numbers let the model cite exact locations.
export function formatSourceWindow(
  content: string,
  focusLine: number | null,
): string {
  const lines = content.split('\n');
  let start = 0;
  let end = lines.length;
  if (lines.length > MAX_SOURCE_LINES) {
    if (focusLine != null) {
      start = Math.max(0, focusLine - 1 - WINDOW_RADIUS);
      end = Math.min(lines.length, focusLine - 1 + WINDOW_RADIUS);
    } else {
      end = MAX_SOURCE_LINES;
    }
  }
  const numbered = [];
  if (start > 0) {
    numbered.push(`… (${start} earlier lines omitted)`);
  }
  for (let i = start; i < end; i++) {
    const marker = focusLine != null && i === focusLine - 1 ? '→' : ' ';
    numbered.push(`${marker}${i + 1}: ${lines[i]}`);
  }
  if (end < lines.length) {
    numbered.push(`… (${lines.length - end} later lines omitted)`);
  }
  return numbered.join('\n');
}
