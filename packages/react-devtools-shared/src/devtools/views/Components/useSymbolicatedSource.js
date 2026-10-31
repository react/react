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
import type {ReactFunctionLocation} from 'shared/ReactTypes';
import type {FetchFileWithCaching} from './FetchFileWithCachingContext';
type Result = {
  fetchFile: FetchFileWithCaching,
  inspectedElementID: number,
  sourceURL: string,
  line: number,
  column: number,
  version: number,
  value: SourceMappedLocation | null,
};

// Render the original frame immediately. Start enrichment after commit, without
// suspending the owner list; ignore completions from a previous selection.
export default function useSymbolicatedSource(
  source: ReactFunctionLocation | null,
  priority: boolean = false,
): SourceMappedLocation | null {
  const fetchFile = useContext(FetchFileWithCachingContext);
  const {inspectedElementID} = useContext(TreeStateContext);
  const sourceURL = source === null ? null : source[1];
  const line = source === null ? null : source[2];
  const column = source === null ? null : source[3];
  const version = useSyncExternalStore(
    subscribeSourceCacheVersion,
    getSourceCacheVersion,
    getSourceCacheVersion,
  );
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    let current = true;
    if (
      fetchFile !== null &&
      sourceURL !== null &&
      line !== null &&
      column !== null &&
      inspectedElementID !== null
    ) {
      symbolicateSourceWithCache(
        fetchFile,
        sourceURL,
        line,
        column,
        priority,
      ).then(value => {
        // The raw frame is already visible. Overflow/failure must not repaint it.
        if (current && value !== null)
          setResult({
            fetchFile,
            inspectedElementID,
            sourceURL,
            line,
            column,
            version,
            value,
          });
      });
    }
    return () => {
      current = false;
    };
  }, [
    fetchFile,
    inspectedElementID,
    sourceURL,
    line,
    column,
    version,
    priority,
  ]);
  return result !== null &&
    result.version === version &&
    result.fetchFile === fetchFile &&
    result.inspectedElementID === inspectedElementID &&
    result.sourceURL === sourceURL &&
    result.line === line &&
    result.column === column
    ? result.value
    : null;
}
