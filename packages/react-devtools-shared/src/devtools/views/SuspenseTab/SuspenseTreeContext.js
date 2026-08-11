/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {ReactContext} from 'shared/ReactTypes';
import type {
  SuspenseNode,
  SuspenseTimelineStep,
} from 'react-devtools-shared/src/frontend/types';
import type Store from '../../store';

import * as React from 'react';
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import {StoreContext} from '../context';

export type SuspenseTreeState = {
  lineage: $ReadOnlyArray<SuspenseNode['id']> | null,
  roots: $ReadOnlyArray<SuspenseNode['id']>,
  selectedSuspenseID: SuspenseNode['id'] | null,
  timeline: $ReadOnlyArray<SuspenseTimelineStep>,
  timelineIndex: number | -1,
  hoveredTimelineIndex: number | -1,
  uniqueSuspendersOnly: boolean,
  playing: boolean,
  autoSelect: boolean,
  autoScroll: {id: number}, // Ref that's set to 0 after scrolling once.
};

type ACTION_SUSPENSE_TREE_MUTATION = {
  type: 'HANDLE_SUSPENSE_TREE_MUTATION',
  payload: [Map<SuspenseNode['id'], SuspenseNode['id']>],
};
type ACTION_SET_SUSPENSE_LINEAGE = {
  type: 'SET_SUSPENSE_LINEAGE',
  payload: SuspenseNode['id'],
};
type ACTION_SELECT_SUSPENSE_BY_ID = {
  type: 'SELECT_SUSPENSE_BY_ID',
  payload: SuspenseNode['id'],
};
type ACTION_SET_SUSPENSE_TIMELINE = {
  type: 'SET_SUSPENSE_TIMELINE',
  payload: [
    $ReadOnlyArray<SuspenseTimelineStep>,
    // The next Suspense ID to select in the timeline
    SuspenseNode['id'] | null,
    // Whether this timeline includes only unique suspenders
    boolean,
  ],
};
type ACTION_SUSPENSE_SET_TIMELINE_INDEX = {
  type: 'SUSPENSE_SET_TIMELINE_INDEX',
  payload: number,
};
type ACTION_SUSPENSE_SKIP_TIMELINE_INDEX = {
  type: 'SUSPENSE_SKIP_TIMELINE_INDEX',
  payload: boolean,
};
type ACTION_SUSPENSE_PLAY_PAUSE = {
  type: 'SUSPENSE_PLAY_PAUSE',
  payload: 'toggle' | 'play' | 'pause',
};
type ACTION_SUSPENSE_PLAY_TICK = {
  type: 'SUSPENSE_PLAY_TICK',
};
type ACTION_TOGGLE_TIMELINE_FOR_ID = {
  type: 'TOGGLE_TIMELINE_FOR_ID',
  payload: SuspenseNode['id'],
};
type ACTION_HOVER_TIMELINE_FOR_ID = {
  type: 'HOVER_TIMELINE_FOR_ID',
  payload: SuspenseNode['id'],
};

export type SuspenseTreeAction =
  | ACTION_SUSPENSE_TREE_MUTATION
  | ACTION_SET_SUSPENSE_LINEAGE
  | ACTION_SELECT_SUSPENSE_BY_ID
  | ACTION_SET_SUSPENSE_TIMELINE
  | ACTION_SUSPENSE_SET_TIMELINE_INDEX
  | ACTION_SUSPENSE_SKIP_TIMELINE_INDEX
  | ACTION_SUSPENSE_PLAY_PAUSE
  | ACTION_SUSPENSE_PLAY_TICK
  | ACTION_TOGGLE_TIMELINE_FOR_ID
  | ACTION_HOVER_TIMELINE_FOR_ID;
export type SuspenseTreeDispatch = (action: SuspenseTreeAction) => void;

const SuspenseTreeStateContext: ReactContext<SuspenseTreeState> =
  createContext<SuspenseTreeState>(null as any as SuspenseTreeState);
SuspenseTreeStateContext.displayName = 'SuspenseTreeStateContext';

const SuspenseTreeDispatcherContext: ReactContext<SuspenseTreeDispatch> =
  createContext<SuspenseTreeDispatch>(null as any as SuspenseTreeDispatch);
SuspenseTreeDispatcherContext.displayName = 'SuspenseTreeDispatcherContext';

type Props = {
  children: React$Node,
};

function getInitialState(store: Store): SuspenseTreeState {
  const uniqueSuspendersOnly = true;
  const timeline =
    store.getEndTimeOrDocumentOrderSuspense(uniqueSuspendersOnly);
  const timelineIndex = timeline.length - 1;
  const selectedSuspenseID =
    timelineIndex === -1 ? null : timeline[timelineIndex].id;
  const lineage =
    selectedSuspenseID !== null
      ? store.getSuspenseLineage(selectedSuspenseID)
      : [];
  const initialState: SuspenseTreeState = {
    selectedSuspenseID,
    lineage,
    roots: store.roots,
    timeline,
    timelineIndex,
    hoveredTimelineIndex: -1,
    uniqueSuspendersOnly,
    playing: false,
    autoSelect: true,
    autoScroll: {id: 0}, // Don't auto-scroll initially
  };

  return initialState;
}

function SuspenseTreeContextController({children}: Props): React.Node {
  const store = useContext(StoreContext);
  // This reducer is created inline because it needs access to the Store.
  // The store is mutable, but the Store itself is global and lives for the lifetime of the DevTools,
  // so it's okay for the reducer to have an empty dependencies array.
  const reducer = useMemo(
    () =>
      (
        state: SuspenseTreeState,
        action: SuspenseTreeAction,
      ): SuspenseTreeState => {
        switch (action.type) {
          case 'HANDLE_SUSPENSE_TREE_MUTATION': {
            let {selectedSuspenseID} = state;
            // If the currently-selected Element has been removed from the tree, update selection state.
            const removedIDs = action.payload[0];
            // Find the closest parent that wasn't removed during this batch.
            // We deduce the parent-child mapping from removedIDs (id -> parentID)
            // because by now it's too late to read them from the store.

            while (
              selectedSuspenseID !== null &&
              removedIDs.has(selectedSuspenseID)
            ) {
              // $FlowExpectedError[incompatible-type]
              selectedSuspenseID = removedIDs.get(selectedSuspenseID);
            }
            if (selectedSuspenseID === 0) {
              // The whole root was removed.
              selectedSuspenseID = null;
            }

            const selectedTimelineStep =
              // $FlowFixMe[invalid-compare]
              state.timeline === null || state.timelineIndex === -1
                ? null
                : state.timeline[state.timelineIndex];
            let selectedTimelineID: null | number = null;
            if (selectedTimelineStep !== null) {
              selectedTimelineID = selectedTimelineStep.id;
              // $FlowFixMe[incompatible-type]
              while (removedIDs.has(selectedTimelineID)) {
                // $FlowFixMe[incompatible-type]
                selectedTimelineID = removedIDs.get(selectedTimelineID);
              }
            }

            // TODO: Handle different timeline modes (e.g. random order)
            const nextTimeline = store.getEndTimeOrDocumentOrderSuspense(
              state.uniqueSuspendersOnly,
            );

            let nextTimelineIndex = -1;
            if (selectedTimelineID !== null && nextTimeline.length !== 0) {
              for (let i = 0; i < nextTimeline.length; i++) {
                if (nextTimeline[i].id === selectedTimelineID) {
                  nextTimelineIndex = i;
                  break;
                }
              }
            }
            if (
              nextTimeline.length > 0 &&
              (nextTimelineIndex === -1 || state.autoSelect)
            ) {
              nextTimelineIndex = nextTimeline.length - 1;
              selectedSuspenseID = nextTimeline[nextTimelineIndex].id;
            }

            if (selectedSuspenseID === null && nextTimeline.length > 0) {
              selectedSuspenseID = nextTimeline[nextTimeline.length - 1].id;
            }

            const nextLineage =
              selectedSuspenseID !== null &&
              state.selectedSuspenseID !== selectedSuspenseID
                ? store.getSuspenseLineage(selectedSuspenseID)
                : state.lineage;

            return {
              ...state,
              lineage: nextLineage,
              roots: store.roots,
              selectedSuspenseID,
              timeline: nextTimeline,
              timelineIndex: nextTimelineIndex,
            };
          }
          case 'SELECT_SUSPENSE_BY_ID': {
            const selectedSuspenseID = action.payload;

            return {
              ...state,
              selectedSuspenseID,
              playing: false, // pause
              autoSelect: false,
              autoScroll: {id: selectedSuspenseID}, // scroll
            };
          }
          case 'SET_SUSPENSE_LINEAGE': {
            const suspenseID = action.payload;
            const lineage = store.getSuspenseLineage(suspenseID);

            return {
              ...state,
              lineage,
              selectedSuspenseID: suspenseID,
              playing: false, // pause
              autoSelect: false,
            };
          }
          case 'SET_SUSPENSE_TIMELINE': {
            const previousMilestoneIndex = state.timelineIndex;
            const previousTimeline = state.timeline;
            const nextTimeline = action.payload[0];
            const nextRootID: SuspenseNode['id'] | null = action.payload[1];
            const nextUniqueSuspendersOnly = action.payload[2];
            let nextLineage = state.lineage;
            let nextMilestoneIndex: number | -1 = -1;
            let nextSelectedSuspenseID = state.selectedSuspenseID;
            // Action has indicated it has no preference for the selected Node.
            // Try to reconcile the new timeline with the previous index.
            if (
              nextRootID === null &&
              // $FlowFixMe[invalid-compare]
              previousTimeline !== null &&
              // $FlowFixMe[invalid-compare]
              previousMilestoneIndex !== null
            ) {
              const previousMilestoneID =
                previousTimeline[previousMilestoneIndex];
              nextMilestoneIndex = nextTimeline.indexOf(previousMilestoneID);
              if (nextMilestoneIndex === -1 && nextTimeline.length > 0) {
                nextMilestoneIndex = nextTimeline.length - 1;
                nextSelectedSuspenseID = nextTimeline[nextMilestoneIndex].id;
                nextLineage = store.getSuspenseLineage(nextSelectedSuspenseID);
              }
            } else if (nextRootID !== null) {
              nextMilestoneIndex = nextTimeline.length - 1;
              nextSelectedSuspenseID = nextTimeline[nextMilestoneIndex].id;
              nextLineage = store.getSuspenseLineage(nextSelectedSuspenseID);
            }

            return {
              ...state,
              selectedSuspenseID: nextSelectedSuspenseID,
              lineage: nextLineage,
              timeline: nextTimeline,
              timelineIndex: nextMilestoneIndex,
              uniqueSuspendersOnly: nextUniqueSuspendersOnly,
            };
          }
          case 'SUSPENSE_SET_TIMELINE_INDEX': {
            const nextTimelineIndex = action.payload;
            const nextSelectedSuspenseID = state.timeline[nextTimelineIndex].id;
            const nextLineage = store.getSuspenseLineage(
              nextSelectedSuspenseID,
            );

            return {
              ...state,
              lineage: nextLineage,
              selectedSuspenseID: nextSelectedSuspenseID,
              timelineIndex: nextTimelineIndex,
              playing: false, // pause
              autoSelect: false,
              autoScroll: {id: nextSelectedSuspenseID}, // scroll
            };
          }
          case 'SUSPENSE_SKIP_TIMELINE_INDEX': {
            const direction = action.payload;
            const nextTimelineIndex =
              state.timelineIndex + (direction ? 1 : -1);
            if (
              nextTimelineIndex < 0 ||
              nextTimelineIndex > state.timeline.length - 1
            ) {
              return state;
            }
            const nextSelectedSuspenseID = state.timeline[nextTimelineIndex].id;
            const nextLineage = store.getSuspenseLineage(
              nextSelectedSuspenseID,
            );
            return {
              ...state,
              lineage: nextLineage,
              selectedSuspenseID: nextSelectedSuspenseID,
              timelineIndex: nextTimelineIndex,
              playing: false, // pause
              autoSelect: false,
              autoScroll: {id: nextSelectedSuspenseID}, // scroll
            };
          }
          case 'SUSPENSE_PLAY_PAUSE': {
            const mode = action.payload;

            let nextTimelineIndex = state.timelineIndex;
            let nextSelectedSuspenseID = state.selectedSuspenseID;
            let nextLineage = state.lineage;

            if (
              !state.playing &&
              mode !== 'pause' &&
              nextTimelineIndex === state.timeline.length - 1
            ) {
              // If we're restarting at the end. Then loop around and start again from the beginning.
              nextTimelineIndex = 0;
              nextSelectedSuspenseID = state.timeline[nextTimelineIndex].id;
              nextLineage = store.getSuspenseLineage(nextSelectedSuspenseID);
            }

            return {
              ...state,
              lineage: nextLineage,
              selectedSuspenseID: nextSelectedSuspenseID,
              timelineIndex: nextTimelineIndex,
              playing: mode === 'toggle' ? !state.playing : mode === 'play',
              autoSelect: false,
            };
          }
          case 'SUSPENSE_PLAY_TICK': {
            if (!state.playing) {
              // We stopped but haven't yet cleaned up the callback. Noop.
              return state;
            }
            // Advance time
            const nextTimelineIndex = state.timelineIndex + 1;
            if (nextTimelineIndex > state.timeline.length - 1) {
              return state;
            }
            const nextSelectedSuspenseID = state.timeline[nextTimelineIndex].id;
            const nextLineage = store.getSuspenseLineage(
              nextSelectedSuspenseID,
            );
            // Stop once we reach the end.
            const nextPlaying = nextTimelineIndex < state.timeline.length - 1;
            return {
              ...state,
              lineage: nextLineage,
              selectedSuspenseID: nextSelectedSuspenseID,
              timelineIndex: nextTimelineIndex,
              playing: nextPlaying,
              autoScroll: {id: nextSelectedSuspenseID}, // scroll
            };
          }
          case 'TOGGLE_TIMELINE_FOR_ID': {
            const suspenseID = action.payload;

            let timelineIndexForSuspenseID = -1;
            for (let i = 0; i < state.timeline.length; i++) {
              if (state.timeline[i].id === suspenseID) {
                timelineIndexForSuspenseID = i;
                break;
              }
            }
            if (timelineIndexForSuspenseID === -1) {
              // This boundary is no longer in the timeline.
              return state;
            }
            const nextTimelineIndex =
              timelineIndexForSuspenseID === 0
                ? // For roots, there's no toggling. It's always just jump to beginning.
                  0
                : // For boundaries, we'll either jump to before or after its reveal depending
                  // on if we're currently displaying it or not according to the timeline.
                  state.timelineIndex < timelineIndexForSuspenseID
                  ? // We're currently before this suspense boundary has been revealed so we
                    // should jump ahead to reveal it.
                    timelineIndexForSuspenseID
                  : // Otherwise, if we're currently showing it, jump to right before to hide it.
                    timelineIndexForSuspenseID - 1;
            const nextSelectedSuspenseID = state.timeline[nextTimelineIndex].id;
            const nextLineage = store.getSuspenseLineage(
              nextSelectedSuspenseID,
            );
            return {
              ...state,
              lineage: nextLineage,
              selectedSuspenseID: nextSelectedSuspenseID,
              timelineIndex: nextTimelineIndex,
              playing: false, // pause
              autoSelect: false,
              autoScroll: {id: nextSelectedSuspenseID},
            };
          }
          case 'HOVER_TIMELINE_FOR_ID': {
            const suspenseID = action.payload;
            let timelineIndexForSuspenseID = -1;
            for (let i = 0; i < state.timeline.length; i++) {
              if (state.timeline[i].id === suspenseID) {
                timelineIndexForSuspenseID = i;
                break;
              }
            }
            return {
              ...state,
              hoveredTimelineIndex: timelineIndexForSuspenseID,
            };
          }
          default:
            throw new Error(`Unrecognized action "${action.type}"`);
        }
      },
    [],
  );

  const [state, dispatch] = useReducer(reducer, store, getInitialState);

  const initialRevision = useMemo(() => store.revisionSuspense, [store]);
  // We're currently storing everything Suspense related in the same Store as
  // Components. However, most reads are currently stateless. This ensures
  // the latest state is always read from the Store.
  useEffect(() => {
    const handleSuspenseTreeMutated = ([removedElementIDs]: [
      Map<number, number>,
    ]) => {
      dispatch({
        type: 'HANDLE_SUSPENSE_TREE_MUTATION',
        payload: [removedElementIDs],
      });
    };

    // Since this is a passive effect, the tree may have been mutated before our initial subscription.
    if (store.revisionSuspense !== initialRevision) {
      // At the moment, we can treat this as a mutation.
      handleSuspenseTreeMutated([new Map()]);
    }

    store.addListener('suspenseTreeMutated', handleSuspenseTreeMutated);
    return () =>
      store.removeListener('suspenseTreeMutated', handleSuspenseTreeMutated);
  }, [initialRevision, store]);

  const transitionDispatch = useMemo(
    () => (action: SuspenseTreeAction) =>
      startTransition(() => {
        dispatch(action);
      }),
    [dispatch],
  );

  return (
    <SuspenseTreeStateContext.Provider value={state}>
      <SuspenseTreeDispatcherContext.Provider value={transitionDispatch}>
        {children}
      </SuspenseTreeDispatcherContext.Provider>
    </SuspenseTreeStateContext.Provider>
  );
}

export {
  SuspenseTreeDispatcherContext,
  SuspenseTreeStateContext,
  SuspenseTreeContextController,
};
