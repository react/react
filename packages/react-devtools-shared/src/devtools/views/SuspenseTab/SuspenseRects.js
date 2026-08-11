/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type Store from 'react-devtools-shared/src/devtools/store';
import type {
  Element,
  SuspenseNode,
  Rect,
} from 'react-devtools-shared/src/frontend/types';
import typeof {
  SyntheticMouseEvent,
  SyntheticPointerEvent,
} from 'react-dom-bindings/src/events/SyntheticEvent';

import * as React from 'react';
import {createContext, useContext, useLayoutEffect, useMemo} from 'react';
import {
  TreeDispatcherContext,
  TreeStateContext,
} from '../Components/TreeContext';
import {StoreContext} from '../context';
import {useHighlightHostInstance} from '../hooks';
import styles from './SuspenseRects.css';
import {
  SuspenseTreeStateContext,
  SuspenseTreeDispatcherContext,
} from './SuspenseTreeContext';
import {getClassNameForEnvironment} from './SuspenseEnvironmentColors.js';
import type RBush from 'rbush';

function ScaledRect({
  className,
  rect,
  visible,
  suspended,
  selected,
  hovered,
  adjust,
  ...props
}: {
  className: string,
  rect: Rect,
  visible: boolean,
  suspended: boolean,
  selected?: boolean,
  hovered?: boolean,
  adjust?: boolean,
  ...
}): React$Node {
  const viewBox = useContext(ViewBox);
  const width = (rect.width / viewBox.width) * 100 + '%';
  const height = (rect.height / viewBox.height) * 100 + '%';
  const x = ((rect.x - viewBox.x) / viewBox.width) * 100 + '%';
  const y = ((rect.y - viewBox.y) / viewBox.height) * 100 + '%';

  return (
    <div
      {...props}
      className={styles.SuspenseRectsScaledRect + ' ' + className}
      data-visible={visible}
      data-suspended={suspended}
      data-selected={selected}
      data-hovered={hovered}
      style={{
        // Shrink one pixel so that the bottom outline will line up with the top outline of the next one.
        width: adjust ? 'calc(' + width + ' - 1px)' : width,
        height: adjust ? 'calc(' + height + ' - 1px)' : height,
        top: y,
        left: x,
      }}
    />
  );
}

function SuspenseRects({
  suspenseID,
  parentRects,
}: {
  suspenseID: SuspenseNode['id'],
  parentRects: null | Array<Rect>,
}): React$Node {
  const store = useContext(StoreContext);
  const treeDispatch = useContext(TreeDispatcherContext);
  const suspenseTreeDispatch = useContext(SuspenseTreeDispatcherContext);
  const {uniqueSuspendersOnly, timeline, hoveredTimelineIndex} = useContext(
    SuspenseTreeStateContext,
  );

  const {inspectedElementID} = useContext(TreeStateContext);

  const {highlightHostInstance, clearHighlightHostInstance} =
    useHighlightHostInstance();

  const suspense = store.getSuspenseByID(suspenseID);
  if (suspense === null) {
    // getSuspenseByID will have already warned
    return null;
  }
  const visible = suspense.hasUniqueSuspenders || !uniqueSuspendersOnly;

  function handleClick(event: SyntheticMouseEvent) {
    if (event.defaultPrevented) {
      // Already clicked on an inner rect
      return;
    }
    event.preventDefault();
    treeDispatch({type: 'SELECT_ELEMENT_BY_ID', payload: suspenseID});
    suspenseTreeDispatch({
      type: 'SET_SUSPENSE_LINEAGE',
      payload: suspenseID,
    });
  }

  function handleDoubleClick(event: SyntheticMouseEvent) {
    if (event.defaultPrevented) {
      // Already clicked on an inner rect
      return;
    }
    event.preventDefault();
    suspenseTreeDispatch({
      type: 'TOGGLE_TIMELINE_FOR_ID',
      payload: suspenseID,
    });
  }

  function handlePointerOver(event: SyntheticPointerEvent) {
    if (event.defaultPrevented) {
      // Already hovered an inner rect
      return;
    }
    event.preventDefault();
    highlightHostInstance(suspenseID);
    suspenseTreeDispatch({
      type: 'HOVER_TIMELINE_FOR_ID',
      payload: suspenseID,
    });
  }

  function handlePointerLeave(event: SyntheticPointerEvent) {
    if (event.defaultPrevented) {
      // Already hovered an inner rect
      return;
    }
    event.preventDefault();
    clearHighlightHostInstance();
    suspenseTreeDispatch({
      type: 'HOVER_TIMELINE_FOR_ID',
      payload: -1,
    });
  }

  // TODO: Use the nearest Suspense boundary
  const selected = inspectedElementID === suspenseID;

  const hovered =
    hoveredTimelineIndex > -1 &&
    timeline[hoveredTimelineIndex].id === suspenseID;

  let environment: null | string = null;
  for (let i = 0; i < timeline.length; i++) {
    const timelineStep = timeline[i];
    if (timelineStep.id === suspenseID) {
      environment = timelineStep.environment;
      break;
    }
  }

  const rects = suspense.rects;
  const boundingBox = getBoundingBox(rects);

  // Next we'll try to find a rect within one of our rects that isn't intersecting with
  // other rects.
  // TODO: This should probably be memoized based on if any changes to the rtree has been made.
  const titleBox: null | Rect =
    rects === null ? null : findTitleBox(store._rtree, rects, parentRects);
  const nextRects =
    rects === null || rects.length === 0
      ? parentRects
      : parentRects === null || parentRects.length === 0
        ? rects
        : parentRects.concat(rects);

  return (
    <ScaledRect
      rect={boundingBox}
      className={
        styles.SuspenseRectsBoundary +
        ' ' +
        getClassNameForEnvironment(environment)
      }
      visible={visible}
      selected={selected}
      suspended={suspense.isSuspended}
      hovered={hovered}>
      <ViewBox.Provider value={boundingBox}>
        {visible &&
          suspense.rects !== null &&
          suspense.rects.map((rect, index) => {
            return (
              <ScaledRect
                key={index}
                className={styles.SuspenseRectsRect}
                rect={rect}
                adjust={true}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onPointerOver={handlePointerOver}
                onPointerLeave={handlePointerLeave}
                // Reach-UI tooltip will go out of bounds of parent scroll container.
                title={suspense.name || 'Unknown'}
              />
            );
          })}
        {suspense.children.length > 0 && (
          <ScaledRect
            className={styles.SuspenseRectsBoundaryChildren}
            rect={boundingBox}>
            {suspense.children.map(childID => {
              return (
                <SuspenseRects
                  key={childID}
                  suspenseID={childID}
                  parentRects={nextRects}
                />
              );
            })}
          </ScaledRect>
        )}
        {titleBox && suspense.name && visible ? (
          <ScaledRect className={styles.SuspenseRectsTitle} rect={titleBox}>
            <span>{suspense.name}</span>
          </ScaledRect>
        ) : null}
      </ViewBox.Provider>
    </ScaledRect>
  );
}

function getBoundingBox(rects: $ReadOnlyArray<Rect> | null): Rect {
  if (rects === null || rects.length === 0) {
    return {x: 0, y: 0, width: 0, height: 0};
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function computeBoundingRectRecursively(
  store: Store,
  node: SuspenseNode,
  bounds: {
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  },
): void {
  const rects = node.rects;
  if (rects !== null) {
    for (let j = 0; j < rects.length; j++) {
      const rect = rects[j];
      if (rect.x < bounds.minX) {
        bounds.minX = rect.x;
      }
      if (rect.x + rect.width > bounds.maxX) {
        bounds.maxX = rect.x + rect.width;
      }
      if (rect.y < bounds.minY) {
        bounds.minY = rect.y;
      }
      if (rect.y + rect.height > bounds.maxY) {
        bounds.maxY = rect.y + rect.height;
      }
    }
  }
  for (let i = 0; i < node.children.length; i++) {
    const child = store.getSuspenseByID(node.children[i]);
    if (child !== null) {
      computeBoundingRectRecursively(store, child, bounds);
    }
  }
}

function getDocumentBoundingRect(
  store: Store,
  roots: $ReadOnlyArray<SuspenseNode['id']>,
): Rect {
  if (roots.length === 0) {
    return {x: 0, y: 0, width: 0, height: 0};
  }

  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (let i = 0; i < roots.length; i++) {
    const rootID = roots[i];
    const root = store.getSuspenseByID(rootID);
    if (root === null) {
      continue;
    }
    computeBoundingRectRecursively(store, root, bounds);
  }

  if (bounds.minX === Number.POSITIVE_INFINITY) {
    // No rects found, return empty rect
    return {x: 0, y: 0, width: 0, height: 0};
  }

  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

function findTitleBox(
  rtree: RBush<Rect>,
  rects: Array<Rect>,
  parentRects: null | Array<Rect>,
): null | Rect {
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    if (rect.width < 20 || rect.height < 10) {
      // Skip small rects. They're likely not able to be contain anything useful anyway.
      continue;
    }
    // Find all overlapping rects elsewhere in the tree to limit our rect.
    const overlappingRects = rtree.search({
      minX: rect.x,
      minY: rect.y,
      maxX: rect.x + rect.width,
      maxY: rect.y + rect.height,
    });
    if (
      overlappingRects.length === 0 ||
      (overlappingRects.length === 1 && overlappingRects[0] === rect)
    ) {
      // There are no overlapping rects that isn't our own rect, so we can just use
      // the full space of the rect.
      return rect;
    }
    // We have some overlapping rects but they might not overlap everything. Let's
    // shrink it up toward the top left corner until it has no more overlap.
    const minX = rect.x;
    const minY = rect.y;
    let maxX = rect.x + rect.width;
    let maxY = rect.y + rect.height;
    for (let j = 0; j < overlappingRects.length; j++) {
      const overlappingRect = overlappingRects[j];
      if (overlappingRect === rect) {
        continue;
      }
      const x = overlappingRect.x;
      const y = overlappingRect.y;
      if (y < maxY && x < maxX) {
        if (
          parentRects !== null &&
          parentRects.indexOf(overlappingRect) !== -1
        ) {
          // This rect overlaps but it's part of a parent boundary. We let
          // title content render if it's on top and not a sibling.
          continue;
        }
        // This rect cuts into the remaining space. Let's figure out if we're
        // better off cutting on the x or y axis to maximize remaining space.
        const remainderX = x - minX;
        const remainderY = y - minY;
        if (remainderX > remainderY) {
          maxX = x;
        } else {
          maxY = y;
        }
      }
    }
    if (maxX > minX && maxY > minY) {
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
  }
  return null;
}

function SuspenseRectsRoot({rootID}: {rootID: SuspenseNode['id']}): React$Node {
  const store = useContext(StoreContext);
  const root = store.getSuspenseByID(rootID);
  if (root === null) {
    // getSuspenseByID will have already warned
    return null;
  }

  return root.children.map(childID => {
    return (
      <SuspenseRects key={childID} suspenseID={childID} parentRects={null} />
    );
  });
}

function SuspenseRectsInitialPaint(): React$Node {
  const {roots} = useContext(SuspenseTreeStateContext);
  return roots.map(rootID => {
    return <SuspenseRectsRoot key={rootID} rootID={rootID} />;
  });
}

function SuspenseRectsTransition({id}: {id: Element['id']}): React$Node {
  const store = useContext(StoreContext);
  const children = useMemo(() => {
    return store.getSuspenseChildren(id);
  }, [id, store]);

  return children.map(suspenseID => {
    return (
      <SuspenseRects
        key={suspenseID}
        suspenseID={suspenseID}
        parentRects={null}
      />
    );
  });
}

const ViewBox = createContext<Rect>(null as any);

function SuspenseRectsContainer({
  scaleRef,
}: {
  scaleRef: {current: number},
}): React$Node {
  const store = useContext(StoreContext);
  const {activityID, inspectedElementID} = useContext(TreeStateContext);
  const treeDispatch = useContext(TreeDispatcherContext);
  const suspenseTreeDispatch = useContext(SuspenseTreeDispatcherContext);
  // TODO: This relies on a full re-render of all children when the Suspense tree changes.
  const {roots, timeline, hoveredTimelineIndex, uniqueSuspendersOnly} =
    useContext(SuspenseTreeStateContext);

  const activityChildren: $ReadOnlyArray<SuspenseNode['id']> | null =
    useMemo(() => {
      if (activityID === null) {
        return null;
      }
      return store.getSuspenseChildren(activityID);
    }, [activityID, store]);
  const transitionChildren =
    activityChildren === null ? roots : activityChildren;

  // We're using the bounding box of the entire document to anchor the Transition
  // in the actual document.
  const boundingBox = getDocumentBoundingRect(store, roots);

  const boundingBoxWidth = boundingBox.width;
  const heightScale =
    boundingBoxWidth === 0 ? 1 : boundingBox.height / boundingBoxWidth;
  // Scales the inspected document to fit into the available width
  const width = '100%';
  const aspectRatio = `1 / ${heightScale}`;

  function handleClick(event: SyntheticMouseEvent) {
    if (event.defaultPrevented) {
      // Already clicked on an inner rect
      return;
    }
    if (transitionChildren.length === 0) {
      // Nothing to select
      return;
    }
    const arbitraryRootID = roots[0];
    const transitionRoot = activityID === null ? arbitraryRootID : activityID;

    event.preventDefault();
    treeDispatch({
      type: 'SELECT_ELEMENT_BY_ID',
      payload: transitionRoot,
    });
    suspenseTreeDispatch({
      type: 'SET_SUSPENSE_LINEAGE',
      payload: arbitraryRootID,
    });
  }

  function handleDoubleClick(event: SyntheticMouseEvent) {
    if (event.defaultPrevented) {
      // Already clicked on an inner rect
      return;
    }
    event.preventDefault();
    suspenseTreeDispatch({
      type: 'SUSPENSE_SET_TIMELINE_INDEX',
      payload: 0,
    });
  }

  // $FlowFixMe[incompatible-type]
  const isRootSelected = roots.includes(inspectedElementID);
  // When we're focusing a Transition, the first timeline step will not be a root.
  const isRootHovered = activityID === null && hoveredTimelineIndex === 0;

  let hasRootSuspenders = false;
  if (!uniqueSuspendersOnly) {
    hasRootSuspenders = true;
  } else {
    for (let i = 0; i < roots.length; i++) {
      const rootID = roots[i];
      const root = store.getSuspenseByID(rootID);
      if (root !== null && root.hasUniqueSuspenders) {
        hasRootSuspenders = true;
        break;
      }
    }
  }

  const rootEnvironment =
    timeline.length === 0 ? null : timeline[0].environment;

  useLayoutEffect(() => {
    // 100% of the width represents this many pixels in the real document.
    scaleRef.current = boundingBoxWidth;
  }, [boundingBoxWidth]);

  let selectedBoundingBox = null;
  let selectedEnvironment = null;
  if (isRootSelected) {
    selectedEnvironment = rootEnvironment;
  } else if (
    inspectedElementID !== null &&
    // TODO: Separate inspected element and inspected Suspense and use the inspected Suspense ID here.
    store.containsSuspense(inspectedElementID)
  ) {
    const selectedSuspenseNode = store.getSuspenseByID(inspectedElementID);
    if (
      selectedSuspenseNode !== null &&
      (selectedSuspenseNode.hasUniqueSuspenders || !uniqueSuspendersOnly)
    ) {
      selectedBoundingBox = getBoundingBox(selectedSuspenseNode.rects);
      for (let i = 0; i < timeline.length; i++) {
        const timelineStep = timeline[i];
        if (timelineStep.id === inspectedElementID) {
          selectedEnvironment = timelineStep.environment;
          break;
        }
      }
    }
  }

  return (
    <div
      className={
        styles.SuspenseRectsContainer +
        (hasRootSuspenders &&
        // We don't want to draw attention to the root if we're looking at a Transition.
        // TODO: Draw bounding rect of Transition and check if the Transition
        // has unique suspenders.
        activityID === null
          ? ' ' + styles.SuspenseRectsRoot
          : '') +
        (isRootSelected ? ' ' + styles.SuspenseRectsRootOutline : '') +
        ' ' +
        getClassNameForEnvironment(rootEnvironment)
      }
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-hovered={isRootHovered}>
      <ViewBox.Provider value={boundingBox}>
        <div
          className={styles.SuspenseRectsViewBox}
          style={{aspectRatio, width}}>
          {activityID === null ? (
            <SuspenseRectsInitialPaint />
          ) : (
            <SuspenseRectsTransition id={activityID} />
          )}
          {selectedBoundingBox !== null ? (
            <ScaledRect
              className={
                styles.SuspenseRectOutline +
                ' ' +
                getClassNameForEnvironment(selectedEnvironment)
              }
              rect={selectedBoundingBox}
              adjust={true}
            />
          ) : null}
        </div>
      </ViewBox.Provider>
    </div>
  );
}

export default SuspenseRectsContainer;
