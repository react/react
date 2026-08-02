/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// For an overview of why the code in this file is structured this way,
// refer to header comments in loadSourceAndMetadata.

import {parse} from '@babel/parser';
import LRU from 'lru-cache';
import {getHookName} from '../astUtils';
import {areSourceMapsAppliedToErrors} from '../ErrorTester';
import {__DEBUG__} from 'react-devtools-shared/src/constants';
import {getHookSourceLocationKey} from 'react-devtools-shared/src/hookSourceLocation';
import {SourceMapMetadataConsumer} from '../SourceMapMetadataConsumer';
import {
  withAsyncPerfMeasurements,
  withSyncPerfMeasurements,
} from 'react-devtools-shared/src/PerformanceLoggingUtils';
import SourceMapConsumer from '../SourceMapConsumer';

import type {SourceMapConsumerType} from '../SourceMapConsumer';
import type {
  HooksList,
  LocationKeyToHookSourceAndMetadata,
} from './loadSourceAndMetadata';
import type {HookSource} from 'react-debug-tools/src/ReactDebugHooks';
import type {
  HookNames,
  LRUCache,
} from 'react-devtools-shared/src/frontend/types';

type AST = mixed;

type HookParsedMetadata = {
  // API for consuming metadfata present in extended source map.
  metadataConsumer: SourceMapMetadataConsumer | null,

  // AST for original source code; typically comes from a consumed source map.
  originalSourceAST: AST | null,

  // Source code (React components or custom hooks) containing primitive hook calls.
  // If no source map has been provided, this code will be the same as runtimeSourceCode.
  originalSourceCode: string | null,

  // Original source URL if there is a source map, or the same as runtimeSourceURL.
  originalSourceURL: string | null,

  // Line number in original source code.
  originalSourceLineNumber: number | null,

  // Column number in original source code.
  originalSourceColumnNumber: number | null,

  // Alternate APIs from source-map for parsing source maps (if detected).
  sourceMapConsumer: SourceMapConsumerType | null,
};

type LocationKeyToHookParsedMetadata = Map<string, HookParsedMetadata>;

type CachedRuntimeCodeMetadata = {
  metadataConsumer: SourceMapMetadataConsumer | null,
  sourceMapConsumer: SourceMapConsumerType | null,
};

const runtimeURLToMetadataCache: LRUCache<string, CachedRuntimeCodeMetadata> =
  new LRU({max: 50});

type CachedSourceCodeMetadata = {
  originalSourceAST: AST,
  originalSourceCode: string,
};

const originalURLToMetadataCache: LRUCache<string, CachedSourceCodeMetadata> =
  new LRU({
    max: 50,
    dispose: (
      originalSourceURL: string,
      metadata: CachedSourceCodeMetadata,
    ) => {
      // $FlowFixMe[constant-condition]
      if (__DEBUG__) {
        console.log(
          `originalURLToMetadataCache.dispose() Evicting cached metadata for "${originalSourceURL}"`,
        );
      }
    },
  });

export async function parseSourceAndMetadata(
  hooksList: HooksList,
  locationKeyToHookSourceAndMetadata: LocationKeyToHookSourceAndMetadata,
): Promise<HookNames | null> {
  return withAsyncPerfMeasurements('parseSourceAndMetadata()', async () => {
    const locationKeyToHookParsedMetadata = withSyncPerfMeasurements(
      'initializeHookParsedMetadata',
      () => initializeHookParsedMetadata(locationKeyToHookSourceAndMetadata),
    );

    withSyncPerfMeasurements('parseSourceMaps', () =>
      parseSourceMaps(
        locationKeyToHookSourceAndMetadata,
        locationKeyToHookParsedMetadata,
      ),
    );

    withSyncPerfMeasurements('parseSourceAST()', () =>
      parseSourceAST(
        locationKeyToHookSourceAndMetadata,
        locationKeyToHookParsedMetadata,
      ),
    );

    return withSyncPerfMeasurements('findHookNames()', () =>
      findHookNames(hooksList, locationKeyToHookParsedMetadata),
    );
  });
}

function findHookNames(
  hooksList: HooksList,
  locationKeyToHookParsedMetadata: LocationKeyToHookParsedMetadata,
): HookNames {
  const map: HookNames = new Map();

  hooksList.map(hook => {
    // We already guard against a null HookSource in parseHookNames()
    const hookSource = hook.hookSource as any as HookSource;
    const fileName = hookSource.fileName;
    if (!fileName) {
      return null; // Should not be reachable.
    }

    const locationKey = getHookSourceLocationKey(hookSource);
    const hookParsedMetadata = locationKeyToHookParsedMetadata.get(locationKey);
    if (!hookParsedMetadata) {
      return null; // Should not be reachable.
    }

    const {lineNumber, columnNumber} = hookSource;
    if (!lineNumber || !columnNumber) {
      return null; // Should not be reachable.
    }

    const {
      originalSourceURL,
      originalSourceColumnNumber,
      originalSourceLineNumber,
    } = hookParsedMetadata;

    if (
      originalSourceLineNumber == null ||
      originalSourceColumnNumber == null ||
      originalSourceURL == null
    ) {
      return null; // Should not be reachable.
    }

    let name;
    const {metadataConsumer} = hookParsedMetadata;
    if (metadataConsumer != null) {
      name = withSyncPerfMeasurements('metadataConsumer.hookNameFor()', () =>
        metadataConsumer.hookNameFor({
          line: originalSourceLineNumber,
          column: originalSourceColumnNumber,
          source: originalSourceURL,
        }),
      );
    }

    if (name == null) {
      name = withSyncPerfMeasurements('getHookName()', () =>
        getHookName(
          hook,
          hookParsedMetadata.originalSourceAST,
          hookParsedMetadata.originalSourceCode as any as string,
          originalSourceLineNumber as any as number,
          originalSourceColumnNumber,
        ),
      );
    }

    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      console.log(`findHookNames() Found name "${name || '-'}"`);
    }

    const key = getHookSourceLocationKey(hookSource);
    map.set(key, name);
  });

  return map;
}

function initializeHookParsedMetadata(
  locationKeyToHookSourceAndMetadata: LocationKeyToHookSourceAndMetadata,
) {
  // Create map of unique source locations (file names plus line and column numbers) to metadata about hooks.
  const locationKeyToHookParsedMetadata: LocationKeyToHookParsedMetadata =
    new Map();
  locationKeyToHookSourceAndMetadata.forEach(
    (hookSourceAndMetadata, locationKey) => {
      const hookParsedMetadata: HookParsedMetadata = {
        metadataConsumer: null,
        originalSourceAST: null,
        originalSourceCode: null,
        originalSourceURL: null,
        originalSourceLineNumber: null,
        originalSourceColumnNumber: null,
        sourceMapConsumer: null,
      };

      locationKeyToHookParsedMetadata.set(locationKey, hookParsedMetadata);
    },
  );

  return locationKeyToHookParsedMetadata;
}

function parseSourceAST(
  locationKeyToHookSourceAndMetadata: LocationKeyToHookSourceAndMetadata,
  locationKeyToHookParsedMetadata: LocationKeyToHookParsedMetadata,
): void {
  locationKeyToHookSourceAndMetadata.forEach(
    (hookSourceAndMetadata, locationKey) => {
      const hookParsedMetadata =
        locationKeyToHookParsedMetadata.get(locationKey);
      if (hookParsedMetadata == null) {
        throw Error(`Expected to find HookParsedMetadata for "${locationKey}"`);
      }

      if (hookParsedMetadata.originalSourceAST !== null) {
        // Use cached metadata.
        return;
      }

      if (
        hookParsedMetadata.originalSourceURL != null &&
        hookParsedMetadata.originalSourceCode != null &&
        hookParsedMetadata.originalSourceColumnNumber != null &&
        hookParsedMetadata.originalSourceLineNumber != null
      ) {
        // Use cached metadata.
        return;
      }

      const {lineNumber, columnNumber} = hookSourceAndMetadata.hookSource;
      if (lineNumber == null || columnNumber == null) {
        throw Error('Hook source code location not found.');
      }

      const {metadataConsumer, sourceMapConsumer} = hookParsedMetadata;
      const runtimeSourceCode =
        hookSourceAndMetadata.runtimeSourceCode as any as string;
      let hasHookMap = false;
      let originalSourceURL;
      let originalSourceCode;
      let originalSourceColumnNumber;
      let originalSourceLineNumber;
      if (areSourceMapsAppliedToErrors() || sourceMapConsumer === null) {
        // Either the current environment automatically applies source maps to errors,
        // or the current code had no source map to begin with.
        // Either way, we don't need to convert the Error stack frame locations.
        originalSourceColumnNumber = columnNumber;
        originalSourceLineNumber = lineNumber;
        // There's no source map to parse here so we can just parse the original source itself.
        originalSourceCode = runtimeSourceCode;
        // TODO (named hooks) This mixes runtimeSourceURLs with source mapped URLs in the same cache key space.
        // Namespace them?
        originalSourceURL = hookSourceAndMetadata.runtimeSourceURL;
      } else {
        const {column, line, sourceContent, sourceURL} =
          sourceMapConsumer.originalPositionFor({
            columnNumber,
            lineNumber,
          });
        if (sourceContent === null || sourceURL === null) {
          throw Error(
            `Could not find original source for line:${lineNumber} and column:${columnNumber}`,
          );
        }

        originalSourceColumnNumber = column;
        originalSourceLineNumber = line;
        originalSourceCode = sourceContent;
        originalSourceURL = sourceURL;
      }

      hookParsedMetadata.originalSourceCode = originalSourceCode;
      hookParsedMetadata.originalSourceURL = originalSourceURL;
      hookParsedMetadata.originalSourceLineNumber = originalSourceLineNumber;
      hookParsedMetadata.originalSourceColumnNumber =
        originalSourceColumnNumber;

      if (
        metadataConsumer != null &&
        metadataConsumer.hasHookMap(originalSourceURL)
      ) {
        hasHookMap = true;
      }

      // $FlowFixMe[constant-condition]
      if (__DEBUG__) {
        console.log(
          `parseSourceAST() mapped line ${lineNumber}->${originalSourceLineNumber} and column ${columnNumber}->${originalSourceColumnNumber}`,
        );
      }

      if (hasHookMap) {
        // $FlowFixMe[constant-condition]
        if (__DEBUG__) {
          console.log(
            `parseSourceAST() Found hookMap and skipping parsing for "${originalSourceURL}"`,
          );
        }
        // If there's a hook map present from an extended sourcemap then
        // we don't need to parse the source files and instead can use the
        // hook map to extract hook names.
        return;
      }

      // $FlowFixMe[constant-condition]
      if (__DEBUG__) {
        console.log(
          `parseSourceAST() Did not find hook map for "${originalSourceURL}"`,
        );
      }

      // The cache also serves to deduplicate parsing by URL in our loop over location keys.
      // This may need to change if we switch to async parsing.
      const sourceMetadata = originalURLToMetadataCache.get(originalSourceURL);
      if (sourceMetadata != null) {
        // $FlowFixMe[constant-condition]
        if (__DEBUG__) {
          console.groupCollapsed(
            `parseSourceAST() Found cached source metadata for "${originalSourceURL}"`,
          );
          console.log(sourceMetadata);
          console.groupEnd();
        }
        hookParsedMetadata.originalSourceAST = sourceMetadata.originalSourceAST;
        hookParsedMetadata.originalSourceCode =
          sourceMetadata.originalSourceCode;
      } else {
        try {
          // TypeScript is the most commonly used typed JS variant so let's default to it
          // unless we detect explicit Flow usage via the "@flow" pragma.
          const plugin =
            originalSourceCode.indexOf('@flow') > 0 ? 'flow' : 'typescript';

          // TODO (named hooks) This is probably where we should check max source length,
          // rather than in loadSourceAndMetadata -> loadSourceFiles().
          // TODO(#22319): Support source files that are html files with inline script tags.
          const originalSourceAST = withSyncPerfMeasurements(
            '[@babel/parser] parse(originalSourceCode)',
            () =>
              parse(originalSourceCode, {
                sourceType: 'unambiguous',
                plugins: ['jsx', plugin],
              }),
          );
          hookParsedMetadata.originalSourceAST = originalSourceAST;

          // $FlowFixMe[constant-condition]
          if (__DEBUG__) {
            console.log(
              `parseSourceAST() Caching source metadata for "${originalSourceURL}"`,
            );
          }

          originalURLToMetadataCache.set(originalSourceURL, {
            originalSourceAST,
            originalSourceCode,
          });
        } catch (error) {
          throw new Error(
            `Failed to parse source file: ${originalSourceURL}\n\n` +
              `Original error: ${error}`,
          );
        }
      }
    },
  );
}

function parseSourceMaps(
  locationKeyToHookSourceAndMetadata: LocationKeyToHookSourceAndMetadata,
  locationKeyToHookParsedMetadata: LocationKeyToHookParsedMetadata,
) {
  locationKeyToHookSourceAndMetadata.forEach(
    (hookSourceAndMetadata, locationKey) => {
      const hookParsedMetadata =
        locationKeyToHookParsedMetadata.get(locationKey);
      if (hookParsedMetadata == null) {
        throw Error(`Expected to find HookParsedMetadata for "${locationKey}"`);
      }

      const {runtimeSourceURL, sourceMapJSON} = hookSourceAndMetadata;

      // If we've already loaded the source map info for this file,
      // we can skip reloading it (and more importantly, re-parsing it).
      const runtimeMetadata = runtimeURLToMetadataCache.get(runtimeSourceURL);
      if (runtimeMetadata != null) {
        // $FlowFixMe[constant-condition]
        if (__DEBUG__) {
          console.groupCollapsed(
            `parseHookNames() Found cached runtime metadata for file "${runtimeSourceURL}"`,
          );
          console.log(runtimeMetadata);
          console.groupEnd();
        }

        hookParsedMetadata.metadataConsumer = runtimeMetadata.metadataConsumer;
        hookParsedMetadata.sourceMapConsumer =
          runtimeMetadata.sourceMapConsumer;
      } else {
        if (sourceMapJSON != null) {
          const sourceMapConsumer = withSyncPerfMeasurements(
            'new SourceMapConsumer(sourceMapJSON)',
            () => SourceMapConsumer(sourceMapJSON),
          );

          const metadataConsumer = withSyncPerfMeasurements(
            'new SourceMapMetadataConsumer(sourceMapJSON)',
            () => new SourceMapMetadataConsumer(sourceMapJSON),
          );

          hookParsedMetadata.metadataConsumer = metadataConsumer;
          hookParsedMetadata.sourceMapConsumer = sourceMapConsumer;

          // Only set once to avoid triggering eviction/cleanup code.
          runtimeURLToMetadataCache.set(runtimeSourceURL, {
            metadataConsumer: metadataConsumer,
            sourceMapConsumer: sourceMapConsumer,
          });
        }
      }
    },
  );
}

export function purgeCachedMetadata(): void {
  originalURLToMetadataCache.reset();
  runtimeURLToMetadataCache.reset();
}
