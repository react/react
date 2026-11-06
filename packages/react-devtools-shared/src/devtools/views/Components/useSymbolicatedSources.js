/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {useContext, useEffect, useState, useSyncExternalStore} from 'react';
import FetchFileWithCachingContext from './FetchFileWithCachingContext';
import {TreeStateContext} from './TreeContext';
import {
  symbolicateSourceWithCache,
  subscribeSourceCacheVersion,
  getSourceCacheVersion,
} from 'react-devtools-shared/src/symbolicateSource';
import type {SourceMappedLocation} from 'react-devtools-shared/src/symbolicateSource';
import type {ReactCallSite} from 'shared/ReactTypes';
import type {FetchFileWithCaching} from './FetchFileWithCachingContext';

export type MappedSources = Map<ReactCallSite, SourceMappedLocation>;
const emptySources: MappedSources = new Map();
type Result = {
  sources: Array<ReactCallSite>,
  fetchFile: FetchFileWithCaching,
  inspectedElementID: number,
  version: number,
  values: MappedSources,
};

// One subscription per stack group. Raw frames render immediately; coalesce
// successful resolutions so long stacks do not repaint once per frame.
export default function useSymbolicatedSources(
  sources: Array<ReactCallSite>,
): MappedSources {
  const fetchFile = useContext(FetchFileWithCachingContext);
  const {inspectedElementID} = useContext(TreeStateContext);
  const version = useSyncExternalStore(
    subscribeSourceCacheVersion,
    getSourceCacheVersion,
    getSourceCacheVersion,
  );
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    let current = true;
    let timer = null;
    const values: MappedSources = new Map();
    if (fetchFile !== null && inspectedElementID !== null) {
      for (let index = 0; index < sources.length; index++) {
        const source = sources[index];
        const [, url, line, column] = source;
        if (!url || url.startsWith('<anonymous')) continue;
        symbolicateSourceWithCache(fetchFile, url, line, column).then(value => {
          // Overflow and failures keep the raw frame without another render.
          if (!current || value === null) return;
          values.set(source, value);
          if (timer === null) {
            timer = setTimeout(() => {
              timer = null;
              if (current)
                setResult({
                  sources,
                  fetchFile,
                  inspectedElementID,
                  version,
                  values: new Map(values),
                });
            }, 16);
          }
        });
      }
    }
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [sources, fetchFile, inspectedElementID, version]);
  return result !== null &&
    result.sources === sources &&
    result.fetchFile === fetchFile &&
    result.inspectedElementID === inspectedElementID &&
    result.version === version
    ? result.values
    : emptySources;
}
