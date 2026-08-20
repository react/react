/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {Position} from './astUtils';
import type {
  ReactSourceMetadata,
  IndexSourceMap,
  BasicSourceMap,
  MixedSourceMap,
} from './SourceMapTypes';
import type {HookMap} from './generateHookMap';
import * as util from 'source-map-js/lib/util';
import {decodeHookMap} from './generateHookMap';
import {getHookNameForLocation} from './getHookNameForLocation';

type MetadataMap = Map<string, ?ReactSourceMetadata>;

const HOOK_MAP_INDEX_IN_REACT_METADATA = 0;
const REACT_METADATA_INDEX_IN_FB_METADATA = 1;
const REACT_SOURCES_EXTENSION_KEY = 'x_react_sources';
const FB_SOURCES_EXTENSION_KEY = 'x_facebook_sources';

/**
 * Extracted from the logic in source-map-js@0.6.2's SourceMapConsumer.
 * By default, source names are normalized using the same logic that the `source-map-js@0.6.2` package uses internally.
 * This is crucial for keeping the sources list in sync with a `SourceMapConsumer` instance.
 */
function normalizeSourcePath(
  sourceInput: string,
  map: {+sourceRoot?: ?string, ...},
): string {
  const {sourceRoot} = map;
  let source = sourceInput;

  source = String(source);
  // Some source maps produce relative source paths like "./foo.js" instead of
  // "foo.js".  Normalize these first so that future comparisons will succeed.
  // See bugzil.la/1090768.
  source = util.normalize(source);
  // Always ensure that absolute sources are internally stored relative to
  // the source root, if the source root is absolute. Not doing this would
  // be particularly problematic when the source root is a prefix of the
  // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
  source =
    sourceRoot != null && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
      ? util.relative(sourceRoot, source)
      : source;
  return util.computeSourceURL(sourceRoot, source);
}

/**
 * Consumes the `x_react_sources` or  `x_facebook_sources` metadata field from a
 * source map and exposes ways to query the React DevTools specific metadata
 * included in those fields.
 */
export class SourceMapMetadataConsumer {
  _sourceMap: MixedSourceMap;
  _decodedHookMapCache: Map<string, HookMap>;
  _metadataBySource: ?MetadataMap;

  constructor(sourcemap: MixedSourceMap) {
    this._sourceMap = sourcemap;
    this._decodedHookMapCache = new Map();
    this._metadataBySource = null;
  }

  /**
   * Returns the Hook name assigned to a given location in the source code,
   * and a HookMap extracted from an extended source map.
   * See `getHookNameForLocation` for more details on implementation.
   *
   * When used with the `source-map` package, you'll first use
   * `SourceMapConsumer#originalPositionFor` to retrieve a source location,
   * then pass that location to `hookNameFor`.
   */
  hookNameFor({
    line,
    column,
    source,
  }: {
    ...Position,
    +source: ?string,
  }): ?string {
    if (source == null) {
      return null;
    }

    const hookMap = this._getHookMapForSource(source);
    if (hookMap == null) {
      return null;
    }

    return getHookNameForLocation({line, column}, hookMap);
  }

  hasHookMap(source: ?string): boolean {
    if (source == null) {
      return false;
    }
    return this._getHookMapForSource(source) != null;
  }

  /**
   * Prepares and caches a lookup table of metadata by source name.
   */
  _getMetadataBySource(): MetadataMap {
    if (this._metadataBySource == null) {
      this._metadataBySource = this._getMetadataObjectsBySourceNames(
        this._sourceMap,
      );
    }

    return this._metadataBySource;
  }

  /**
   * Collects source metadata from the given map using the current source name
   * normalization function. Handles both index maps (with sections) and plain
   * maps.
   *
   * NOTE: If any sources are repeated in the map (which shouldn't usually happen,
   * but is technically possible because of index maps) we only keep the
   * metadata from the last occurrence of any given source.
   */
  _getMetadataObjectsBySourceNames(sourcemap: MixedSourceMap): MetadataMap {
    if (sourcemap.mappings === undefined) {
      const indexSourceMap: IndexSourceMap = sourcemap;
      const metadataMap = new Map<string, ?ReactSourceMetadata>();
      indexSourceMap.sections.forEach(section => {
        const metadataMapForIndexMap = this._getMetadataObjectsBySourceNames(
          section.map,
        );
        metadataMapForIndexMap.forEach((value, key) => {
          metadataMap.set(key, value);
        });
      });
      return metadataMap;
    }

    const metadataMap: MetadataMap = new Map();
    const basicMap: BasicSourceMap = sourcemap;
    const updateMap = (metadata: ReactSourceMetadata, sourceIndex: number) => {
      let source = basicMap.sources[sourceIndex];
      if (source != null) {
        source = normalizeSourcePath(source, basicMap);
        metadataMap.set(source, metadata);
      }
    };

    if (
      sourcemap.hasOwnProperty(REACT_SOURCES_EXTENSION_KEY) &&
      sourcemap[REACT_SOURCES_EXTENSION_KEY] != null
    ) {
      const reactMetadataArray = sourcemap[REACT_SOURCES_EXTENSION_KEY];
      reactMetadataArray.filter(Boolean).forEach(updateMap);
    } else if (
      sourcemap.hasOwnProperty(FB_SOURCES_EXTENSION_KEY) &&
      sourcemap[FB_SOURCES_EXTENSION_KEY] != null
    ) {
      const fbMetadataArray = sourcemap[FB_SOURCES_EXTENSION_KEY];
      if (fbMetadataArray != null) {
        fbMetadataArray.forEach((fbMetadata, sourceIndex) => {
          // When extending source maps with React metadata using the
          // x_facebook_sources field, the position at index 1 on the
          // metadata tuple is reserved for React metadata
          const reactMetadata =
            fbMetadata != null
              ? fbMetadata[REACT_METADATA_INDEX_IN_FB_METADATA]
              : null;
          if (reactMetadata != null) {
            updateMap(reactMetadata, sourceIndex);
          }
        });
      }
    }

    return metadataMap;
  }

  /**
   * Decodes the function name mappings for the given source if needed, and
   * retrieves a sorted, searchable array of mappings.
   */
  _getHookMapForSource(source: string): ?HookMap {
    if (this._decodedHookMapCache.has(source)) {
      return this._decodedHookMapCache.get(source);
    }
    let hookMap = null;
    const metadataBySource = this._getMetadataBySource();
    const normalized = normalizeSourcePath(source, this._sourceMap);
    const metadata = metadataBySource.get(normalized);
    if (metadata != null) {
      const encodedHookMap = metadata[HOOK_MAP_INDEX_IN_REACT_METADATA];
      hookMap = encodedHookMap != null ? decodeHookMap(encodedHookMap) : null;
    }
    if (hookMap != null) {
      this._decodedHookMapCache.set(source, hookMap);
    }
    return hookMap;
  }
}
