/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext, useEffect} from 'react';
import {BridgeContext, StoreContext} from '../context';
import {TreeDispatcherContext} from '../Components/TreeContext';
import {useScrollToHostInstance} from '../hooks';
import {
  SuspenseTreeDispatcherContext,
  SuspenseTreeStateContext,
} from './SuspenseTreeContext';
import styles from './SuspenseTimeline.css';
import SuspenseScrubber from './SuspenseScrubber';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import type {SuspenseNode} from '../../../frontend/types';

function SuspenseTimelineInput() {
  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);
  const treeDispatch = useContext(TreeDispatcherContext);
  const suspenseTreeDispatch = useContext(SuspenseTreeDispatcherContext);
  const scrollToHostInstance = useScrollToHostInstance();

  const {timeline, timelineIndex, hoveredTimelineIndex, playing, autoScroll} =
    useContext(SuspenseTreeStateContext);

  const min = 0;
  const max = timeline.length > 0 ? timeline.length - 1 : 0;

  function switchSuspenseNode(nextTimelineIndex: number) {
    const nextSelectedSuspenseID = timeline[nextTimelineIndex].id;
    treeDispatch({
      type: 'SELECT_ELEMENT_BY_ID',
      payload: nextSelectedSuspenseID,
    });
    suspenseTreeDispatch({
      type: 'SUSPENSE_SET_TIMELINE_INDEX',
      payload: nextTimelineIndex,
    });
  }

  function handleChange(pendingTimelineIndex: number) {
    switchSuspenseNode(pendingTimelineIndex);
  }

  function handleFocus() {
    switchSuspenseNode(timelineIndex);
  }

  function handleHoverSegment(hoveredIndex: number) {
    const nextSelectedSuspenseID = timeline[hoveredIndex].id;
    suspenseTreeDispatch({
      type: 'HOVER_TIMELINE_FOR_ID',
      payload: nextSelectedSuspenseID,
    });
  }
  function handleUnhoverSegment() {
    suspenseTreeDispatch({
      type: 'HOVER_TIMELINE_FOR_ID',
      payload: -1,
    });
  }

  function skipPrevious() {
    const nextSelectedSuspenseID = timeline[timelineIndex - 1].id;
    treeDispatch({
      type: 'SELECT_ELEMENT_BY_ID',
      payload: nextSelectedSuspenseID,
    });
    suspenseTreeDispatch({
      type: 'SUSPENSE_SKIP_TIMELINE_INDEX',
      payload: false,
    });
  }

  function skipForward() {
    const nextSelectedSuspenseID = timeline[timelineIndex + 1].id;
    treeDispatch({
      type: 'SELECT_ELEMENT_BY_ID',
      payload: nextSelectedSuspenseID,
    });
    suspenseTreeDispatch({
      type: 'SUSPENSE_SKIP_TIMELINE_INDEX',
      payload: true,
    });
  }

  function togglePlaying() {
    suspenseTreeDispatch({
      type: 'SUSPENSE_PLAY_PAUSE',
      payload: 'toggle',
    });
  }

  // TODO: useEffectEvent here once it's supported in all versions DevTools supports.
  // For now we just exclude it from deps since we don't lint those anyway.
  function changeTimelineIndex(newIndex: number) {
    const suspendedSetByRendererID = new Map<
      number,
      Array<SuspenseNode['id']>,
    >();
    // Unsuspend everything by default.
    // We might not encounter every renderer after the milestone e.g.
    // if we clicked at the end of the timeline.
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const rendererID of store.rootIDToRendererID.values()) {
      suspendedSetByRendererID.set(rendererID, []);
    }

    // Synchronize timeline index with what is resuspended.
    // We suspend everything after the current selection. The root isn't showing
    // anything suspended in the root. The step after that should have one less
    // thing suspended. I.e. the first suspense boundary should be unsuspended
    // when it's selected. This also lets you show everything in the last step.
    for (let i = timelineIndex + 1; i < timeline.length; i++) {
      const step = timeline[i];
      const {rendererID} = step;
      const suspendedSetForRendererID =
        suspendedSetByRendererID.get(rendererID);
      if (suspendedSetForRendererID === undefined) {
        throw new Error(
          `Should have initialized suspended set for renderer ID "${rendererID}" earlier. This is a bug in React DevTools.`,
        );
      }
      suspendedSetForRendererID.push(step.id);
    }

    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const [rendererID, suspendedSet] of suspendedSetByRendererID) {
      bridge.send('overrideSuspenseMilestone', {
        rendererID,
        suspendedSet,
      });
    }
  }

  useEffect(() => {
    changeTimelineIndex(timelineIndex);
  }, [timelineIndex]);

  useEffect(() => {
    if (autoScroll.id > 0) {
      const scrollToId = autoScroll.id;
      // Consume the scroll ref so that we only trigger this scroll once.
      autoScroll.id = 0;
      scrollToHostInstance(scrollToId);
    }
  }, [autoScroll]);

  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    // While playing, advance one step every second.
    const PLAY_SPEED_INTERVAL = 1000;
    const timer = setInterval(() => {
      suspenseTreeDispatch({
        type: 'SUSPENSE_PLAY_TICK',
      });
    }, PLAY_SPEED_INTERVAL);
    return () => {
      clearInterval(timer);
    };
  }, [playing]);

  if (timeline.length === 0) {
    return (
      <div className={styles.SuspenseTimelineInput}>
        Root contains no Suspense nodes.
      </div>
    );
  }

  return (
    <>
      <Button
        disabled={timelineIndex === 0}
        title={'Previous'}
        onClick={skipPrevious}>
        <ButtonIcon type={'skip-previous'} />
      </Button>
      <Button
        disabled={max === 0 && !playing}
        title={playing ? 'Pause' : 'Play'}
        onClick={togglePlaying}>
        <ButtonIcon type={playing ? 'pause' : 'play'} />
      </Button>
      <Button
        disabled={timelineIndex === max}
        title={'Next'}
        onClick={skipForward}>
        <ButtonIcon type={'skip-next'} />
      </Button>
      <div className={styles.SuspenseTimelineInput}>
        <SuspenseScrubber
          min={min}
          max={max}
          timeline={timeline}
          value={timelineIndex}
          highlight={hoveredTimelineIndex}
          onChange={handleChange}
          onFocus={handleFocus}
          onHoverSegment={handleHoverSegment}
          onHoverLeave={handleUnhoverSegment}
        />
      </div>
    </>
  );
}

export default function SuspenseTimeline(): React$Node {
  return (
    <div className={styles.SuspenseTimelineContainer}>
      <SuspenseTimelineInput />
    </div>
  );
}
