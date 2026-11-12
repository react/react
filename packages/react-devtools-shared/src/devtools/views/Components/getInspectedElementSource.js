/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {InspectedElement} from '../../../frontend/types';
import type {ReactFunctionLocation, ReactCallSite} from 'shared/ReactTypes';

export default function getInspectedElementSource(
  element: InspectedElement | null,
): {
  source: ReactFunctionLocation | ReactCallSite | null,
  elementID: number | null,
} {
  if (element?.source != null) {
    return {source: element.source, elementID: element.id};
  }
  // stack[0] is the component's creation site, not its function definition.
  return {source: element?.stack?.[0] ?? null, elementID: null};
}
