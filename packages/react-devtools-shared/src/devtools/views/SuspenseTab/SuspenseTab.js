/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import * as React from 'react';
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  Fragment,
} from 'react';

import {enableActivitySlices} from 'react-devtools-feature-flags';
import {
  localStorageGetItem,
  localStorageSetItem,
} from 'react-devtools-shared/src/storage';
import ButtonIcon, {type IconType} from '../ButtonIcon';
import InspectHostNodesToggle from '../Components/InspectHostNodesToggle';
import InspectedElementErrorBoundary from '../Components/InspectedElementErrorBoundary';
import InspectedElement from '../Components/InspectedElement';
import portaledContent from '../portaledContent';
import styles from './SuspenseTab.css';
import SuspenseBreadcrumbs from './SuspenseBreadcrumbs';
import SuspenseRects from './SuspenseRects';
import SuspenseTimeline from './SuspenseTimeline';
import ActivityList from './ActivityList';
import {
  SuspenseTreeDispatcherContext,
  SuspenseTreeStateContext,
} from './SuspenseTreeContext';
import {BridgeContext, StoreContext, OptionsContext} from '../context';
import Button from '../Button';
import Toggle from '../Toggle';
import typeof {SyntheticPointerEvent} from 'react-dom-bindings/src/events/SyntheticEvent';
import SettingsModal from 'react-devtools-shared/src/devtools/views/Settings/SettingsModal';
import SettingsModalContextToggle from 'react-devtools-shared/src/devtools/views/Settings/SettingsModalContextToggle';
import {SettingsModalContextController} from 'react-devtools-shared/src/devtools/views/Settings/SettingsModalContext';
import {TreeStateContext} from '../Components/TreeContext';

type Orientation = 'horizontal' | 'vertical';

type LayoutActionType =
  | 'ACTION_SET_ACTIVITY_LIST_TOGGLE'
  | 'ACTION_SET_ACTIVITY_LIST_HORIZONTAL_FRACTION'
  | 'ACTION_SET_INSPECTED_ELEMENT_TOGGLE'
  | 'ACTION_SET_INSPECTED_ELEMENT_HORIZONTAL_FRACTION'
  | 'ACTION_SET_INSPECTED_ELEMENT_VERTICAL_FRACTION';
type LayoutAction = {
  type: LayoutActionType,
  payload: any,
};

type LayoutState = {
  activityListHidden: boolean,
  activityListHorizontalFraction: number,
  inspectedElementHidden: boolean,
  inspectedElementHorizontalFraction: number,
  inspectedElementVerticalFraction: number,
};
type LayoutDispatch = (action: LayoutAction) => void;

function ToggleUniqueSuspenders() {
  const store = useContext(StoreContext);
  const suspenseTreeDispatch = useContext(SuspenseTreeDispatcherContext);

  const {uniqueSuspendersOnly} = useContext(SuspenseTreeStateContext);

  function handleToggleUniqueSuspenders() {
    const nextUniqueSuspendersOnly = !uniqueSuspendersOnly;
    // TODO: Handle different timeline modes (e.g. random order)
    const nextTimeline = store.getEndTimeOrDocumentOrderSuspense(
      nextUniqueSuspendersOnly,
    );
    suspenseTreeDispatch({
      type: 'SET_SUSPENSE_TIMELINE',
      payload: [nextTimeline, null, nextUniqueSuspendersOnly],
    });
  }

  return (
    <Toggle
      isChecked={uniqueSuspendersOnly}
      onChange={handleToggleUniqueSuspenders}
      title={
        'Filter Suspense which does not suspend, or if the parent also suspend on the same.'
      }>
      <ButtonIcon type={uniqueSuspendersOnly ? 'filter-on' : 'filter-off'} />
    </Toggle>
  );
}

function ToggleActivityList({
  dispatch,
  state,
}: {
  dispatch: LayoutDispatch,
  state: LayoutState,
}) {
  return (
    <Button
      onClick={() =>
        dispatch({
          type: 'ACTION_SET_ACTIVITY_LIST_TOGGLE',
          payload: null,
        })
      }
      title={
        state.activityListHidden ? 'Show Activity List' : 'Hide Activity List'
      }>
      <ButtonIcon
        type={state.activityListHidden ? 'panel-left-open' : 'panel-left-close'}
      />
    </Button>
  );
}

function ToggleInspectedElement({
  dispatch,
  state,
  orientation,
}: {
  dispatch: LayoutDispatch,
  state: LayoutState,
  orientation: 'horizontal' | 'vertical',
}) {
  let iconType: IconType;
  if (orientation === 'horizontal') {
    iconType = state.inspectedElementHidden
      ? 'panel-right-open'
      : 'panel-right-close';
  } else {
    iconType = state.inspectedElementHidden
      ? 'panel-bottom-open'
      : 'panel-bottom-close';
  }
  return (
    <Button
      className={styles.ToggleInspectedElement}
      data-orientation={orientation}
      onClick={() =>
        dispatch({
          type: 'ACTION_SET_INSPECTED_ELEMENT_TOGGLE',
          payload: null,
        })
      }
      title={
        state.inspectedElementHidden
          ? 'Show Inspected Element'
          : 'Hide Inspected Element'
      }>
      <ButtonIcon type={iconType} />
    </Button>
  );
}

function SynchronizedScrollContainer({
  className,
  children,
  scaleRef,
}: {
  className?: string,
  children?: React.Node,
  scaleRef: {current: number},
}) {
  const bridge = useContext(BridgeContext);
  const ref = useRef(null);
  const applyingScrollRef = useRef(false);

  // TODO: useEffectEvent
  function scrollContainerTo({
    left,
    top,
    right,
    bottom,
  }: {
    left: number,
    top: number,
    right: number,
    bottom: number,
  }): void {
    const element = ref.current;
    if (element === null) {
      return;
    }
    const scale = scaleRef.current / element.clientWidth;
    const targetLeft = Math.round(left / scale);
    const targetTop = Math.round(top / scale);
    if (
      targetLeft !== Math.round(element.scrollLeft) ||
      targetTop !== Math.round(element.scrollTop)
    ) {
      // Disable scroll events until we've applied the new scroll position.
      applyingScrollRef.current = true;
      element.scrollTo({
        left: targetLeft,
        top: targetTop,
        behavior: 'smooth',
      });
    }
  }

  useEffect(() => {
    const callback = scrollContainerTo;
    bridge.addListener('scrollTo', callback);
    // Ask for the current scroll position when we mount so we can attach ourselves to it.
    bridge.send('requestScrollPosition');
    return () => bridge.removeListener('scrollTo', callback);
  }, [bridge]);

  const scrollTimer = useRef<null | TimeoutID>(null);

  // TODO: useEffectEvent
  function sendScroll() {
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
      scrollTimer.current = null;
    }
    if (applyingScrollRef.current) {
      return;
    }
    const element = ref.current;
    if (element === null) {
      return;
    }
    const scale = scaleRef.current / element.clientWidth;
    const left = element.scrollLeft * scale;
    const top = element.scrollTop * scale;
    const right = left + element.clientWidth * scale;
    const bottom = top + element.clientHeight * scale;
    bridge.send('scrollTo', {left, top, right, bottom});
  }

  // TODO: useEffectEvent
  function throttleScroll() {
    if (!scrollTimer.current) {
      // Periodically synchronize the scroll while scrolling.
      scrollTimer.current = setTimeout(sendScroll, 400);
    }
  }

  function scrollEnd() {
    // Upon scrollend send it immediately.
    sendScroll();
    applyingScrollRef.current = false;
  }

  useEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    const scrollCallback = throttleScroll;
    const scrollEndCallback = scrollEnd;
    element.addEventListener('scroll', scrollCallback);
    element.addEventListener('scrollend', scrollEndCallback);
    return () => {
      element.removeEventListener('scroll', scrollCallback);
      element.removeEventListener('scrollend', scrollEndCallback);
    };
  }, [ref]);

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}

function SuspenseTab(_: {}) {
  const store = useContext(StoreContext);
  const {hideSettings} = useContext(OptionsContext);
  const [state, dispatch] = useReducer<LayoutState, null, LayoutAction>(
    layoutReducer,
    null,
    initLayoutState,
  );

  const {activities} = useContext(TreeStateContext);
  // If there are no named Activity boundaries, we don't have any tree list and we should hide
  // both the panel and the button to toggle it.
  const activityListDisabled = !enableActivitySlices || activities.length === 0;

  const wrapperTreeRef = useRef<null | HTMLElement>(null);
  const resizeTreeRef = useRef<null | HTMLElement>(null);
  const resizeActivityListRef = useRef<null | HTMLElement>(null);

  // TODO: We'll show the recently inspected element in this tab when it should probably
  // switch to the nearest Suspense boundary when we switch into this tab.

  const {
    inspectedElementHidden,
    inspectedElementHorizontalFraction,
    inspectedElementVerticalFraction,
    activityListHidden,
    activityListHorizontalFraction,
  } = state;

  useLayoutEffect(() => {
    const wrapperElement = wrapperTreeRef.current;

    setResizeCSSVariable(
      wrapperElement,
      'tree',
      'horizontal',
      inspectedElementHorizontalFraction * 100,
    );
    setResizeCSSVariable(
      wrapperElement,
      'tree',
      'vertical',
      inspectedElementVerticalFraction * 100,
    );

    const resizeActivityListElement = resizeActivityListRef.current;
    setResizeCSSVariable(
      resizeActivityListElement,
      'activity-list',
      'horizontal',
      activityListHorizontalFraction * 100,
    );
  }, []);
  useEffect(() => {
    const timeoutID = setTimeout(() => {
      localStorageSetItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          inspectedElementHidden,
          inspectedElementHorizontalFraction,
          inspectedElementVerticalFraction,
          activityListHidden,
          activityListHorizontalFraction,
        }),
      );
    }, 500);

    return () => clearTimeout(timeoutID);
  }, [
    inspectedElementHidden,
    inspectedElementHorizontalFraction,
    inspectedElementVerticalFraction,
    activityListHidden,
    activityListHorizontalFraction,
  ]);

  const onResizeStart = (event: SyntheticPointerEvent) => {
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
  };

  const onResizeEnd = (event: SyntheticPointerEvent) => {
    const element = event.currentTarget;
    element.releasePointerCapture(event.pointerId);
  };

  const onResizeTree = (event: SyntheticPointerEvent) => {
    const element = event.currentTarget;
    const isResizing = element.hasPointerCapture(event.pointerId);
    if (!isResizing) {
      return;
    }

    const resizeElement = resizeTreeRef.current;
    const wrapperElement = wrapperTreeRef.current;

    if (wrapperElement === null || resizeElement === null) {
      return;
    }

    event.preventDefault();

    const orientation = getTreeOrientation(wrapperElement);

    const {height, width, left, top} = wrapperElement.getBoundingClientRect();

    const currentMousePosition =
      orientation === 'horizontal' ? event.clientX - left : event.clientY - top;

    const boundaryMin = MINIMUM_TREE_SIZE;
    const boundaryMax =
      orientation === 'horizontal'
        ? width - MINIMUM_TREE_SIZE
        : height - MINIMUM_TREE_SIZE;

    const isMousePositionInBounds =
      currentMousePosition > boundaryMin && currentMousePosition < boundaryMax;

    if (isMousePositionInBounds) {
      const resizedElementDimension =
        orientation === 'horizontal' ? width : height;
      const actionType =
        orientation === 'horizontal'
          ? 'ACTION_SET_INSPECTED_ELEMENT_HORIZONTAL_FRACTION'
          : 'ACTION_SET_INSPECTED_ELEMENT_VERTICAL_FRACTION';
      const fraction = currentMousePosition / resizedElementDimension;
      const percentage = fraction * 100;

      setResizeCSSVariable(wrapperElement, 'tree', orientation, percentage);

      dispatch({
        type: actionType,
        payload: fraction,
      });
    }
  };

  const onResizeActivityList = (event: SyntheticPointerEvent) => {
    const element = event.currentTarget;
    const isResizing = element.hasPointerCapture(event.pointerId);
    if (!isResizing) {
      return;
    }

    const resizeElement = resizeActivityListRef.current;
    const wrapperElement = resizeTreeRef.current;

    if (wrapperElement === null || resizeElement === null) {
      return;
    }

    event.preventDefault();

    const orientation = 'horizontal';

    const {height, width, left, top} = wrapperElement.getBoundingClientRect();

    const currentMousePosition =
      orientation === 'horizontal' ? event.clientX - left : event.clientY - top;

    const boundaryMin = MINIMUM_ACTIVITY_LIST_SIZE;
    const boundaryMax =
      orientation === 'horizontal'
        ? width - MINIMUM_ACTIVITY_LIST_SIZE
        : height - MINIMUM_ACTIVITY_LIST_SIZE;

    const isMousePositionInBounds =
      currentMousePosition > boundaryMin && currentMousePosition < boundaryMax;

    if (isMousePositionInBounds) {
      const resizedElementDimension =
        orientation === 'horizontal' ? width : height;
      const actionType = 'ACTION_SET_ACTIVITY_LIST_HORIZONTAL_FRACTION';
      const percentage = (currentMousePosition / resizedElementDimension) * 100;

      setResizeCSSVariable(
        resizeElement,
        'activity-list',
        orientation,
        percentage,
      );

      dispatch({
        type: actionType,
        payload: currentMousePosition / resizedElementDimension,
      });
    }
  };

  const scaleRef = useRef(0);

  return (
    <SettingsModalContextController>
      <div className={styles.SuspenseTab} ref={wrapperTreeRef}>
        <div className={styles.TreeWrapper} ref={resizeTreeRef}>
          {activityListDisabled ? null : (
            <div
              className={styles.ActivityList}
              hidden={activityListHidden}
              ref={resizeActivityListRef}>
              <ActivityList activities={activities} />
            </div>
          )}
          {activityListDisabled ? null : (
            <div
              className={styles.ResizeBarWrapper}
              hidden={activityListHidden}>
              <div
                onPointerDown={onResizeStart}
                onPointerMove={onResizeActivityList}
                onPointerUp={onResizeEnd}
                className={styles.ResizeBar}
              />
            </div>
          )}
          <div className={styles.TreeView}>
            <header className={styles.SuspenseTreeViewHeader}>
              {activityListDisabled ? (
                <div />
              ) : (
                <ToggleActivityList dispatch={dispatch} state={state} />
              )}
              {store.supportsClickToInspect && (
                <Fragment>
                  <InspectHostNodesToggle onlySuspenseNodes={true} />
                  <div className={styles.VRule} />
                </Fragment>
              )}
              <SuspenseBreadcrumbs />
              <div className={styles.VRule} />
              <ToggleUniqueSuspenders />
              {!hideSettings && <SettingsModalContextToggle />}
              <ToggleInspectedElement
                dispatch={dispatch}
                state={state}
                orientation="horizontal"
              />
            </header>
            <SynchronizedScrollContainer
              className={styles.Rects}
              scaleRef={scaleRef}>
              <SuspenseRects scaleRef={scaleRef} />
            </SynchronizedScrollContainer>
            <footer className={styles.SuspenseTreeViewFooter}>
              <SuspenseTimeline />
              <div className={styles.SuspenseTreeViewFooterButtons}>
                <ToggleInspectedElement
                  dispatch={dispatch}
                  state={state}
                  orientation="vertical"
                />
              </div>
            </footer>
          </div>
        </div>
        <div
          className={styles.ResizeBarWrapper}
          hidden={inspectedElementHidden}>
          <div
            onPointerDown={onResizeStart}
            onPointerMove={onResizeTree}
            onPointerUp={onResizeEnd}
            className={styles.ResizeBar}
          />
        </div>
        <div
          className={styles.InspectedElementWrapper}
          hidden={inspectedElementHidden}>
          <InspectedElementErrorBoundary>
            <InspectedElement
              fallbackEmpty={
                'No React element selected. Select a Suspense boundary in the minimap to inspect.'
              }
            />
          </InspectedElementErrorBoundary>
        </div>
        <SettingsModal />
      </div>
    </SettingsModalContextController>
  );
}

const LOCAL_STORAGE_KEY = 'React::DevTools::SuspenseTab::layout';
const VERTICAL_TREE_MODE_MAX_WIDTH = 600;
const MINIMUM_TREE_SIZE = 100;
const MINIMUM_ACTIVITY_LIST_SIZE = 100;

function layoutReducer(state: LayoutState, action: LayoutAction): LayoutState {
  switch (action.type) {
    case 'ACTION_SET_ACTIVITY_LIST_TOGGLE':
      return {
        ...state,
        activityListHidden: !state.activityListHidden,
      };
    case 'ACTION_SET_ACTIVITY_LIST_HORIZONTAL_FRACTION':
      return {
        ...state,
        activityListHorizontalFraction: action.payload,
      };
    case 'ACTION_SET_INSPECTED_ELEMENT_TOGGLE':
      return {
        ...state,
        inspectedElementHidden: !state.inspectedElementHidden,
      };
    case 'ACTION_SET_INSPECTED_ELEMENT_HORIZONTAL_FRACTION':
      return {
        ...state,
        inspectedElementHorizontalFraction: action.payload,
      };
    case 'ACTION_SET_INSPECTED_ELEMENT_VERTICAL_FRACTION':
      return {
        ...state,
        inspectedElementVerticalFraction: action.payload,
      };
    default:
      return state;
  }
}

function initLayoutState(): LayoutState {
  let inspectedElementHidden = false;
  let inspectedElementHorizontalFraction = 0.65;
  let inspectedElementVerticalFraction = 0.5;
  let activityListHidden = false;
  let activityListHorizontalFraction = 0.35;

  try {
    let data = localStorageGetItem(LOCAL_STORAGE_KEY);
    if (data != null) {
      data = JSON.parse(data);
      inspectedElementHidden = data.inspectedElementHidden;
      inspectedElementHorizontalFraction =
        data.inspectedElementHorizontalFraction;
      inspectedElementVerticalFraction = data.inspectedElementVerticalFraction;
      activityListHidden = data.activityListHidden;
      activityListHorizontalFraction = data.activityListHorizontalFraction;
    }
  } catch (error) {}

  return {
    inspectedElementHidden,
    inspectedElementHorizontalFraction,
    inspectedElementVerticalFraction,
    activityListHidden,
    activityListHorizontalFraction,
  };
}

function getTreeOrientation(
  wrapperElement: null | HTMLElement,
): null | Orientation {
  if (wrapperElement != null) {
    const {width} = wrapperElement.getBoundingClientRect();
    return width > VERTICAL_TREE_MODE_MAX_WIDTH ? 'horizontal' : 'vertical';
  }
  return null;
}

function setResizeCSSVariable(
  resizeElement: null | HTMLElement,
  name: 'tree' | 'activity-list',
  orientation: null | Orientation,
  percentage: number,
): void {
  if (resizeElement !== null && orientation !== null) {
    resizeElement.style.setProperty(
      `--${orientation}-resize-${name}-percentage`,
      `${percentage}%`,
    );
  }
}

export default portaledContent(SuspenseTab) as component();
