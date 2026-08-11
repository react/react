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
  useCallback,
  useContext,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import Toggle from '../Toggle';
import ElementBadges from './ElementBadges';
import {OwnersListContext, useChangeOwnerAction} from './OwnersListContext';
import {TreeDispatcherContext, TreeStateContext} from './TreeContext';
import {useIsOverflowing} from '../hooks';
import {StoreContext} from '../context';
import Tooltip from '../Components/reach-ui/tooltip';
import {
  Menu,
  MenuList,
  MenuButton,
  MenuItem,
} from '../Components/reach-ui/menu-button';

import type {SerializedElement} from 'react-devtools-shared/src/frontend/types';

import styles from './OwnersStack.css';

type SelectOwner = (owner: SerializedElement | null) => void;

type ACTION_UPDATE_OWNER_ID = {
  type: 'UPDATE_OWNER_ID',
  ownerID: number | null,
  owners: Array<SerializedElement>,
};
type ACTION_UPDATE_SELECTED_INDEX = {
  type: 'UPDATE_SELECTED_INDEX',
  selectedIndex: number,
};

type Action = ACTION_UPDATE_OWNER_ID | ACTION_UPDATE_SELECTED_INDEX;

type State = {
  ownerID: number | null,
  owners: Array<SerializedElement>,
  selectedIndex: number,
};

function dialogReducer(state: State, action: Action) {
  switch (action.type) {
    case 'UPDATE_OWNER_ID':
      const selectedIndex = action.owners.findIndex(
        owner => owner.id === action.ownerID,
      );
      return {
        ownerID: action.ownerID,
        owners: action.owners,
        selectedIndex,
      };
    case 'UPDATE_SELECTED_INDEX':
      return {
        ...state,
        selectedIndex: action.selectedIndex,
      };
    default:
      throw new Error(`Invalid action "${action.type}"`);
  }
}

type OwnerStackFlatListProps = {
  owners: Array<SerializedElement>,
  selectedIndex: number,
  selectOwner: SelectOwner,
  setElementsTotalWidth: (width: number) => void,
};

function OwnerStackFlatList({
  owners,
  selectedIndex,
  selectOwner,
  setElementsTotalWidth,
}: OwnerStackFlatListProps): React.Node {
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
    <div className={styles.OwnerStackFlatListContainer} ref={containerRef}>
      {owners.map((owner, index) => (
        <Fragment key={index}>
          <ElementView
            owner={owner}
            isSelected={index === selectedIndex}
            selectOwner={selectOwner}
          />
          {index < owners.length - 1 && (
            <span className={styles.OwnerStackFlatListSeparator}>»</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default function OwnerStack(): React.Node {
  const read = useContext(OwnersListContext);
  const {ownerID} = useContext(TreeStateContext);
  const treeDispatch = useContext(TreeDispatcherContext);
  const changeOwnerAction = useChangeOwnerAction();

  const [state, dispatch] = useReducer<State, State, Action>(dialogReducer, {
    ownerID: null,
    owners: [],
    selectedIndex: 0,
  });

  // When an owner is selected, we either need to update the selected index, or we need to fetch a new list of owners.
  // We use a reducer here so that we can avoid fetching a new list unless the owner ID has actually changed.
  if (ownerID === null) {
    dispatch({
      type: 'UPDATE_OWNER_ID',
      ownerID: null,
      owners: [],
    });
  } else if (ownerID !== state.ownerID) {
    const isInStore =
      state.owners.findIndex(owner => owner.id === ownerID) >= 0;
    dispatch({
      type: 'UPDATE_OWNER_ID',
      ownerID,
      owners: isInStore ? state.owners : read(ownerID) || [],
    });
  }

  const {owners, selectedIndex} = state;

  const selectOwner = useCallback<SelectOwner>(
    (owner: SerializedElement | null) => {
      if (owner !== null) {
        const index = owners.indexOf(owner);
        dispatch({
          type: 'UPDATE_SELECTED_INDEX',
          selectedIndex: index >= 0 ? index : 0,
        });
        changeOwnerAction(owner.id);
      } else {
        dispatch({
          type: 'UPDATE_SELECTED_INDEX',
          selectedIndex: 0,
        });
        treeDispatch({type: 'RESET_OWNER_STACK'});
      }
    },
    [owners, treeDispatch],
  );

  const [elementsTotalWidth, setElementsTotalWidth] = useState(0);
  const elementsBarRef = useRef<HTMLDivElement | null>(null);
  const isOverflowing = useIsOverflowing(elementsBarRef, elementsTotalWidth);

  const selectedOwner = owners[selectedIndex];

  return (
    <div className={styles.OwnerStack}>
      <div className={styles.Bar} ref={elementsBarRef}>
        {isOverflowing ? (
          <Fragment>
            <ElementsDropdown
              owners={owners}
              selectedIndex={selectedIndex}
              selectOwner={selectOwner}
            />
            <BackToOwnerButton
              owners={owners}
              selectedIndex={selectedIndex}
              selectOwner={selectOwner}
            />
            {selectedOwner != null && (
              <ElementView
                owner={selectedOwner}
                isSelected={true}
                selectOwner={selectOwner}
              />
            )}
          </Fragment>
        ) : (
          <OwnerStackFlatList
            owners={owners}
            selectedIndex={selectedIndex}
            selectOwner={selectOwner}
            setElementsTotalWidth={setElementsTotalWidth}
          />
        )}
      </div>
      <div className={styles.VRule} />
      <Button onClick={() => selectOwner(null)} title="Back to tree view">
        <ButtonIcon type="close" />
      </Button>
    </div>
  );
}

type ElementsDropdownProps = {
  owners: Array<SerializedElement>,
  selectedIndex: number,
  selectOwner: SelectOwner,
};
function ElementsDropdown({owners, selectOwner}: ElementsDropdownProps) {
  const store = useContext(StoreContext);

  const menuItems = [];
  for (let index = owners.length - 1; index >= 0; index--) {
    const owner = owners[index];
    const isInStore = store.containsElement(owner.id);
    menuItems.push(
      <MenuItem
        key={owner.id}
        className={`${styles.Component} ${isInStore ? '' : styles.NotInStore}`}
        onSelect={() => (isInStore ? selectOwner(owner) : null)}>
        {owner.displayName}

        <ElementBadges
          hocDisplayNames={owner.hocDisplayNames}
          environmentName={owner.env}
          compiledWithForget={owner.compiledWithForget}
          className={styles.BadgesBlock}
        />
      </MenuItem>,
    );
  }

  return (
    <Menu>
      <MenuButton className={styles.MenuButton}>
        <Tooltip label="Open elements dropdown">
          <span className={styles.MenuButtonContent} tabIndex={-1}>
            <ButtonIcon type="more" />
          </span>
        </Tooltip>
      </MenuButton>
      <MenuList className={styles.Modal}>{menuItems}</MenuList>
    </Menu>
  );
}

type ElementViewProps = {
  isSelected: boolean,
  owner: SerializedElement,
  selectOwner: SelectOwner,
  ...
};
function ElementView({isSelected, owner, selectOwner}: ElementViewProps) {
  const store = useContext(StoreContext);

  const {displayName, hocDisplayNames, compiledWithForget} = owner;
  const isInStore = store.containsElement(owner.id);

  const handleChange = useCallback(() => {
    if (isInStore) {
      selectOwner(owner);
    }
  }, [isInStore, selectOwner, owner]);

  return (
    <Toggle
      className={`${styles.Component} ${isInStore ? '' : styles.NotInStore}`}
      isChecked={isSelected}
      onChange={handleChange}>
      {displayName}

      <ElementBadges
        hocDisplayNames={hocDisplayNames}
        environmentName={owner.env}
        compiledWithForget={compiledWithForget}
        className={styles.BadgesBlock}
      />
    </Toggle>
  );
}

type BackToOwnerButtonProps = {
  owners: Array<SerializedElement>,
  selectedIndex: number,
  selectOwner: SelectOwner,
};
function BackToOwnerButton({
  owners,
  selectedIndex,
  selectOwner,
}: BackToOwnerButtonProps) {
  const store = useContext(StoreContext);

  if (selectedIndex <= 0) {
    return null;
  }

  const owner = owners[selectedIndex - 1];
  const isInStore = store.containsElement(owner.id);

  return (
    <Button
      className={isInStore ? undefined : styles.NotInStore}
      onClick={() => (isInStore ? selectOwner(owner) : null)}
      title={`Up to ${owner.displayName || 'owner'}`}>
      <ButtonIcon type="previous" />
    </Button>
  );
}
