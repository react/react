/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useMemo, useState} from 'react';
import type {ReactStackTrace} from 'shared/ReactTypes';
import SourceMappedStackContext from './SourceMappedStackContext';
import useSymbolicatedSources from './useSymbolicatedSources';
import {IgnoreListToggleButton} from './StackTraceView';

type Props = {
  stacks: Array<ReactStackTrace | null>,
  children: (showIgnoreList: boolean) => React.Node,
};

export default function StackTraceGroup({stacks, children}: Props): React.Node {
  const [showIgnoreList, setShowIgnoreList] = useState(false);
  const sources = useMemo(() => stacks.flatMap(stack => stack || []), [stacks]);
  const mapped = useSymbolicatedSources(sources);
  const hasIgnoredFrames = Array.from(mapped.values()).some(
    value => value.ignored,
  );
  return (
    <SourceMappedStackContext.Provider value={mapped}>
      {children(showIgnoreList)}
      {hasIgnoredFrames && (
        <IgnoreListToggleButton
          onClick={() => setShowIgnoreList(previous => !previous)}
          showIgnoreList={showIgnoreList}
        />
      )}
    </SourceMappedStackContext.Provider>
  );
}
