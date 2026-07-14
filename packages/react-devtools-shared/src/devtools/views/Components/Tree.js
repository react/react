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
  Fragment,
  Suspense,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {FixedSizeList} from 'react-window';
import {TreeDispatcherContext, TreeStateContext} from './TreeContext';
import Icon from '../Icon';
import {SettingsContext} from '../Settings/SettingsContext';
import {BridgeContext, StoreContext, OptionsContext} from '../context';
import ComponentsTreeElement from './Element';
import InspectHostNodesToggle from './InspectHostNodesToggle';
import OwnersStack from './OwnersStack';
import ComponentSearchInput from './ComponentSearchInput';
import SettingsModalContextToggle from 'react-devtools-shared/src/devtools/views/Settings/SettingsModalContextToggle';
import TreeFocusedContext from './TreeFocusedContext';
import {useHighlightHostInstance, useSubscription} from '../hooks';
import {clearErrorsAndWarnings as clearErrorsAndWarningsAPI} from 'react-devtools-shared/src/backendAPI';
import styles from './Tree.css';
import ButtonIcon from '../ButtonIcon';
import Button from '../Button';
import {logEvent} from 'react-devtools-shared/src/Logger';
import {useExtensionComponentsPanelVisibility} from 'react-devtools-shared/src/frontend/hooks/useExtensionComponentsPanelVisibility';
import {ElementTypeActivity} from 'react-devtools-shared/src/frontend/types';
import {useChangeOwnerAction} from './OwnersListContext';
import {useChangeActivitySliceAction} from '../SuspenseTab/ActivityList';
import ActivitySlice from './ActivitySlice';

// Indent for each node at level N, compared to node at level N - 1.
const INDENTATION_SIZE = 10;

function calculateElementOffset(elementDepth: number): number {
  return elementDepth * INDENTATION_SIZE;
}

export type ItemData = {
  isNavigatingWithKeyboard: boolean,
  onElementMouseEnter: (id: number) => void,
  treeFocused: boolean,
  calculateElementOffset: (depth: number) => number,
};

function calculateInitialScrollOffset(
  inspectedElementIndex: number | null,
  elementHeight: number,
): number | void {
  if (inspectedElementIndex === null) {
    return undefined;
  }

  if (inspectedElementIndex < 3) {
    return undefined;
  }

  // Make 3 elements on top of the inspected one visible
  return (inspectedElementIndex - 3) * elementHeight;
}

export default function Tree(): React.Node {
  const dispatch = useContext(TreeDispatcherContext);
  const {
    activityID,
    numElements,
    ownerID,
    searchIndex,
    searchResults,
    inspectedElementID,
    inspectedElementIndex,
  } = useContext(TreeStateContext);
  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);
  const {hideSettings} = useContext(OptionsContext);
  const {lineHeight} = useContext(SettingsContext);

  const [isNavigatingWithKeyboard, setIsNavigatingWithKeyboard] =
    useState(false);
  const {highlightHostInstance, clearHighlightHostInstance} =
    useHighlightHostInstance();
  const [treeFocused, setTreeFocused] = useState<boolean>(false);
  const componentsPanelVisible = useExtensionComponentsPanelVisibility(bridge);

  const treeRef = useRef<HTMLDivElement | null>(null);
  const focusTargetRef = useRef<HTMLDivElement | null>(null);
  const listDOMElementRef = useRef<Element | null>(null);
  const setListDOMElementRef = useCallback((listDOMElement: Element) => {
    listDOMElementRef.current = listDOMElement;

    // Controls the initial horizontal offset of the Tree if the element was pre-selected. For example, via Elements panel in browser DevTools.
    // Initial vertical offset is controlled via initialScrollOffset prop of the FixedSizeList component.
    if (
      !componentsPanelVisible ||
      inspectedElementIndex == null ||
      listDOMElement == null
    ) {
      return;
    }

    const element = store.getElementAtIndex(inspectedElementIndex);
    if (element == null) {
      return;
    }

    const viewportLeft = listDOMElement.scrollLeft;
    const viewportRight = viewportLeft + listDOMElement.clientWidth;
    const elementLeft = calculateElementOffset(element.depth);
    // Because of virtualization, this element might not be rendered yet; we can't look up its width.
    // Assuming that it may take up to the half of the viewport.
    const elementRight = elementLeft + listDOMElement.clientWidth / 2;

    const isElementFullyVisible =
      elementLeft >= viewportLeft && elementRight <= viewportRight;

    if (!isElementFullyVisible) {
      const horizontalDelta =
        Math.min(0, elementLeft - viewportLeft) +
        Math.max(0, elementRight - viewportRight);

      // $FlowExpectedError[incompatible-type] Flow doesn't support instant as an option for behavior.
      listDOMElement.scrollBy({
        left: horizontalDelta,
        behavior: 'instant',
      });
    }
  }, []);

  useEffect(() => {
    if (!componentsPanelVisible || inspectedElementIndex == null) {
      return;
    }

    const listDOMElement = listDOMElementRef.current;
    if (listDOMElement == null) {
      return;
    }

    const viewportHeight = listDOMElement.clientHeight;
    const viewportLeft = listDOMElement.scrollLeft;
    const viewportRight = viewportLeft + listDOMElement.clientWidth;
    const viewportTop = listDOMElement.scrollTop;
    const viewportBottom = viewportTop + viewportHeight;

    const element = store.getElementAtIndex(inspectedElementIndex);
    if (element == null) {
      return;
    }
    const elementLeft = calculateElementOffset(element.depth);
    // Because of virtualization, this element might not be rendered yet; we can't look up its width.
    // Assuming that it may take up to the half of the viewport.
    const elementRight = elementLeft + listDOMElement.clientWidth / 2;
    const elementTop = inspectedElementIndex * lineHeight;
    const elementBottom = elementTop + lineHeight;

    const isElementFullyVisible =
      elementTop >= viewportTop &&
      elementBottom <= viewportBottom &&
      elementLeft >= viewportLeft &&
      elementRight <= viewportRight;

    if (!isElementFullyVisible) {
      const verticalDelta =
        Math.min(0, elementTop - viewportTop) +
        Math.max(0, elementBottom - viewportBottom);
      const horizontalDelta =
        Math.min(0, elementLeft - viewportLeft) +
        Math.max(0, elementRight - viewportRight);

      // $FlowExpectedError[incompatible-type] Flow doesn't support instant as an option for behavior.
      listDOMElement.scrollBy({
        top: verticalDelta,
        left: horizontalDelta,
        behavior: treeFocused && ownerID == null ? 'smooth' : 'instant',
      });
    }
  }, [inspectedElementIndex, componentsPanelVisible, lineHeight]);

  // Picking an element in the inspector should put focus into the tree.
  // If possible, navigation works right after picking a node.
  // NOTE: This is not guaranteed to work, because browser extension panels are hosted inside an iframe.
  useEffect(() => {
    function handleStopInspectingHost(didSelectNode: boolean) {
      if (didSelectNode && focusTargetRef.current !== null) {
        focusTargetRef.current.focus();
        logEvent({
          event_name: 'select-element',
          metadata: {source: 'inspector'},
        });
      }
    }
    bridge.addListener('stopInspectingHost', handleStopInspectingHost);
    return () =>
      bridge.removeListener('stopInspectingHost', handleStopInspectingHost);
  }, [bridge]);

  // Navigate the tree with up/down arrow keys.
  useEffect(() => {
    if (treeRef.current === null) {
      return () => {};
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event as any).target.tagName === 'INPUT' || event.defaultPrevented) {
        return;
      }

      let element;
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (event.altKey) {
            dispatch({type: 'SELECT_NEXT_SIBLING_IN_TREE'});
          } else {
            dispatch({type: 'SELECT_NEXT_ELEMENT_IN_TREE'});
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          element =
            inspectedElementID !== null
              ? store.getElementByID(inspectedElementID)
              : null;
          if (element !== null) {
            if (event.altKey) {
              // $FlowFixMe[invalid-compare]
              if (element.ownerID !== null) {
                dispatch({type: 'SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE'});
              }
            } else {
              if (element.children.length > 0 && !element.isCollapsed) {
                store.toggleIsCollapsed(element.id, true);
              } else {
                dispatch({type: 'SELECT_PARENT_ELEMENT_IN_TREE'});
              }
            }
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          element =
            inspectedElementID !== null
              ? store.getElementByID(inspectedElementID)
              : null;
          if (element !== null) {
            if (event.altKey) {
              dispatch({type: 'SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE'});
            } else {
              if (element.children.length > 0 && element.isCollapsed) {
                store.toggleIsCollapsed(element.id, false);
              } else {
                dispatch({type: 'SELECT_CHILD_ELEMENT_IN_TREE'});
              }
            }
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (event.altKey) {
            dispatch({type: 'SELECT_PREVIOUS_SIBLING_IN_TREE'});
          } else {
            dispatch({type: 'SELECT_PREVIOUS_ELEMENT_IN_TREE'});
          }
          break;
        default:
          return;
      }
      setIsNavigatingWithKeyboard(true);
    };

    // We used to listen to at the document level for this event.
    // That allowed us to listen to up/down arrow key events while another section
    // of DevTools (like the search input) was focused.
    // This was a minor UX positive.
    //
    // (We had to use ownerDocument rather than document for this, because the
    // DevTools extension renders the Components and Profiler tabs into portals.)
    //
    // This approach caused a problem though: it meant that a react-devtools-inline
    // instance could steal (and prevent/block) keyboard events from other JavaScript
    // on the page– which could even include other react-devtools-inline instances.
    // This is a potential major UX negative.
    //
    // Given the above trade offs, we now listen on the root of the Tree itself.
    const container = treeRef.current;
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, inspectedElementID, store]);

  // Focus management.
  const handleBlur = useCallback(() => setTreeFocused(false), []);
  const handleFocus = useCallback(() => setTreeFocused(true), []);

  const changeActivitySliceAction = useChangeActivitySliceAction();
  const changeOwnerAction = useChangeOwnerAction();
  const handleKeyPress = useCallback(
    (event: $FlowFixMe) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          if (inspectedElementID !== null) {
            const inspectedElement = store.getElementByID(inspectedElementID);
            startTransition(() => {
              if (
                inspectedElement !== null &&
                inspectedElement.type === ElementTypeActivity
              ) {
                changeActivitySliceAction(inspectedElementID);
              } else {
                changeOwnerAction(inspectedElementID);
              }
            });
          }
          break;
        default:
          break;
      }
    },
    [dispatch, inspectedElementID],
  );

  // If we switch the selected element while using the keyboard,
  // start highlighting it in the DOM instead of the last hovered node.
  const searchRef = useRef({searchIndex, searchResults});
  useEffect(() => {
    let didSelectNewSearchResult = false;
    if (
      searchRef.current.searchIndex !== searchIndex ||
      searchRef.current.searchResults !== searchResults
    ) {
      searchRef.current.searchIndex = searchIndex;
      searchRef.current.searchResults = searchResults;
      didSelectNewSearchResult = true;
    }
    if (isNavigatingWithKeyboard || didSelectNewSearchResult) {
      if (inspectedElementID !== null) {
        highlightHostInstance(inspectedElementID);
      } else {
        clearHighlightHostInstance();
      }
    }
  }, [
    bridge,
    isNavigatingWithKeyboard,
    highlightHostInstance,
    searchIndex,
    searchResults,
    inspectedElementID,
  ]);

  // Highlight last hovered element.
  const handleElementMouseEnter = useCallback(
    (id: $FlowFixMe) => {
      // Ignore hover while we're navigating with keyboard.
      // This avoids flicker from the hovered nodes under the mouse.
      if (!isNavigatingWithKeyboard) {
        highlightHostInstance(id);
      }
    },
    [isNavigatingWithKeyboard, highlightHostInstance],
  );

  const handleMouseMove = useCallback(() => {
    // We started using the mouse again.
    // This will enable hover styles in individual rows.
    setIsNavigatingWithKeyboard(false);
  }, []);

  const handleMouseLeave = clearHighlightHostInstance;

  // The synthetic onMouseLeave on the tree div only fires within the document,
  // so we need a native listener on the document itself.
  useEffect(() => {
    const container = focusTargetRef.current;
    if (container == null) {
      return;
    }
    const ownerDocument = container.ownerDocument;
    ownerDocument.addEventListener('mouseleave', clearHighlightHostInstance);
    return () => {
      ownerDocument.removeEventListener(
        'mouseleave',
        clearHighlightHostInstance,
      );
    };
  }, [clearHighlightHostInstance]);

  // Let react-window know to re-render any time the underlying tree data changes.
  // This includes the owner context, since it controls a filtered view of the tree.
  const itemData = useMemo<ItemData>(
    () => ({
      isNavigatingWithKeyboard,
      onElementMouseEnter: handleElementMouseEnter,
      treeFocused,
      calculateElementOffset,
    }),
    [
      isNavigatingWithKeyboard,
      handleElementMouseEnter,
      treeFocused,
      calculateElementOffset,
    ],
  );

  const itemKey = useCallback(
    (index: number) => store.getElementIDAtIndex(index),
    [store],
  );

  const handlePreviousErrorOrWarningClick = React.useCallback(() => {
    dispatch({type: 'SELECT_PREVIOUS_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE'});
  }, []);

  const handleNextErrorOrWarningClick = React.useCallback(() => {
    dispatch({type: 'SELECT_NEXT_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE'});
  }, []);

  const errorsOrWarningsSubscription = useMemo(
    () => ({
      getCurrentValue: () => ({
        errors: store.componentWithErrorCount,
        warnings: store.componentWithWarningCount,
      }),
      subscribe: (callback: Function) => {
        store.addListener('mutated', callback);
        return () => store.removeListener('mutated', callback);
      },
    }),
    [store],
  );
  const {errors, warnings} = useSubscription(errorsOrWarningsSubscription);

  const clearErrorsAndWarnings = () => {
    clearErrorsAndWarningsAPI({bridge, store});
  };

  const zeroElementsNotice = (
    <div className={styles.ZeroElementsNotice}>
      <p>Loading React Element Tree...</p>
      <p>
        If this seems stuck, please follow the{' '}
        <a
          className={styles.Link}
          href="https://github.com/facebook/react/blob/main/packages/react-devtools/README.md#the-react-tab-shows-no-components"
          target="_blank">
          troubleshooting instructions
        </a>
        .
      </p>
    </div>
  );

  return (
    <TreeFocusedContext.Provider value={treeFocused}>
      <div className={styles.Tree} ref={treeRef}>
        <div className={styles.SearchInput}>
          {store.supportsClickToInspect && (
            <Fragment>
              <InspectHostNodesToggle />
              <div className={styles.VRule} />
            </Fragment>
          )}
          <Suspense fallback={<Loading />}>
            {ownerID !== null ? (
              <OwnersStack />
            ) : activityID !== null ? (
              <ActivitySlice />
            ) : (
              <ComponentSearchInput />
            )}
          </Suspense>
          {ownerID === null && (errors > 0 || warnings > 0) && (
            <React.Fragment>
              <div className={styles.VRule} />
              {errors > 0 && (
                <div className={styles.IconAndCount}>
                  <Icon className={styles.ErrorIcon} type="error" />
                  {errors}
                </div>
              )}
              {warnings > 0 && (
                <div className={styles.IconAndCount}>
                  <Icon className={styles.WarningIcon} type="warning" />
                  {warnings}
                </div>
              )}
              <Button
                onClick={handlePreviousErrorOrWarningClick}
                title="Scroll to previous error or warning">
                <ButtonIcon type="up" />
              </Button>
              <Button
                onClick={handleNextErrorOrWarningClick}
                title="Scroll to next error or warning">
                <ButtonIcon type="down" />
              </Button>
              <Button
                onClick={clearErrorsAndWarnings}
                title="Clear all errors and warnings">
                <ButtonIcon type="clear" />
              </Button>
            </React.Fragment>
          )}
          {!hideSettings && (
            <Fragment>
              <div className={styles.VRule} />
              <SettingsModalContextToggle />
            </Fragment>
          )}
        </div>
        {numElements === 0 ? (
          zeroElementsNotice
        ) : (
          <div
            className={styles.AutoSizerWrapper}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyPress={handleKeyPress}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            ref={focusTargetRef}
            tabIndex={0}>
            <AutoSizer>
              {({height, width}) => (
                <FixedSizeList
                  className={styles.List}
                  height={height}
                  initialScrollOffset={calculateInitialScrollOffset(
                    inspectedElementIndex,
                    lineHeight,
                  )}
                  innerElementType={InnerElementType}
                  itemCount={numElements}
                  itemData={itemData}
                  itemKey={itemKey}
                  itemSize={lineHeight}
                  outerRef={setListDOMElementRef}
                  overscanCount={10}
                  width={width}>
                  {ComponentsTreeElement}
                </FixedSizeList>
              )}
            </AutoSizer>
          </div>
        )}
      </div>
    </TreeFocusedContext.Provider>
  );
}

// $FlowFixMe[missing-local-annot]
function InnerElementType({children, style}) {
  const store = useContext(StoreContext);

  const {height} = style;
  const maxDepth = store.getMaximumRecordedDepth();
  // Maximum possible indentation plus some arbitrary offset for the node content.
  const width = calculateElementOffset(maxDepth) + 500;

  return (
    <div className={styles.InnerElementType} style={{height, width}}>
      {children}

      <VerticalDelimiter />
    </div>
  );
}

function VerticalDelimiter() {
  const store = useContext(StoreContext);
  const {ownerID, inspectedElementIndex} = useContext(TreeStateContext);
  const {lineHeight} = useContext(SettingsContext);

  if (ownerID != null || inspectedElementIndex == null) {
    return null;
  }

  const element = store.getElementAtIndex(inspectedElementIndex);
  if (element == null) {
    return null;
  }
  const indexOfLowestDescendant =
    store.getIndexOfLowestDescendantElement(element);
  if (indexOfLowestDescendant == null) {
    return null;
  }

  const delimiterLeft = calculateElementOffset(element.depth) + 12;
  const delimiterTop = (inspectedElementIndex + 1) * lineHeight;
  const delimiterHeight =
    (indexOfLowestDescendant + 1) * lineHeight - delimiterTop;

  return (
    <div
      className={styles.VerticalDelimiter}
      style={{
        left: delimiterLeft,
        top: delimiterTop,
        height: delimiterHeight,
      }}
    />
  );
}

function Loading() {
  return <div className={styles.Loading}>Loading...</div>;
}
