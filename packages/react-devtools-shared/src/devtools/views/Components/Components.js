/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useEffect, useLayoutEffect, useReducer, useRef} from 'react';
import Tree from './Tree';
import {OwnersListContextController} from './OwnersListContext';
import portaledContent from '../portaledContent';
import {SettingsModalContextController} from 'react-devtools-shared/src/devtools/views/Settings/SettingsModalContext';
import {
  localStorageGetItem,
  localStorageSetItem,
} from 'react-devtools-shared/src/storage';
import InspectedElementErrorBoundary from './InspectedElementErrorBoundary';
import InspectedElement from './InspectedElement';
import {ModalDialog} from '../ModalDialog';
import SettingsModal from 'react-devtools-shared/src/devtools/views/Settings/SettingsModal';
import {NativeStyleContextController} from './NativeStyleEditor/context';

import styles from './Components.css';
import typeof {SyntheticPointerEvent} from 'react-dom-bindings/src/events/SyntheticEvent';

type Orientation = 'horizontal' | 'vertical';

type ResizeActionType =
  | 'ACTION_SET_DID_MOUNT'
  | 'ACTION_SET_HORIZONTAL_PERCENTAGE'
  | 'ACTION_SET_VERTICAL_PERCENTAGE';

type ResizeAction = {
  type: ResizeActionType,
  payload: any,
};

type ResizeState = {
  horizontalPercentage: number,
  verticalPercentage: number,
};

function Components(_: {}) {
  const wrapperElementRef = useRef<null | HTMLElement>(null);
  const resizeElementRef = useRef<null | HTMLElement>(null);

  const [state, dispatch] = useReducer<ResizeState, any, ResizeAction>(
    resizeReducer,
    null,
    initResizeState,
  );

  const {horizontalPercentage, verticalPercentage} = state;

  useLayoutEffect(() => {
    const resizeElement = resizeElementRef.current;

    setResizeCSSVariable(
      resizeElement,
      'horizontal',
      horizontalPercentage * 100,
    );
    setResizeCSSVariable(resizeElement, 'vertical', verticalPercentage * 100);
  }, []);

  useEffect(() => {
    const timeoutID = setTimeout(() => {
      localStorageSetItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          horizontalPercentage,
          verticalPercentage,
        }),
      );
    }, 500);

    return () => clearTimeout(timeoutID);
  }, [horizontalPercentage, verticalPercentage]);

  const onResizeStart = (event: SyntheticPointerEvent) => {
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
  };

  const onResizeEnd = (event: SyntheticPointerEvent) => {
    const element = event.currentTarget;
    element.releasePointerCapture(event.pointerId);
  };

  const onResize = (event: SyntheticPointerEvent) => {
    const element = event.currentTarget;
    const isResizing = element.hasPointerCapture(event.pointerId);
    if (!isResizing) {
      return;
    }

    const resizeElement = resizeElementRef.current;
    const wrapperElement = wrapperElementRef.current;

    if (wrapperElement === null || resizeElement === null) {
      return;
    }

    event.preventDefault();

    const orientation = getOrientation(wrapperElement);

    const {height, width, left, top} = wrapperElement.getBoundingClientRect();

    const currentMousePosition =
      orientation === 'horizontal' ? event.clientX - left : event.clientY - top;

    const boundaryMin = MINIMUM_SIZE;
    const boundaryMax =
      orientation === 'horizontal'
        ? width - MINIMUM_SIZE
        : height - MINIMUM_SIZE;

    const isMousePositionInBounds =
      currentMousePosition > boundaryMin && currentMousePosition < boundaryMax;

    if (isMousePositionInBounds) {
      const resizedElementDimension =
        orientation === 'horizontal' ? width : height;
      const actionType =
        orientation === 'horizontal'
          ? 'ACTION_SET_HORIZONTAL_PERCENTAGE'
          : 'ACTION_SET_VERTICAL_PERCENTAGE';
      const percentage = (currentMousePosition / resizedElementDimension) * 100;

      setResizeCSSVariable(resizeElement, orientation, percentage);

      dispatch({
        type: actionType,
        payload: currentMousePosition / resizedElementDimension,
      });
    }
  };

  return (
    <SettingsModalContextController>
      <OwnersListContextController>
        <div ref={wrapperElementRef} className={styles.Components}>
          <Fragment>
            <div ref={resizeElementRef} className={styles.TreeWrapper}>
              <Tree />
            </div>
            <div className={styles.ResizeBarWrapper}>
              <div
                onPointerDown={onResizeStart}
                onPointerMove={onResize}
                onPointerUp={onResizeEnd}
                className={styles.ResizeBar}
              />
            </div>
            <div className={styles.InspectedElementWrapper}>
              <NativeStyleContextController>
                <InspectedElementErrorBoundary>
                  <InspectedElement
                    fallbackEmpty={
                      'No React element selected. Select an element in the tree to inspect.'
                    }
                  />
                </InspectedElementErrorBoundary>
              </NativeStyleContextController>
            </div>
            <ModalDialog />
            <SettingsModal />
          </Fragment>
        </div>
      </OwnersListContextController>
    </SettingsModalContextController>
  );
}

const LOCAL_STORAGE_KEY = 'React::DevTools::createResizeReducer';
const VERTICAL_MODE_MAX_WIDTH = 600;
const MINIMUM_SIZE = 100;

function initResizeState(): ResizeState {
  let horizontalPercentage = 0.65;
  let verticalPercentage = 0.5;

  try {
    let data = localStorageGetItem(LOCAL_STORAGE_KEY);
    if (data != null) {
      data = JSON.parse(data);
      horizontalPercentage = data.horizontalPercentage;
      verticalPercentage = data.verticalPercentage;
    }
  } catch (error) {}

  return {
    horizontalPercentage,
    verticalPercentage,
  };
}

function resizeReducer(state: ResizeState, action: ResizeAction): ResizeState {
  switch (action.type) {
    case 'ACTION_SET_HORIZONTAL_PERCENTAGE':
      return {
        ...state,
        horizontalPercentage: action.payload,
      };
    case 'ACTION_SET_VERTICAL_PERCENTAGE':
      return {
        ...state,
        verticalPercentage: action.payload,
      };
    default:
      return state;
  }
}

function getOrientation(
  wrapperElement: null | HTMLElement,
): null | Orientation {
  if (wrapperElement != null) {
    const {width} = wrapperElement.getBoundingClientRect();
    return width > VERTICAL_MODE_MAX_WIDTH ? 'horizontal' : 'vertical';
  }
  return null;
}

function setResizeCSSVariable(
  resizeElement: null | HTMLElement,
  orientation: null | Orientation,
  percentage: number,
): void {
  if (resizeElement !== null && orientation !== null) {
    resizeElement.style.setProperty(
      `--${orientation}-resize-percentage`,
      `${percentage}%`,
    );
  }
}

export default portaledContent(Components) as component();
