/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * Licensed under the MIT license in the LICENSE file.
 * @flow
 */

import useSymbolicatedSources from './Components/useSymbolicatedSources';
import type {SerializedAsyncInfo} from 'react-devtools-shared/src/frontend/types';
import type {ReactStackTrace} from 'shared/ReactTypes';

const emptyStack: ReactStackTrace = [];

export default function useInferredName(
  asyncInfo: SerializedAsyncInfo,
): string {
  const name = asyncInfo.awaited.name;
  const bestStack = asyncInfo.awaited.stack || asyncInfo.stack;
  const stack =
    (!name || name === 'Promise' || name === 'lazy') &&
    bestStack !== null &&
    bestStack.length > 1
      ? bestStack
      : emptyStack;
  const mapped = useSymbolicatedSources(stack);
  if (stack.length === 0) return name;
  let bestMatch = '';
  for (let index = 0; index < stack.length; index++) {
    const callSite = stack[index];
    const symbolicated = mapped.get(callSite);
    const functionName = symbolicated?.location[0] || callSite[0];
    if (symbolicated == null || !symbolicated.ignored)
      return bestMatch || functionName || name;
    bestMatch = functionName;
  }
  return name;
}
