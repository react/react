/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useContext, useEffect, useRef} from 'react';

import WhatChanged from './WhatChanged';
import {ProfilerContext} from './ProfilerContext';
import {formatDuration, formatTime} from './utils';
import {StoreContext} from '../context';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import InspectedElementBadges from '../Components/InspectedElementBadges';

import styles from './SidebarSelectedFiberInfo.css';

export default function SidebarSelectedFiberInfo(): React.Node {
  const {profilerStore} = useContext(StoreContext);
  const {
    rootID,
    selectCommitIndex,
    selectedCommitIndex,
    selectedFiberID,
    selectedFiberName,
    selectFiber,
  } = useContext(ProfilerContext);
  const {profilingCache} = profilerStore;
  const selectedListItemRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const selectedElement = selectedListItemRef.current;
    if (
      selectedElement !== null &&
      // $FlowFixMe[method-unbinding]
      typeof selectedElement.scrollIntoView === 'function'
    ) {
      selectedElement.scrollIntoView({block: 'nearest', inline: 'nearest'});
    }
  }, [selectedCommitIndex]);

  if (
    selectedFiberID === null ||
    rootID === null ||
    selectedCommitIndex === null
  ) {
    return null;
  }

  const commitIndices = profilingCache.getFiberCommits({
    fiberID: selectedFiberID,
    rootID: rootID,
  });

  const {nodes} = profilingCache.getCommitTree({
    rootID,
    commitIndex: selectedCommitIndex,
  });
  const node = nodes.get(selectedFiberID);

  // $FlowFixMe[missing-local-annot]
  const handleKeyDown = event => {
    switch (event.key) {
      case 'ArrowUp':
        // $FlowFixMe[invalid-compare]
        if (selectedCommitIndex !== null) {
          const prevIndex = commitIndices.indexOf(selectedCommitIndex);
          const nextIndex =
            prevIndex > 0 ? prevIndex - 1 : commitIndices.length - 1;
          selectCommitIndex(commitIndices[nextIndex]);
        }
        event.preventDefault();
        break;
      case 'ArrowDown':
        // $FlowFixMe[invalid-compare]
        if (selectedCommitIndex !== null) {
          const prevIndex = commitIndices.indexOf(selectedCommitIndex);
          const nextIndex =
            prevIndex < commitIndices.length - 1 ? prevIndex + 1 : 0;
          selectCommitIndex(commitIndices[nextIndex]);
        }
        event.preventDefault();
        break;
      default:
        break;
    }
  };

  const listItems = [];
  let i = 0;
  for (i = 0; i < commitIndices.length; i++) {
    const commitIndex = commitIndices[i];

    const {duration, timestamp} = profilerStore.getCommitData(
      rootID as any as number,
      commitIndex,
    );

    listItems.push(
      <button
        key={commitIndex}
        ref={selectedCommitIndex === commitIndex ? selectedListItemRef : null}
        className={
          selectedCommitIndex === commitIndex
            ? styles.CurrentCommit
            : styles.Commit
        }
        onClick={() => selectCommitIndex(commitIndex)}>
        {formatTime(timestamp)}s for {formatDuration(duration)}ms
      </button>,
    );
  }

  return (
    <Fragment>
      <div className={styles.Toolbar}>
        <div className={styles.Component}>
          {selectedFiberName || 'Selected component'}
        </div>

        <Button
          onClick={() => selectFiber(null, null)}
          title="Back to commit view">
          <ButtonIcon type="close" />
        </Button>
      </div>
      <div className={styles.Content}>
        <div className={styles.RenderInfo}>
          <div className={styles.RenderInfoContent}>
            {node != null && (
              <InspectedElementBadges
                hocDisplayNames={node.hocDisplayNames}
                compiledWithForget={node.compiledWithForget}
              />
            )}
            <WhatChanged fiberID={selectedFiberID as any as number} />
          </div>
        </div>
        <div className={styles.CommitList} onKeyDown={handleKeyDown}>
          {listItems.length > 0 && (
            <div>
              <label className={styles.Label}>Rendered at: </label>
              {listItems}
            </div>
          )}
          {listItems.length === 0 && (
            <div>
              Did not render on the client during this profiling session.
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
}
