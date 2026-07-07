/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Interaction, Point} from './view-base';
import type {ReactEventInfo, TimelineData, ViewState} from './types';

import * as React from 'react';
import {
  Fragment,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import {
  HorizontalPanAndZoomView,
  ResizableView,
  VerticalScrollOverflowView,
  Surface,
  VerticalScrollView,
  View,
  useCanvasInteraction,
  verticallyStackedLayout,
  zeroPoint,
} from './view-base';
import {
  ComponentMeasuresView,
  FlamechartView,
  NativeEventsView,
  NetworkMeasuresView,
  ReactMeasuresView,
  SchedulingEventsView,
  SnapshotsView,
  SuspenseEventsView,
  ThrownErrorsView,
  TimeAxisMarkersView,
  UserTimingMarksView,
} from './content-views';
import {COLORS} from './content-views/constants';
import {clampState, moveStateToRange} from './view-base/utils/scrollState';
import EventTooltip from './EventTooltip';
import {MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL} from './view-base/constants';
import {TimelineSearchContext} from './TimelineSearchContext';
import {TimelineContext} from './TimelineContext';
import CanvasPageContextMenu from './CanvasPageContextMenu';

import type {ContextMenuRef} from 'react-devtools-shared/src/devtools/ContextMenu/types';

import styles from './CanvasPage.css';

type Props = {
  profilerData: TimelineData,
  viewState: ViewState,
};

function CanvasPage({profilerData, viewState}: Props): React.Node {
  return (
    <div
      className={styles.CanvasPage}
      style={{backgroundColor: COLORS.BACKGROUND}}>
      <AutoSizer>
        {({height, width}: {height: number, width: number}) => (
          <AutoSizedCanvas
            data={profilerData}
            height={height}
            viewState={viewState}
            width={width}
          />
        )}
      </AutoSizer>
    </div>
  );
}

const EMPTY_CONTEXT_INFO: ReactEventInfo = {
  componentMeasure: null,
  flamechartStackFrame: null,
  measure: null,
  nativeEvent: null,
  networkMeasure: null,
  schedulingEvent: null,
  snapshot: null,
  suspenseEvent: null,
  thrownError: null,
  userTimingMark: null,
};

type AutoSizedCanvasProps = {
  data: TimelineData,
  height: number,
  viewState: ViewState,
  width: number,
};

function AutoSizedCanvas({
  data,
  height,
  viewState,
  width,
}: AutoSizedCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mouseLocation, setMouseLocation] = useState<Point>(zeroPoint); // DOM coordinates
  const [hoveredEvent, setHoveredEvent] = useState<ReactEventInfo | null>(null);
  const [lastHoveredEvent, setLastHoveredEvent] =
    useState<ReactEventInfo | null>(null);

  const contextMenuRef: ContextMenuRef = useRef(null);

  const resetHoveredEvent = useCallback(
    () => setHoveredEvent(EMPTY_CONTEXT_INFO),
    [],
  );
  const updateHoveredEvent = useCallback(
    (event: ReactEventInfo) => {
      setHoveredEvent(event);

      // If menu is already open, don't update the hovered event data
      // So the same set of menu items is preserved until the current context menu is closed
      if (contextMenuRef.current?.isShown()) {
        return;
      }

      const {
        componentMeasure,
        flamechartStackFrame,
        measure,
        networkMeasure,
        schedulingEvent,
        suspenseEvent,
      } = event;

      // We have to keep track of last non-empty hovered event, since this will be the input for context menu items
      // We can't just pass hoveredEvent to ContextMenuContainer,
      // since it will be reset each time user moves mouse away from event object on the canvas
      if (
        componentMeasure != null ||
        flamechartStackFrame != null ||
        measure != null ||
        networkMeasure != null ||
        schedulingEvent != null ||
        suspenseEvent != null
      ) {
        setLastHoveredEvent(event);
      }
    },
    [contextMenuRef],
  );

  const {searchIndex, searchRegExp, searchResults} = useContext(
    TimelineSearchContext,
  );

  // This effect searches timeline data and scrolls to the next match wen search criteria change.
  useLayoutEffect(() => {
    viewState.updateSearchRegExpState(searchRegExp);

    const componentMeasureSearchResult =
      searchResults.length > 0 ? searchResults[searchIndex] : null;
    if (componentMeasureSearchResult != null) {
      const scrollState = moveStateToRange({
        state: viewState.horizontalScrollState,
        rangeStart: componentMeasureSearchResult.timestamp,
        rangeEnd:
          componentMeasureSearchResult.timestamp +
          componentMeasureSearchResult.duration,
        contentLength: data.duration,
        minContentLength: data.duration * MIN_ZOOM_LEVEL,
        maxContentLength: data.duration * MAX_ZOOM_LEVEL,
        containerLength: width,
      });

      viewState.updateHorizontalScrollState(scrollState);
    }

    surfaceRef.current.displayIfNeeded();
  }, [searchIndex, searchRegExp, searchResults, viewState]);

  const surfaceRef = useRef(new Surface(resetHoveredEvent));
  const userTimingMarksViewRef = useRef<null | UserTimingMarksView>(null);
  const nativeEventsViewRef = useRef<null | NativeEventsView>(null);
  const schedulingEventsViewRef = useRef<null | SchedulingEventsView>(null);
  const suspenseEventsViewRef = useRef<null | SuspenseEventsView>(null);
  const componentMeasuresViewRef = useRef<null | ComponentMeasuresView>(null);
  const reactMeasuresViewRef = useRef<null | ReactMeasuresView>(null);
  const flamechartViewRef = useRef<null | FlamechartView>(null);
  const networkMeasuresViewRef = useRef<null | NetworkMeasuresView>(null);
  const snapshotsViewRef = useRef<null | SnapshotsView>(null);
  const thrownErrorsViewRef = useRef<null | ThrownErrorsView>(null);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const defaultFrame = {origin: zeroPoint, size: {width, height}};

    // Auto hide context menu when panning.
    viewState.onHorizontalScrollStateChange(scrollState => {
      contextMenuRef.current?.hide();
    });

    // Initialize horizontal view state
    viewState.updateHorizontalScrollState(
      clampState({
        state: viewState.horizontalScrollState,
        minContentLength: data.duration * MIN_ZOOM_LEVEL,
        maxContentLength: data.duration * MAX_ZOOM_LEVEL,
        containerLength: defaultFrame.size.width,
      }),
    );

    function createViewHelper(
      view: View,
      label: string,
      shouldScrollVertically: boolean = false,
      shouldResizeVertically: boolean = false,
    ): View {
      let verticalScrollView = null;
      if (shouldScrollVertically) {
        verticalScrollView = new VerticalScrollView(
          surface,
          defaultFrame,
          view,
          viewState,
          label,
        );
      }

      const horizontalPanAndZoomView = new HorizontalPanAndZoomView(
        surface,
        defaultFrame,
        verticalScrollView !== null ? verticalScrollView : view,
        data.duration,
        viewState,
      );

      let resizableView = null;
      if (shouldResizeVertically) {
        resizableView = new ResizableView(
          surface,
          defaultFrame,
          horizontalPanAndZoomView,
          viewState,
          canvasRef,
          label,
        );
      }

      return resizableView || horizontalPanAndZoomView;
    }

    const axisMarkersView = new TimeAxisMarkersView(
      surface,
      defaultFrame,
      data.duration,
    );
    const axisMarkersViewWrapper = createViewHelper(axisMarkersView, 'time');

    let userTimingMarksViewWrapper = null;
    if (data.otherUserTimingMarks.length > 0) {
      const userTimingMarksView = new UserTimingMarksView(
        surface,
        defaultFrame,
        data.otherUserTimingMarks,
        data.duration,
      );
      userTimingMarksViewRef.current = userTimingMarksView;
      userTimingMarksViewWrapper = createViewHelper(
        userTimingMarksView,
        'user timing api',
      );
    }

    let nativeEventsViewWrapper = null;
    if (data.nativeEvents.length > 0) {
      const nativeEventsView = new NativeEventsView(
        surface,
        defaultFrame,
        data,
      );
      nativeEventsViewRef.current = nativeEventsView;
      nativeEventsViewWrapper = createViewHelper(
        nativeEventsView,
        'events',
        true,
        true,
      );
    }

    let thrownErrorsViewWrapper = null;
    if (data.thrownErrors.length > 0) {
      const thrownErrorsView = new ThrownErrorsView(
        surface,
        defaultFrame,
        data,
      );
      thrownErrorsViewRef.current = thrownErrorsView;
      thrownErrorsViewWrapper = createViewHelper(
        thrownErrorsView,
        'thrown errors',
      );
    }

    let schedulingEventsViewWrapper = null;
    if (data.schedulingEvents.length > 0) {
      const schedulingEventsView = new SchedulingEventsView(
        surface,
        defaultFrame,
        data,
      );
      schedulingEventsViewRef.current = schedulingEventsView;
      schedulingEventsViewWrapper = createViewHelper(
        schedulingEventsView,
        'react updates',
      );
    }

    let suspenseEventsViewWrapper = null;
    if (data.suspenseEvents.length > 0) {
      const suspenseEventsView = new SuspenseEventsView(
        surface,
        defaultFrame,
        data,
      );
      suspenseEventsViewRef.current = suspenseEventsView;
      suspenseEventsViewWrapper = createViewHelper(
        suspenseEventsView,
        'suspense',
        true,
        true,
      );
    }

    const reactMeasuresView = new ReactMeasuresView(
      surface,
      defaultFrame,
      data,
    );
    reactMeasuresViewRef.current = reactMeasuresView;
    const reactMeasuresViewWrapper = createViewHelper(
      reactMeasuresView,
      'react scheduling',
      true,
      true,
    );

    let componentMeasuresViewWrapper = null;
    if (data.componentMeasures.length > 0) {
      const componentMeasuresView = new ComponentMeasuresView(
        surface,
        defaultFrame,
        data,
        viewState,
      );
      componentMeasuresViewRef.current = componentMeasuresView;
      componentMeasuresViewWrapper = createViewHelper(
        componentMeasuresView,
        'react components',
      );
    }

    let snapshotsViewWrapper = null;
    if (data.snapshots.length > 0) {
      const snapshotsView = new SnapshotsView(surface, defaultFrame, data);
      snapshotsViewRef.current = snapshotsView;
      snapshotsViewWrapper = createViewHelper(
        snapshotsView,
        'snapshots',
        true,
        true,
      );
    }

    let networkMeasuresViewWrapper = null;
    if (data.snapshots.length > 0) {
      const networkMeasuresView = new NetworkMeasuresView(
        surface,
        defaultFrame,
        data,
      );
      networkMeasuresViewRef.current = networkMeasuresView;
      networkMeasuresViewWrapper = createViewHelper(
        networkMeasuresView,
        'network',
        true,
        true,
      );
    }

    let flamechartViewWrapper = null;
    if (data.flamechart.length > 0) {
      const flamechartView = new FlamechartView(
        surface,
        defaultFrame,
        data.flamechart,
        data.internalModuleSourceToRanges,
        data.duration,
      );
      flamechartViewRef.current = flamechartView;
      flamechartViewWrapper = createViewHelper(
        flamechartView,
        'flamechart',
        true,
        true,
      );
    }

    // Root view contains all of the sub views defined above.
    // The order we add them below determines their vertical position.
    const rootView = new View(
      surface,
      defaultFrame,
      verticallyStackedLayout,
      defaultFrame,
      COLORS.BACKGROUND,
    );
    rootView.addSubview(axisMarkersViewWrapper);
    if (userTimingMarksViewWrapper !== null) {
      rootView.addSubview(userTimingMarksViewWrapper);
    }
    if (nativeEventsViewWrapper !== null) {
      rootView.addSubview(nativeEventsViewWrapper);
    }
    if (schedulingEventsViewWrapper !== null) {
      rootView.addSubview(schedulingEventsViewWrapper);
    }
    if (thrownErrorsViewWrapper !== null) {
      rootView.addSubview(thrownErrorsViewWrapper);
    }
    if (suspenseEventsViewWrapper !== null) {
      rootView.addSubview(suspenseEventsViewWrapper);
    }
    // $FlowFixMe[invalid-compare]
    if (reactMeasuresViewWrapper !== null) {
      rootView.addSubview(reactMeasuresViewWrapper);
    }
    if (componentMeasuresViewWrapper !== null) {
      rootView.addSubview(componentMeasuresViewWrapper);
    }
    if (snapshotsViewWrapper !== null) {
      rootView.addSubview(snapshotsViewWrapper);
    }
    if (networkMeasuresViewWrapper !== null) {
      rootView.addSubview(networkMeasuresViewWrapper);
    }
    if (flamechartViewWrapper !== null) {
      rootView.addSubview(flamechartViewWrapper);
    }

    const verticalScrollOverflowView = new VerticalScrollOverflowView(
      surface,
      defaultFrame,
      rootView,
      viewState,
    );

    surfaceRef.current.rootView = verticalScrollOverflowView;
  }, [data]);

  useLayoutEffect(() => {
    if (canvasRef.current) {
      surfaceRef.current.setCanvas(canvasRef.current, {width, height});
    }
  }, [width, height]);

  const interactor = useCallback((interaction: Interaction) => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }

    const surface = surfaceRef.current;
    surface.handleInteraction(interaction);

    // Flush any display work that got queued up as part of the previous interaction.
    // Typically there should be no work, but certain interactions may need a second pass.
    // For example, the ResizableView may collapse/expand its contents,
    // which requires a second layout pass for an ancestor VerticalScrollOverflowView.
    //
    // TODO It would be nice to remove this call for performance reasons.
    // To do that, we'll need to address the UX bug with VerticalScrollOverflowView.
    // For more info see: https://github.com/facebook/react/pull/22005#issuecomment-896953399
    surface.displayIfNeeded();

    canvas.style.cursor = surface.getCurrentCursor() || 'default';

    // Defer drawing to canvas until React's commit phase, to avoid drawing
    // twice and to ensure that both the canvas and DOM elements managed by
    // React are in sync.
    setMouseLocation({
      x: interaction.payload.event.x,
      y: interaction.payload.event.y,
    });
  }, []);

  useCanvasInteraction(canvasRef, interactor);

  const {selectEvent} = useContext(TimelineContext);

  useEffect(() => {
    const {current: userTimingMarksView} = userTimingMarksViewRef;
    if (userTimingMarksView) {
      userTimingMarksView.onHover = userTimingMark => {
        if (!hoveredEvent || hoveredEvent.userTimingMark !== userTimingMark) {
          updateHoveredEvent({
            ...EMPTY_CONTEXT_INFO,
            userTimingMark,
          });
        }
      };
    }

    const {current: nativeEventsView} = nativeEventsViewRef;
    if (nativeEventsView) {
      nativeEventsView.onHover = nativeEvent => {
        if (!hoveredEvent || hoveredEvent.nativeEvent !== nativeEvent) {
          updateHoveredEvent({
            ...EMPTY_CONTEXT_INFO,
            nativeEvent,
          });
        }
      };
    }

    const {current: schedulingEventsView} = schedulingEventsViewRef;
    if (schedulingEventsView) {
      schedulingEventsView.onHover = schedulingEvent => {
        if (!hoveredEvent || hoveredEvent.schedulingEvent !== schedulingEvent) {
          updateHoveredEvent({
            ...EMPTY_CONTEXT_INFO,
            schedulingEvent,
          });
        }
      };
      schedulingEventsView.onClick = schedulingEvent => {
        selectEvent({
          ...EMPTY_CONTEXT_INFO,
          schedulingEvent,
        });
      };
    }

    const {current: suspenseEventsView} = suspenseEventsViewRef;
    if (suspenseEventsView) {
      suspenseEventsView.onHover = suspenseEvent => {
        if (!hoveredEvent || hoveredEvent.suspenseEvent !== suspenseEvent) {
          updateHoveredEvent({
            ...EMPTY_CONTEXT_INFO,
            suspenseEvent,
          });
        }
      };
    }

    const {current: reactMeasuresView} = reactMeasuresViewRef;
    if (reactMeasuresView) {
      reactMeasuresView.onHover = measure => {
        if (!hoveredEvent || hoveredEvent.measure !== measure) {
          updateHoveredEvent({
            ...EMPTY_CONTEXT_INFO,
            measure,
          });
        }
      };
    }

    const {current: componentMeasuresView} = componentMeasuresViewRef;
    if (componentMeasuresView) {
      componentMeasuresView.onHover = componentMeasure => {
        if (
          !hoveredEvent ||
          hoveredEvent.componentMeasure !== componentMeasure
        ) {
          updateHoveredEvent({
            ...EMPTY_CONTEXT_INFO,
            componentMeasure,
          });
        }
      };
    }

    const {current: snapshotsView} = snapshotsViewRef;
    if (snapshotsView) {
      snapshotsView.onHover = snapshot => {
        if (!hoveredEvent || hoveredEvent.snapshot !== snapshot) {
          updateHoveredEvent({
            ...EMPTY_CONTEXT_INFO,
            snapshot,
          });
        }
      };
    }

    const {current: flamechartView} = flamechartViewRef;
    if (flamechartView) {
      flamechartView.setOnHover(flamechartStackFrame => {
        if (
          !hoveredEvent ||
          hoveredEvent.flamechartStackFrame !== flamechartStackFrame
        ) {
          updateHoveredEvent({
            ...EMPTY_CONTEXT_INFO,
            flamechartStackFrame,
          });
        }
      });
    }

    const {current: networkMeasuresView} = networkMeasuresViewRef;
    if (networkMeasuresView) {
      networkMeasuresView.onHover = networkMeasure => {
        if (!hoveredEvent || hoveredEvent.networkMeasure !== networkMeasure) {
          updateHoveredEvent({
            ...EMPTY_CONTEXT_INFO,
            networkMeasure,
          });
        }
      };
    }

    const {current: thrownErrorsView} = thrownErrorsViewRef;
    if (thrownErrorsView) {
      thrownErrorsView.onHover = thrownError => {
        if (!hoveredEvent || hoveredEvent.thrownError !== thrownError) {
          updateHoveredEvent({
            ...EMPTY_CONTEXT_INFO,
            thrownError,
          });
        }
      };
    }
  }, [
    hoveredEvent,
    data, // Attach onHover callbacks when views are re-created on data change
  ]);

  useLayoutEffect(() => {
    const userTimingMarksView = userTimingMarksViewRef.current;
    if (userTimingMarksView) {
      userTimingMarksView.setHoveredMark(
        hoveredEvent ? hoveredEvent.userTimingMark : null,
      );
    }

    const nativeEventsView = nativeEventsViewRef.current;
    if (nativeEventsView) {
      nativeEventsView.setHoveredEvent(
        hoveredEvent ? hoveredEvent.nativeEvent : null,
      );
    }

    const schedulingEventsView = schedulingEventsViewRef.current;
    if (schedulingEventsView) {
      schedulingEventsView.setHoveredEvent(
        hoveredEvent ? hoveredEvent.schedulingEvent : null,
      );
    }

    const suspenseEventsView = suspenseEventsViewRef.current;
    if (suspenseEventsView) {
      suspenseEventsView.setHoveredEvent(
        hoveredEvent ? hoveredEvent.suspenseEvent : null,
      );
    }

    const reactMeasuresView = reactMeasuresViewRef.current;
    if (reactMeasuresView) {
      reactMeasuresView.setHoveredMeasure(
        hoveredEvent ? hoveredEvent.measure : null,
      );
    }

    const flamechartView = flamechartViewRef.current;
    if (flamechartView) {
      flamechartView.setHoveredFlamechartStackFrame(
        hoveredEvent ? hoveredEvent.flamechartStackFrame : null,
      );
    }

    const networkMeasuresView = networkMeasuresViewRef.current;
    if (networkMeasuresView) {
      networkMeasuresView.setHoveredEvent(
        hoveredEvent ? hoveredEvent.networkMeasure : null,
      );
    }
  }, [hoveredEvent]);

  // Draw to canvas in React's commit phase
  useLayoutEffect(() => {
    surfaceRef.current.displayIfNeeded();
  });

  return (
    <Fragment>
      <canvas ref={canvasRef} height={height} width={width} />

      <CanvasPageContextMenu
        canvasRef={canvasRef}
        hoveredEvent={lastHoveredEvent}
        timelineData={data}
        viewState={viewState}
        canvasWidth={width}
        closedMenuStub={
          !surfaceRef.current.hasActiveView() ? (
            <EventTooltip
              canvasRef={canvasRef}
              data={data}
              height={height}
              hoveredEvent={hoveredEvent}
              origin={mouseLocation}
              width={width}
            />
          ) : null
        }
        ref={contextMenuRef}
      />
    </Fragment>
  );
}

export default CanvasPage;
