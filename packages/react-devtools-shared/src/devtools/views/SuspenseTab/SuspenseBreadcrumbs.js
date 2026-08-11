/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {SuspenseNode} from 'react-devtools-shared/src/frontend/types';
import typeof {SyntheticMouseEvent} from 'react-dom-bindings/src/events/SyntheticEvent';

import * as React from 'react';
import {Fragment, useContext, useLayoutEffect, useRef, useState} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import Tooltip from '../Components/reach-ui/tooltip';
import {
  Menu,
  MenuList,
  MenuButton,
  MenuItem,
} from '../Components/reach-ui/menu-button';
import {
  TreeDispatcherContext,
  TreeStateContext,
} from '../Components/TreeContext';
import {StoreContext} from '../context';
import {useHighlightHostInstance, useIsOverflowing} from '../hooks';
import styles from './SuspenseBreadcrumbs.css';
import {
  SuspenseTreeStateContext,
  SuspenseTreeDispatcherContext,
} from './SuspenseTreeContext';

type SuspenseBreadcrumbsFlatListProps = {
  onItemClick: (id: SuspenseNode['id'], event: SyntheticMouseEvent) => void,
  onItemPointerEnter: (
    id: SuspenseNode['id'],
    scrollIntoView?: boolean,
  ) => void,
  onItemPointerLeave: (event: SyntheticMouseEvent) => void,
  setElementsTotalWidth: (width: number) => void,
};

function SuspenseBreadcrumbsFlatList({
  onItemClick,
  onItemPointerEnter,
  onItemPointerLeave,
  setElementsTotalWidth,
}: SuspenseBreadcrumbsFlatListProps): React$Node {
  const store = useContext(StoreContext);
  const {activityID} = useContext(TreeStateContext);
  const {selectedSuspenseID, lineage, roots} = useContext(
    SuspenseTreeStateContext,
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const ResizeObserver = container.ownerDocument.defaultView.ResizeObserver;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      setElementsTotalWidth(entry.contentRect.width);
    });

    observer.observe(container);
    return observer.disconnect.bind(observer);
  }, []);

  return (
    <ol className={styles.SuspenseBreadcrumbsList} ref={containerRef}>
      {lineage === null ? null : lineage.length === 0 ? (
        // We selected the root. This means that we're currently viewing the Transition
        // that rendered the whole screen. In laymans terms this is really "Initial Paint" .
        // When we're looking at a subtree selection, then the equivalent is a
        // "Transition" since in that case it's really about a Transition within the page.
        roots.length > 0 ? (
          <li
            className={styles.SuspenseBreadcrumbsListItem}
            aria-current="true">
            <button
              className={styles.SuspenseBreadcrumbsButton}
              onClick={onItemClick.bind(
                null,
                activityID === null ? roots[0] : activityID,
              )}
              type="button">
              {activityID === null ? 'Initial Paint' : 'Transition'}
            </button>
          </li>
        ) : null
      ) : (
        lineage.map((id, index) => {
          const node = store.getSuspenseByID(id);

          return (
            <Fragment key={id}>
              <li
                className={styles.SuspenseBreadcrumbsListItem}
                aria-current={selectedSuspenseID === id}
                onPointerEnter={onItemPointerEnter.bind(null, id, false)}
                onPointerLeave={onItemPointerLeave}>
                <button
                  className={styles.SuspenseBreadcrumbsButton}
                  onClick={onItemClick.bind(null, id)}
                  type="button">
                  {node === null ? 'Unknown' : node.name || 'Unknown'}
                </button>
              </li>
              {index < lineage.length - 1 && (
                <span className={styles.SuspenseBreadcrumbsListItemSeparator}>
                  »
                </span>
              )}
            </Fragment>
          );
        })
      )}
    </ol>
  );
}

type SuspenseBreadcrumbsMenuProps = {
  onItemClick: (id: SuspenseNode['id'], event: SyntheticMouseEvent) => void,
  onItemPointerEnter: (
    id: SuspenseNode['id'],
    scrollIntoView?: boolean,
  ) => void,
  onItemPointerLeave: (event: SyntheticMouseEvent) => void,
};

function SuspenseBreadcrumbsMenu({
  onItemClick,
  onItemPointerEnter,
  onItemPointerLeave,
}: SuspenseBreadcrumbsMenuProps): React$Node {
  const store = useContext(StoreContext);
  const {activityID} = useContext(TreeStateContext);
  const {selectedSuspenseID, lineage, roots} = useContext(
    SuspenseTreeStateContext,
  );
  const selectedSuspenseNode =
    selectedSuspenseID !== null
      ? store.getSuspenseByID(selectedSuspenseID)
      : null;

  return (
    <>
      {lineage === null ? null : lineage.length === 0 ? (
        // We selected the root. This means that we're currently viewing the Transition
        // that rendered the whole screen. In laymans terms this is really "Initial Paint" .
        // When we're looking at a subtree selection, then the equivalent is a
        // "Transition" since in that case it's really about a Transition within the page.
        roots.length > 0 ? (
          <button
            className={styles.SuspenseBreadcrumbsButton}
            onClick={onItemClick.bind(
              null,
              activityID === null ? roots[0] : activityID,
            )}
            type="button">
            {activityID === null ? 'Initial Paint' : 'Transition'}
          </button>
        ) : null
      ) : (
        <>
          <SuspenseBreadcrumbsDropdown
            lineage={lineage}
            selectElement={onItemClick}
          />
          <SuspenseBreadcrumbsToParentButton
            lineage={lineage}
            selectedSuspenseID={selectedSuspenseID}
            selectElement={onItemClick}
          />
          {selectedSuspenseNode != null && (
            <button
              className={styles.SuspenseBreadcrumbsButton}
              onClick={onItemClick.bind(null, selectedSuspenseNode.id)}
              onPointerEnter={onItemPointerEnter.bind(
                null,
                selectedSuspenseNode.id,
                false,
              )}
              onPointerLeave={onItemPointerLeave}
              type="button">
              {/* $FlowFixMe[invalid-compare] */}
              {selectedSuspenseNode === null
                ? 'Unknown'
                : selectedSuspenseNode.name || 'Unknown'}
            </button>
          )}
        </>
      )}
    </>
  );
}

type SuspenseBreadcrumbsDropdownProps = {
  lineage: $ReadOnlyArray<SuspenseNode['id']>,
  selectedIndex: number,
  selectElement: (id: SuspenseNode['id']) => void,
};
function SuspenseBreadcrumbsDropdown({
  lineage,
  selectElement,
}: SuspenseBreadcrumbsDropdownProps) {
  const store = useContext(StoreContext);

  const menuItems = [];
  for (let index = lineage.length - 1; index >= 0; index--) {
    const suspenseNodeID = lineage[index];
    const node = store.getSuspenseByID(suspenseNodeID);
    menuItems.push(
      <MenuItem
        key={suspenseNodeID}
        className={`${styles.Component}`}
        onSelect={selectElement.bind(null, suspenseNodeID)}>
        {node === null ? 'Unknown' : node.name || 'Unknown'}
      </MenuItem>,
    );
  }

  return (
    <Menu>
      <MenuButton className={styles.SuspenseBreadcrumbsMenuButton}>
        <Tooltip label="Open elements dropdown">
          <span
            className={styles.SuspenseBreadcrumbsMenuButtonContent}
            tabIndex={-1}>
            <ButtonIcon type="more" />
          </span>
        </Tooltip>
      </MenuButton>
      <MenuList className={styles.SuspenseBreadcrumbsModal}>
        {menuItems}
      </MenuList>
    </Menu>
  );
}

type SuspenseBreadcrumbsToParentButtonProps = {
  lineage: $ReadOnlyArray<SuspenseNode['id']>,
  selectedSuspenseID: SuspenseNode['id'] | null,
  selectElement: (id: SuspenseNode['id'], event: SyntheticMouseEvent) => void,
};
function SuspenseBreadcrumbsToParentButton({
  lineage,
  selectedSuspenseID,
  selectElement,
}: SuspenseBreadcrumbsToParentButtonProps) {
  const store = useContext(StoreContext);
  const selectedIndex =
    selectedSuspenseID === null
      ? lineage.length - 1
      : lineage.indexOf(selectedSuspenseID);

  if (selectedIndex <= 0) {
    return null;
  }

  const parentID = lineage[selectedIndex - 1];
  const parent = store.getSuspenseByID(parentID);

  return (
    <Button
      className={parent !== null ? undefined : styles.NotInStore}
      onClick={parent !== null ? selectElement.bind(null, parentID) : null}
      title={`Up to ${parent === null ? 'Unknown' : parent.name || 'Unknown'}`}>
      <ButtonIcon type="previous" />
    </Button>
  );
}

export default function SuspenseBreadcrumbs(): React$Node {
  const treeDispatch = useContext(TreeDispatcherContext);
  const suspenseTreeDispatch = useContext(SuspenseTreeDispatcherContext);

  const {highlightHostInstance, clearHighlightHostInstance} =
    useHighlightHostInstance();

  function handleClick(id: SuspenseNode['id'], event?: SyntheticMouseEvent) {
    if (event !== undefined) {
      // E.g. 3rd party component libraries might omit the event and already prevent default
      // like Reach's MenuItem does.
      event.preventDefault();
    }
    treeDispatch({type: 'SELECT_ELEMENT_BY_ID', payload: id});
    suspenseTreeDispatch({type: 'SELECT_SUSPENSE_BY_ID', payload: id});
  }

  const [elementsTotalWidth, setElementsTotalWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isOverflowing = useIsOverflowing(containerRef, elementsTotalWidth);

  return (
    <div className={styles.SuspenseBreadcrumbsContainer} ref={containerRef}>
      {isOverflowing ? (
        <SuspenseBreadcrumbsMenu
          onItemClick={handleClick}
          onItemPointerEnter={highlightHostInstance}
          onItemPointerLeave={clearHighlightHostInstance}
        />
      ) : (
        <SuspenseBreadcrumbsFlatList
          onItemClick={handleClick}
          onItemPointerEnter={highlightHostInstance}
          onItemPointerLeave={clearHighlightHostInstance}
          setElementsTotalWidth={setElementsTotalWidth}
        />
      )}
    </div>
  );
}
