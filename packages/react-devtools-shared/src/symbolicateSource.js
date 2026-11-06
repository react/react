/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import SourceMapConsumer from 'react-devtools-shared/src/hooks/SourceMapConsumer';

import type {ReactFunctionLocation} from 'shared/ReactTypes';
import type {FetchFileWithCaching} from 'react-devtools-shared/src/devtools/views/Components/FetchFileWithCachingContext';

const symbolicationCache: Map<
  string,
  Promise<SourceMappedLocation | null>,
> = new Map();

export type SourceMappedLocation = {
  location: ReactFunctionLocation,
  ignored: boolean, // Whether the file for this location was ignore listed
};

export function symbolicateSourceWithCache(
  fetchFileWithCaching: FetchFileWithCaching,
  sourceURL: string,
  line: number, // 1-based
  column: number, // 1-based
): Promise<SourceMappedLocation | null> {
  const key = `${sourceURL}:${line}:${column}`;
  const cachedPromise = symbolicationCache.get(key);
  if (cachedPromise != null) {
    return cachedPromise;
  }

  const promise = symbolicateSource(
    fetchFileWithCaching,
    sourceURL,
    line,
    column,
  );
  symbolicationCache.set(key, promise);

  return promise;
}

// Decodes data:[<media-type>][;base64],<data>
function decodeDataURL(url: string): string {
  const commaIndex = url.indexOf(',');
  const data = url.slice(commaIndex + 1);
  if (!url.slice(0, commaIndex).endsWith(';base64')) {
    return decodeURIComponent(data);
  }
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function fetchSourceMap(
  fetchFileWithCaching: FetchFileWithCaching,
  sourceMapURL: string,
): Promise<string | null> {
  if (sourceMapURL.startsWith('data:')) {
    // Inline source maps (e.g. every module served by Vite in development)
    // are already here. Fetching them would cost a round trip per stack frame,
    // and they never match a cached resource, so it takes the slowest path.
    try {
      return Promise.resolve(decodeDataURL(sourceMapURL));
    } catch (e) {
      return Promise.resolve(null);
    }
  }
  return fetchFileWithCaching(sourceMapURL).catch(() => null);
}

const SOURCE_MAP_ANNOTATION_PREFIX = 'sourceMappingURL=';
export async function symbolicateSource(
  fetchFileWithCaching: FetchFileWithCaching,
  sourceURL: string,
  lineNumber: number, // 1-based
  columnNumber: number, // 1-based
): Promise<SourceMappedLocation | null> {
  if (!sourceURL || sourceURL.startsWith('<anonymous')) {
    return null;
  }
  const resource = await fetchFileWithCaching(sourceURL).catch(() => null);
  if (resource == null) {
    return null;
  }

  const resourceLines = resource.split(/[\r\n]+/);
  for (let i = resourceLines.length - 1; i >= 0; --i) {
    const resourceLine = resourceLines[i];

    // In case there is empty last line
    if (!resourceLine) continue;
    // Not an annotation? Stop looking for a source mapping url.
    if (!resourceLine.startsWith('//#')) break;

    if (resourceLine.includes(SOURCE_MAP_ANNOTATION_PREFIX)) {
      const sourceMapAnnotationStartIndex = resourceLine.indexOf(
        SOURCE_MAP_ANNOTATION_PREFIX,
      );
      const sourceMapAt = resourceLine.slice(
        sourceMapAnnotationStartIndex + SOURCE_MAP_ANNOTATION_PREFIX.length,
        resourceLine.length,
      );

      // Compute the absolute source map URL. If the base URL is invalid, gracefully bail.
      let sourceMapURL;
      try {
        sourceMapURL = new URL(sourceMapAt, sourceURL).toString();
      } catch (e) {
        // Fallback: try if sourceMapAt is already an absolute URL; otherwise give up.
        try {
          sourceMapURL = new URL(sourceMapAt).toString();
        } catch (_e) {
          return null;
        }
      }
      const sourceMap = await fetchSourceMap(
        fetchFileWithCaching,
        sourceMapURL,
      );
      if (sourceMap != null) {
        try {
          const parsedSourceMap = JSON.parse(sourceMap);
          const consumer = SourceMapConsumer(parsedSourceMap);
          const functionName = ''; // TODO: Parse function name from sourceContent.
          const {
            sourceURL: possiblyURL,
            line,
            column: columnZeroBased,
            ignored,
          } = consumer.originalPositionFor({
            lineNumber, // 1-based
            columnNumber, // 1-based
          });

          const column = columnZeroBased + 1;

          if (possiblyURL === null) {
            return null;
          }
          try {
            // sourceMapURL = https://react.dev/script.js.map
            void new URL(possiblyURL); // test if it is a valid URL

            return {
              location: [functionName, possiblyURL, line, column],
              ignored,
            };
          } catch (e) {
            // This is not valid URL
            if (
              // sourceMapURL = /file
              possiblyURL.startsWith('/') ||
              // sourceMapURL = C:\\...
              possiblyURL.slice(1).startsWith(':\\\\')
            ) {
              // This is an absolute path
              return {
                location: [functionName, possiblyURL, line, column],
                ignored,
              };
            }

            // This is a relative path
            // possiblyURL = x.js.map, sourceMapURL = https://react.dev/script.js.map
            // An inline (data:) source map has no location of its own, so like
            // browsers do, resolve its sources against the script's URL.
            // possiblyURL = App.tsx, sourceURL = https://react.dev/src/App.tsx
            const absoluteSourcePath = new URL(
              possiblyURL,
              sourceMapURL.startsWith('data:') ? sourceURL : sourceMapURL,
            ).toString();
            return {
              location: [functionName, absoluteSourcePath, line, column],
              ignored,
            };
          }
        } catch (e) {
          return null;
        }
      }

      return null;
    }
  }

  return null;
}
