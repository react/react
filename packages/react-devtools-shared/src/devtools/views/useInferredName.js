import {use, useContext, useDeferredValue} from 'react';

import type {ReactCallSite} from 'shared/ReactTypes';

import type {SourceMappedLocation} from 'react-devtools-shared/src/symbolicateSource';

import type {SerializedAsyncInfo} from 'react-devtools-shared/src/frontend/types';

import FetchFileWithCachingContext from './Components/FetchFileWithCachingContext';

import {symbolicateSourceWithCache} from 'react-devtools-shared/src/symbolicateSource';

export default function useInferredName(
  asyncInfo: SerializedAsyncInfo,
): string {
  const fetchFileWithCaching = useContext(FetchFileWithCachingContext);
  const name = asyncInfo.awaited.name;
  let inferNameFromStack = null;
  if (!name || name === 'Promise' || name === 'lazy') {
    // If all we have is a generic name, we can try to infer a better name from
    // the stack. We only do this if the stack has more than one frame since
    // otherwise it's likely to just be the name of the component which isn't better.
    const bestStack = asyncInfo.awaited.stack || asyncInfo.stack;
    if (bestStack !== null && bestStack.length > 1) {
      inferNameFromStack = bestStack;
    }
  }
  // Start by not source mapping and just taking the first name and upgrade to
  // the better name asynchronously if we find one. Most of the time it'll just be
  // the top of the stack.
  const shouldSourceMap = useDeferredValue(inferNameFromStack !== null, false);
  if (inferNameFromStack !== null) {
    if (shouldSourceMap) {
      let bestMatch = '';
      for (let i = 0; i < inferNameFromStack.length; i++) {
        const callSite: ReactCallSite = inferNameFromStack[i];
        const [virtualFunctionName, virtualURL, virtualLine, virtualColumn] =
          callSite;
        const symbolicatedCallSite: null | SourceMappedLocation =
          fetchFileWithCaching !== null
            ? use(
                symbolicateSourceWithCache(
                  fetchFileWithCaching,
                  virtualURL,
                  virtualLine,
                  virtualColumn,
                ),
              )
            : null;
        if (symbolicatedCallSite === null) {
          // If we can't source map, we treat it as first party code. We called whatever was
          // the previous callsite.
          if (bestMatch === '') {
            return virtualFunctionName || name;
          } else {
            return bestMatch;
          }
        } else if (!symbolicatedCallSite.ignored) {
          if (bestMatch === '') {
            // If we had no good stack frames for internal calls, just use the last
            // first party function name.
            return symbolicatedCallSite[0] || virtualFunctionName || name;
          } else {
            return bestMatch;
          }
        } else {
          // This line was ignore listed, it might be the one we called into from first party.
          bestMatch = symbolicatedCallSite[0] || virtualFunctionName;
        }
      }
      return name;
    } else {
      return inferNameFromStack[0][0];
    }
  } else {
    return name;
  }
}
