/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// This context combines tree/selection state, search, and the owners stack.
// These values are managed together because changes in one often impact the others.
// Combining them enables us to avoid cascading renders.
//
// Changes to search state may impact tree state.
// For example, updating the selected search result also updates the tree's selected value.
// Search does not fundamentally change the tree though.
// It is also possible to update the selected tree value independently.
//
// Changes to owners state mask search and tree values.
// When owners stack is not empty, search is temporarily disabled,
// and tree values (e.g. num elements, selected element) are masked.
// Both tree and search values are restored when the owners stack is cleared.
//
// For this reason, changes to the tree context are processed in sequence: tree -> search -> owners
// This enables each section to potentially override (or mask) previous values.

import type {ReactContext} from 'shared/ReactTypes';

import * as React from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  startTransition,
} from 'react';
import {createRegExp} from '../utils';
import {StoreContext} from '../context';
import Store from '../../store';

import type {Element} from 'react-devtools-shared/src/frontend/types';

export type StateContext = {
  // Tree
  numElements: number,
  ownerSubtreeLeafElementID: number | null,

  // Search
  searchIndex: number | null,
  searchResults: Array<number>,
  searchText: string,

  // Owners
  ownerID: number | null,
  ownerFlatTree: Array<Element> | null,

  // Activity slice
  activityID: Element['id'] | null,
  activities: $ReadOnlyArray<{id: Element['id'], depth: number}>,

  // Inspection element panel
  inspectedElementID: number | null,
  inspectedElementIndex: number | null,
};

type ACTION_GO_TO_NEXT_SEARCH_RESULT = {
  type: 'GO_TO_NEXT_SEARCH_RESULT',
};
type ACTION_GO_TO_PREVIOUS_SEARCH_RESULT = {
  type: 'GO_TO_PREVIOUS_SEARCH_RESULT',
};
type ACTION_GO_TO_SEARCH_RESULT = {
  type: 'GO_TO_SEARCH_RESULT',
  payload: number,
};
type ACTION_HANDLE_STORE_MUTATION = {
  type: 'HANDLE_STORE_MUTATION',
  payload: [Array<number>, Map<number, number>, null | Element['id']],
};
type ACTION_RESET_OWNER_STACK = {
  type: 'RESET_OWNER_STACK',
};
type ACTION_SELECT_CHILD_ELEMENT_IN_TREE = {
  type: 'SELECT_CHILD_ELEMENT_IN_TREE',
};
type ACTION_SELECT_ELEMENT_AT_INDEX = {
  type: 'SELECT_ELEMENT_AT_INDEX',
  payload: number | null,
};
type ACTION_SELECT_ELEMENT_BY_ID = {
  type: 'SELECT_ELEMENT_BY_ID',
  payload: number | null,
};
type ACTION_SELECT_NEXT_ELEMENT_IN_TREE = {
  type: 'SELECT_NEXT_ELEMENT_IN_TREE',
};
type ACTION_SELECT_NEXT_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE = {
  type: 'SELECT_NEXT_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE',
};
type ACTION_SELECT_NEXT_SIBLING_IN_TREE = {
  type: 'SELECT_NEXT_SIBLING_IN_TREE',
};
type ACTION_SELECT_OWNER = {
  type: 'SELECT_OWNER',
  payload: number,
};
type ACTION_SELECT_PARENT_ELEMENT_IN_TREE = {
  type: 'SELECT_PARENT_ELEMENT_IN_TREE',
};
type ACTION_SELECT_PREVIOUS_ELEMENT_IN_TREE = {
  type: 'SELECT_PREVIOUS_ELEMENT_IN_TREE',
};
type ACTION_SELECT_PREVIOUS_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE = {
  type: 'SELECT_PREVIOUS_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE',
};
type ACTION_SELECT_PREVIOUS_SIBLING_IN_TREE = {
  type: 'SELECT_PREVIOUS_SIBLING_IN_TREE',
};
type ACTION_SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE = {
  type: 'SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE',
};
type ACTION_SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE = {
  type: 'SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE',
};
type ACTION_SET_SEARCH_TEXT = {
  type: 'SET_SEARCH_TEXT',
  payload: string,
};

type Action =
  | ACTION_GO_TO_NEXT_SEARCH_RESULT
  | ACTION_GO_TO_PREVIOUS_SEARCH_RESULT
  | ACTION_GO_TO_SEARCH_RESULT
  | ACTION_HANDLE_STORE_MUTATION
  | ACTION_RESET_OWNER_STACK
  | ACTION_SELECT_CHILD_ELEMENT_IN_TREE
  | ACTION_SELECT_ELEMENT_AT_INDEX
  | ACTION_SELECT_ELEMENT_BY_ID
  | ACTION_SELECT_NEXT_ELEMENT_IN_TREE
  | ACTION_SELECT_NEXT_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE
  | ACTION_SELECT_NEXT_SIBLING_IN_TREE
  | ACTION_SELECT_OWNER
  | ACTION_SELECT_PARENT_ELEMENT_IN_TREE
  | ACTION_SELECT_PREVIOUS_ELEMENT_IN_TREE
  | ACTION_SELECT_PREVIOUS_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE
  | ACTION_SELECT_PREVIOUS_SIBLING_IN_TREE
  | ACTION_SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE
  | ACTION_SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE
  | ACTION_SET_SEARCH_TEXT;

export type DispatcherContext = (action: Action) => void;

const TreeStateContext: ReactContext<StateContext> =
  createContext<StateContext>(null as any as StateContext);
TreeStateContext.displayName = 'TreeStateContext';

// TODO: `dispatch` is an Action and should be named accordingly.
const TreeDispatcherContext: ReactContext<DispatcherContext> =
  createContext<DispatcherContext>(null as any as DispatcherContext);
TreeDispatcherContext.displayName = 'TreeDispatcherContext';

type State = {
  // Tree
  numElements: number,
  ownerSubtreeLeafElementID: number | null,

  // Search
  searchIndex: number | null,
  searchResults: Array<number>,
  searchText: string,

  // Owners
  ownerID: number | null,
  ownerFlatTree: Array<Element> | null,

  // Activity slice
  activityID: Element['id'] | null,
  activities: $ReadOnlyArray<{id: Element['id'], depth: number}>,

  // Inspection element panel
  inspectedElementID: number | null,
  inspectedElementIndex: number | null,
};

function reduceTreeState(store: Store, state: State, action: Action): State {
  let {
    numElements,
    ownerSubtreeLeafElementID,
    inspectedElementID,
    inspectedElementIndex,
  } = state;
  const ownerID = state.ownerID;

  let lookupIDForIndex = true;

  // Base tree should ignore selected element changes when the owner's tree is active.
  if (ownerID === null) {
    switch (action.type) {
      case 'HANDLE_STORE_MUTATION':
        numElements = store.numElements;

        // If the currently-selected Element has been removed from the tree, update selection state.
        const removedIDs = action.payload[1];
        // Find the closest parent that wasn't removed during this batch.
        // We deduce the parent-child mapping from removedIDs (id -> parentID)
        // because by now it's too late to read them from the store.
        while (
          inspectedElementID !== null &&
          removedIDs.has(inspectedElementID)
        ) {
          // $FlowExpectedError[incompatible-type]
          inspectedElementID = removedIDs.get(inspectedElementID);
        }
        if (inspectedElementID === 0) {
          // The whole root was removed.
          inspectedElementIndex = null;
        }
        break;
      case 'SELECT_CHILD_ELEMENT_IN_TREE':
        ownerSubtreeLeafElementID = null;

        if (inspectedElementIndex !== null) {
          const inspectedElement = store.getElementAtIndex(
            inspectedElementIndex,
          );
          if (
            inspectedElement !== null &&
            inspectedElement.children.length > 0 &&
            !inspectedElement.isCollapsed
          ) {
            const firstChildID = inspectedElement.children[0];
            const firstChildIndex = store.getIndexOfElementID(firstChildID);
            if (firstChildIndex !== null) {
              inspectedElementIndex = firstChildIndex;
            }
          }
        }
        break;
      case 'SELECT_ELEMENT_AT_INDEX':
        ownerSubtreeLeafElementID = null;

        inspectedElementIndex = (action as ACTION_SELECT_ELEMENT_AT_INDEX)
          .payload;
        break;
      case 'SELECT_ELEMENT_BY_ID':
        ownerSubtreeLeafElementID = null;

        // Skip lookup in this case; it would be redundant.
        // It might also cause problems if the specified element was inside of a (not yet expanded) subtree.
        lookupIDForIndex = false;

        inspectedElementID = (action as ACTION_SELECT_ELEMENT_BY_ID).payload;
        inspectedElementIndex =
          inspectedElementID === null
            ? null
            : store.getIndexOfElementID(inspectedElementID);
        break;
      case 'SELECT_NEXT_ELEMENT_IN_TREE':
        ownerSubtreeLeafElementID = null;

        if (
          inspectedElementIndex === null ||
          inspectedElementIndex + 1 >= numElements
        ) {
          inspectedElementIndex = 0;
        } else {
          inspectedElementIndex++;
        }
        break;
      case 'SELECT_NEXT_SIBLING_IN_TREE':
        ownerSubtreeLeafElementID = null;

        if (inspectedElementIndex !== null) {
          const selectedElement = store.getElementAtIndex(
            inspectedElementIndex as any as number,
          );
          if (selectedElement !== null && selectedElement.parentID !== 0) {
            const parent = store.getElementByID(selectedElement.parentID);
            if (parent !== null) {
              const {children} = parent;
              const selectedChildIndex = children.indexOf(selectedElement.id);
              const nextChildID =
                selectedChildIndex < children.length - 1
                  ? children[selectedChildIndex + 1]
                  : children[0];
              inspectedElementIndex = store.getIndexOfElementID(nextChildID);
            }
          }
        }
        break;
      case 'SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE':
        if (inspectedElementIndex !== null) {
          if (
            ownerSubtreeLeafElementID !== null &&
            ownerSubtreeLeafElementID !== inspectedElementID
          ) {
            const leafElement = store.getElementByID(ownerSubtreeLeafElementID);
            if (leafElement !== null) {
              let currentElement: null | Element = leafElement;
              while (currentElement !== null) {
                if (currentElement.ownerID === inspectedElementID) {
                  inspectedElementIndex = store.getIndexOfElementID(
                    currentElement.id,
                  );
                  break;
                } else if (currentElement.ownerID !== 0) {
                  currentElement = store.getElementByID(currentElement.ownerID);
                }
              }
            }
          }
        }
        break;
      case 'SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE':
        if (inspectedElementIndex !== null) {
          if (ownerSubtreeLeafElementID === null) {
            // If this is the first time we're stepping through the owners tree,
            // pin the current component as the owners list leaf.
            // This will enable us to step back down to this component.
            ownerSubtreeLeafElementID = inspectedElementID;
          }

          const selectedElement = store.getElementAtIndex(
            inspectedElementIndex as any as number,
          );
          if (selectedElement !== null && selectedElement.ownerID !== 0) {
            const ownerIndex = store.getIndexOfElementID(
              selectedElement.ownerID,
            );
            if (ownerIndex !== null) {
              inspectedElementIndex = ownerIndex;
            }
          }
        }
        break;
      case 'SELECT_PARENT_ELEMENT_IN_TREE':
        ownerSubtreeLeafElementID = null;

        if (inspectedElementIndex !== null) {
          const selectedElement = store.getElementAtIndex(
            inspectedElementIndex as any as number,
          );
          if (selectedElement !== null && selectedElement.parentID !== 0) {
            const parentIndex = store.getIndexOfElementID(
              selectedElement.parentID,
            );
            if (parentIndex !== null) {
              inspectedElementIndex = parentIndex;
            }
          }
        }
        break;
      case 'SELECT_PREVIOUS_ELEMENT_IN_TREE':
        ownerSubtreeLeafElementID = null;

        if (inspectedElementIndex === null || inspectedElementIndex === 0) {
          inspectedElementIndex = numElements - 1;
        } else {
          inspectedElementIndex--;
        }
        break;
      case 'SELECT_PREVIOUS_SIBLING_IN_TREE':
        ownerSubtreeLeafElementID = null;

        if (inspectedElementIndex !== null) {
          const selectedElement = store.getElementAtIndex(
            inspectedElementIndex as any as number,
          );
          if (selectedElement !== null && selectedElement.parentID !== 0) {
            const parent = store.getElementByID(selectedElement.parentID);
            if (parent !== null) {
              const {children} = parent;
              const selectedChildIndex = children.indexOf(selectedElement.id);
              const nextChildID =
                selectedChildIndex > 0
                  ? children[selectedChildIndex - 1]
                  : children[children.length - 1];
              inspectedElementIndex = store.getIndexOfElementID(nextChildID);
            }
          }
        }
        break;
      case 'SELECT_PREVIOUS_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE': {
        const elementIndicesWithErrorsOrWarnings =
          store.getElementsWithErrorsAndWarnings();
        if (elementIndicesWithErrorsOrWarnings.length === 0) {
          return state;
        }

        let flatIndex = 0;
        if (inspectedElementIndex !== null) {
          // Resume from the current position in the list.
          // Otherwise step to the previous item, relative to the current selection.
          for (
            let i = elementIndicesWithErrorsOrWarnings.length - 1;
            i >= 0;
            i--
          ) {
            const {index} = elementIndicesWithErrorsOrWarnings[i];
            if (index >= inspectedElementIndex) {
              flatIndex = i;
            } else {
              break;
            }
          }
        }

        let prevEntry;
        if (flatIndex === 0) {
          prevEntry =
            elementIndicesWithErrorsOrWarnings[
              elementIndicesWithErrorsOrWarnings.length - 1
            ];
          inspectedElementID = prevEntry.id;
          inspectedElementIndex = prevEntry.index;
        } else {
          prevEntry = elementIndicesWithErrorsOrWarnings[flatIndex - 1];
          inspectedElementID = prevEntry.id;
          inspectedElementIndex = prevEntry.index;
        }

        lookupIDForIndex = false;
        break;
      }
      case 'SELECT_NEXT_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE': {
        const elementIndicesWithErrorsOrWarnings =
          store.getElementsWithErrorsAndWarnings();
        if (elementIndicesWithErrorsOrWarnings.length === 0) {
          return state;
        }

        let flatIndex = -1;
        if (inspectedElementIndex !== null) {
          // Resume from the current position in the list.
          // Otherwise step to the next item, relative to the current selection.
          for (let i = 0; i < elementIndicesWithErrorsOrWarnings.length; i++) {
            const {index} = elementIndicesWithErrorsOrWarnings[i];
            if (index <= inspectedElementIndex) {
              flatIndex = i;
            } else {
              break;
            }
          }
        }

        let nextEntry;
        if (flatIndex >= elementIndicesWithErrorsOrWarnings.length - 1) {
          nextEntry = elementIndicesWithErrorsOrWarnings[0];
          inspectedElementID = nextEntry.id;
          inspectedElementIndex = nextEntry.index;
        } else {
          nextEntry = elementIndicesWithErrorsOrWarnings[flatIndex + 1];
          inspectedElementID = nextEntry.id;
          inspectedElementIndex = nextEntry.index;
        }

        lookupIDForIndex = false;
        break;
      }
      default:
        // React can bailout of no-op updates.
        return state;
    }
  }

  // Keep selected item ID and index in sync.
  if (
    lookupIDForIndex &&
    inspectedElementIndex !== state.inspectedElementIndex
  ) {
    if (inspectedElementIndex === null) {
      inspectedElementID = null;
    } else {
      inspectedElementID = store.getElementIDAtIndex(
        inspectedElementIndex as any as number,
      );
    }
  }

  return {
    ...state,

    numElements,
    ownerSubtreeLeafElementID,
    inspectedElementIndex,
    inspectedElementID,
  };
}

function reduceSearchState(store: Store, state: State, action: Action): State {
  let {
    searchIndex,
    searchResults,
    searchText,
    inspectedElementID,
    inspectedElementIndex,
  } = state;
  const ownerID = state.ownerID;

  const prevSearchIndex = searchIndex;
  const prevSearchText = searchText;
  const numPrevSearchResults = searchResults.length;

  // We track explicitly whether search was requested because
  // we might want to search even if search index didn't change.
  // For example, if you press "next result" on a search with a single
  // result but a different current selection, we'll set this to true.
  let didRequestSearch = false;

  // Search isn't supported when the owner's tree is active.
  if (ownerID === null) {
    switch (action.type) {
      case 'GO_TO_NEXT_SEARCH_RESULT':
        if (numPrevSearchResults > 0) {
          didRequestSearch = true;
          searchIndex =
            // $FlowFixMe[unsafe-addition] addition with possible null/undefined value
            searchIndex + 1 < numPrevSearchResults ? searchIndex + 1 : 0;
        }
        break;
      case 'GO_TO_PREVIOUS_SEARCH_RESULT':
        if (numPrevSearchResults > 0) {
          didRequestSearch = true;
          searchIndex =
            (searchIndex as any as number) > 0
              ? (searchIndex as any as number) - 1
              : numPrevSearchResults - 1;
        }
        break;
      case 'GO_TO_SEARCH_RESULT':
        if (numPrevSearchResults > 0) {
          didRequestSearch = true;
          // Jump directly to a specific result (0-based), clamped to range.
          // This lets users skip past large virtualized lists instead of
          // stepping through results one at a time.
          const targetIndex = (action as ACTION_GO_TO_SEARCH_RESULT).payload;
          searchIndex = Math.max(
            0,
            Math.min(targetIndex, numPrevSearchResults - 1),
          );
        }
        break;
      case 'HANDLE_STORE_MUTATION':
        if (searchText !== '') {
          const [addedElementIDs, removedElementIDs] = (
            action as ACTION_HANDLE_STORE_MUTATION
          ).payload;

          removedElementIDs.forEach((parentID, id) => {
            // Prune this item from the search results.
            const index = searchResults.indexOf(id);
            if (index >= 0) {
              searchResults = searchResults
                .slice(0, index)
                .concat(searchResults.slice(index + 1));

              // If the results are now empty, also deselect things.
              if (searchResults.length === 0) {
                searchIndex = null;
              } else if (
                (searchIndex as any as number) >= searchResults.length
              ) {
                searchIndex = searchResults.length - 1;
              }
            }
          });

          addedElementIDs.forEach(id => {
            const element = store.getElementByID(id) as any as Element;

            // It's possible that multiple tree operations will fire before this action has run.
            // So it's important to check for elements that may have been added and then removed.
            // $FlowFixMe[invalid-compare]
            if (element !== null) {
              const {displayName} = element;

              // Add this item to the search results if it matches.
              const regExp = createRegExp(searchText);
              if (displayName !== null && regExp.test(displayName)) {
                const newElementIndex = store.getIndexOfElementID(
                  id,
                ) as any as number;

                let foundMatch = false;
                for (let index = 0; index < searchResults.length; index++) {
                  const resultID = searchResults[index];
                  if (
                    newElementIndex <
                    (store.getIndexOfElementID(resultID) as any as number)
                  ) {
                    foundMatch = true;
                    searchResults = searchResults
                      .slice(0, index)
                      .concat(resultID)
                      .concat(searchResults.slice(index));
                    break;
                  }
                }
                if (!foundMatch) {
                  searchResults = searchResults.concat(id);
                }

                searchIndex = searchIndex === null ? 0 : searchIndex;
              }
            }
          });
        }
        break;
      case 'SET_SEARCH_TEXT':
        searchIndex = null;
        searchResults = [];
        searchText = (action as ACTION_SET_SEARCH_TEXT).payload;

        if (searchText !== '') {
          const regExp = createRegExp(searchText);
          store.roots.forEach(rootID => {
            recursivelySearchTree(store, rootID, regExp, searchResults);
          });
          if (searchResults.length > 0) {
            if (prevSearchIndex === null) {
              if (inspectedElementIndex !== null) {
                searchIndex = getNearestResultIndex(
                  store,
                  searchResults,
                  inspectedElementIndex,
                );
              } else {
                searchIndex = 0;
              }
            } else {
              searchIndex = Math.min(
                prevSearchIndex as any as number,
                searchResults.length - 1,
              );
            }
          }
        }
        break;
      default:
        // React can bailout of no-op updates.
        return state;
    }
  }

  if (searchText !== prevSearchText) {
    // $FlowFixMe[incompatible-type]
    const newSearchIndex = searchResults.indexOf(inspectedElementID);
    if (prevSearchText === '') {
      // Starting a fresh search (e.g. after clearing the box). Honor the index
      // computed above, which uses "find next" semantics so that retyping the
      // same query advances past the still-selected result instead of snapping
      // back to it.
      if (searchIndex !== null) {
        didRequestSearch = true;
      }
    } else if (newSearchIndex === -1) {
      // Refining an existing query and the current selection no longer matches,
      // so move the selection to the nearest result.
      didRequestSearch = true;
    } else {
      // Refining an existing query and the current selection still matches.
      // Keep it selected and adjust the index to its position in new results.
      searchIndex = newSearchIndex;
    }
  }
  if (didRequestSearch && searchIndex !== null) {
    inspectedElementID = searchResults[searchIndex] as any as number;
    inspectedElementIndex = store.getIndexOfElementID(
      inspectedElementID as any as number,
    );
  }

  return {
    ...state,

    inspectedElementID,
    inspectedElementIndex,

    searchIndex,
    searchResults,
    searchText,
  };
}

function reduceOwnersState(store: Store, state: State, action: Action): State {
  let {
    numElements,
    ownerID,
    ownerFlatTree,
    inspectedElementID,
    inspectedElementIndex,
  } = state;
  const {searchIndex, searchResults, searchText} = state;

  let prevInspectedElementIndex = inspectedElementIndex;

  switch (action.type) {
    case 'HANDLE_STORE_MUTATION':
      if (ownerID !== null) {
        if (!store.containsElement(ownerID)) {
          ownerID = null;
          ownerFlatTree = null;
          prevInspectedElementIndex = null;
        } else {
          ownerFlatTree = store.getOwnersListForElement(ownerID);
          if (inspectedElementID !== null) {
            // Mutation might have caused the index of this ID to shift.
            prevInspectedElementIndex = ownerFlatTree.findIndex(
              element => element.id === inspectedElementID,
            );
          }
        }
      } else {
        if (inspectedElementID !== null) {
          // Mutation might have caused the index of this ID to shift.
          inspectedElementIndex = store.getIndexOfElementID(inspectedElementID);
        }
      }
      if (inspectedElementIndex === -1) {
        // If we couldn't find this ID after mutation, unselect it.
        inspectedElementIndex = null;
        inspectedElementID = null;
      }
      break;
    case 'RESET_OWNER_STACK':
      ownerID = null;
      ownerFlatTree = null;
      inspectedElementIndex =
        inspectedElementID !== null
          ? store.getIndexOfElementID(inspectedElementID)
          : null;
      break;
    case 'SELECT_ELEMENT_AT_INDEX':
      if (ownerFlatTree !== null) {
        inspectedElementIndex = (action as ACTION_SELECT_ELEMENT_AT_INDEX)
          .payload;
      }
      break;
    case 'SELECT_ELEMENT_BY_ID':
      if (ownerFlatTree !== null) {
        const payload = (action as ACTION_SELECT_ELEMENT_BY_ID).payload;
        if (payload === null) {
          inspectedElementIndex = null;
        } else {
          inspectedElementIndex = ownerFlatTree.findIndex(
            element => element.id === payload,
          );

          // If the selected element is outside of the current owners list,
          // exit the list and select the element in the main tree.
          // This supports features like toggling Suspense.
          // $FlowFixMe[invalid-compare]
          if (inspectedElementIndex !== null && inspectedElementIndex < 0) {
            ownerID = null;
            ownerFlatTree = null;
            inspectedElementIndex = store.getIndexOfElementID(payload);
          }
        }
      }
      break;
    case 'SELECT_NEXT_ELEMENT_IN_TREE':
      if (ownerFlatTree !== null && ownerFlatTree.length > 0) {
        if (inspectedElementIndex === null) {
          inspectedElementIndex = 0;
        } else if (inspectedElementIndex + 1 < ownerFlatTree.length) {
          inspectedElementIndex++;
        }
      }
      break;
    case 'SELECT_PREVIOUS_ELEMENT_IN_TREE':
      if (ownerFlatTree !== null && ownerFlatTree.length > 0) {
        if (inspectedElementIndex !== null && inspectedElementIndex > 0) {
          inspectedElementIndex--;
        }
      }
      break;
    case 'SELECT_OWNER':
      // If the Store doesn't have any owners metadata, don't drill into an empty stack.
      // This is a confusing user experience.
      if (store.hasOwnerMetadata) {
        ownerID = (action as ACTION_SELECT_OWNER).payload;
        ownerFlatTree = store.getOwnersListForElement(ownerID);

        // Always force reset selection to be the top of the new owner tree.
        inspectedElementIndex = 0;
        prevInspectedElementIndex = null;
      }
      break;
    default:
      // React can bailout of no-op updates.
      return state;
  }

  // Changes in the selected owner require re-calculating the owners tree.
  if (
    ownerFlatTree !== state.ownerFlatTree ||
    action.type === 'HANDLE_STORE_MUTATION'
  ) {
    if (ownerFlatTree === null) {
      numElements = store.numElements;
    } else {
      numElements = ownerFlatTree.length;
    }
  }

  // Keep selected item ID and index in sync.
  if (inspectedElementIndex !== prevInspectedElementIndex) {
    if (inspectedElementIndex === null) {
      inspectedElementID = null;
    } else {
      if (ownerFlatTree !== null) {
        inspectedElementID = ownerFlatTree[inspectedElementIndex].id;
      }
    }
  }

  return {
    ...state,

    numElements,

    searchIndex,
    searchResults,
    searchText,

    ownerID,
    ownerFlatTree,

    inspectedElementID,
    inspectedElementIndex,
  };
}

function reduceActivityState(
  store: Store,
  state: State,
  action: Action,
): State {
  switch (action.type) {
    case 'HANDLE_STORE_MUTATION':
      let {activityID} = state;
      const [, , activitySliceIDChange] = action.payload;
      const activities = store.getActivities();
      if (activitySliceIDChange === 0 && activityID !== null) {
        activityID = null;
      } else if (
        activitySliceIDChange !== null &&
        activitySliceIDChange !== activityID
      ) {
        activityID = activitySliceIDChange;
      }
      if (activityID !== state.activityID || activities !== state.activities) {
        return {
          ...state,
          activityID,
          activities,
        };
      }
  }
  return state;
}

type Props = {
  children: React$Node,

  // Used for automated testing
  defaultOwnerID?: ?number,
  defaultInspectedElementID?: ?number,
  defaultInspectedElementIndex?: ?number,
};

function getInitialState({
  defaultOwnerID,
  defaultInspectedElementID,
  defaultInspectedElementIndex,
  store,
}: {
  defaultOwnerID?: ?number,
  defaultInspectedElementID?: ?number,
  defaultInspectedElementIndex?: ?number,
  store: Store,
}): State {
  return {
    // Tree
    numElements: store.numElements,
    ownerSubtreeLeafElementID: null,

    // Search
    searchIndex: null,
    searchResults: [],
    searchText: '',

    // Owners
    ownerID: defaultOwnerID == null ? null : defaultOwnerID,
    ownerFlatTree: null,

    // Activity slice
    activityID: null,
    activities: store.getActivities(),

    // Inspection element panel
    inspectedElementID:
      defaultInspectedElementID != null
        ? defaultInspectedElementID
        : store.lastSelectedHostInstanceElementId,
    inspectedElementIndex:
      defaultInspectedElementIndex != null
        ? defaultInspectedElementIndex
        : store.lastSelectedHostInstanceElementId
          ? store.getIndexOfElementID(store.lastSelectedHostInstanceElementId)
          : null,
  };
}

// TODO Remove TreeContextController wrapper element once global Context.write API exists.
function TreeContextController({
  children,
  defaultOwnerID,
  defaultInspectedElementID,
  defaultInspectedElementIndex,
}: Props): React.Node {
  const store = useContext(StoreContext);

  const initialRevision = useMemo(() => store.revision, [store]);

  // This reducer is created inline because it needs access to the Store.
  // The store is mutable, but the Store itself is global and lives for the lifetime of the DevTools,
  // so it's okay for the reducer to have an empty dependencies array.
  const reducer = useMemo(
    () =>
      (state: State, action: Action): State => {
        const {type} = action;
        switch (type) {
          case 'GO_TO_NEXT_SEARCH_RESULT':
          case 'GO_TO_PREVIOUS_SEARCH_RESULT':
          case 'GO_TO_SEARCH_RESULT':
          case 'HANDLE_STORE_MUTATION':
          case 'RESET_OWNER_STACK':
          case 'SELECT_ELEMENT_AT_INDEX':
          case 'SELECT_ELEMENT_BY_ID':
          case 'SELECT_CHILD_ELEMENT_IN_TREE':
          case 'SELECT_NEXT_ELEMENT_IN_TREE':
          case 'SELECT_NEXT_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE':
          case 'SELECT_NEXT_SIBLING_IN_TREE':
          case 'SELECT_OWNER_LIST_NEXT_ELEMENT_IN_TREE':
          case 'SELECT_OWNER_LIST_PREVIOUS_ELEMENT_IN_TREE':
          case 'SELECT_PARENT_ELEMENT_IN_TREE':
          case 'SELECT_PREVIOUS_ELEMENT_IN_TREE':
          case 'SELECT_PREVIOUS_ELEMENT_WITH_ERROR_OR_WARNING_IN_TREE':
          case 'SELECT_PREVIOUS_SIBLING_IN_TREE':
          case 'SELECT_OWNER':
          case 'SET_SEARCH_TEXT':
            state = reduceTreeState(store, state, action);
            state = reduceSearchState(store, state, action);
            state = reduceOwnersState(store, state, action);
            state = reduceActivityState(store, state, action);

            // TODO(hoxyq): review
            // If the selected ID is in a collapsed subtree, reset the selected index to null.
            // We'll know the correct index after the layout effect will toggle the tree,
            // and the store tree is mutated to account for that.
            if (
              state.inspectedElementID !== null &&
              store.isInsideCollapsedSubTree(state.inspectedElementID)
            ) {
              return {
                ...state,
                inspectedElementIndex: null,
              };
            }

            return state;
          default:
            throw new Error(`Unrecognized action "${type}"`);
        }
      },
    [store],
  );

  const [state, dispatch] = useReducer(
    reducer,
    {
      defaultOwnerID,
      defaultInspectedElementID,
      defaultInspectedElementIndex,
      store,
    },
    getInitialState,
  );
  const transitionDispatch = useMemo(
    () => (action: Action) =>
      startTransition(() => {
        dispatch(action);
      }),
    [dispatch],
  );

  // Listen for host element selections.
  useEffect(() => {
    const handler = (id: Element['id'] | null) => {
      transitionDispatch({type: 'SELECT_ELEMENT_BY_ID', payload: id});
    };

    store.addListener('hostInstanceSelected', handler);
    return () => store.removeListener('hostInstanceSelected', handler);
  }, [store, transitionDispatch]);

  // If a newly-selected search result or inspection selection is inside of a collapsed subtree, auto expand it.
  // This needs to be a layout effect to avoid temporarily flashing an incorrect selection.
  const prevInspectedElementID = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (state.inspectedElementID !== prevInspectedElementID.current) {
      prevInspectedElementID.current = state.inspectedElementID;

      if (state.inspectedElementID !== null) {
        const element = store.getElementByID(state.inspectedElementID);
        if (element !== null && element.parentID > 0) {
          store.toggleIsCollapsed(element.parentID, false);
        }
      }
    }
  }, [state.inspectedElementID, store]);

  // Mutations to the underlying tree may impact this context (e.g. search results, selection state).
  useEffect(() => {
    const handleStoreMutated = ([
      addedElementIDs,
      removedElementIDs,
      activitySliceIDChange,
    ]: [Array<number>, Map<number, number>, null | Element['id']]) => {
      dispatch({
        type: 'HANDLE_STORE_MUTATION',
        payload: [addedElementIDs, removedElementIDs, activitySliceIDChange],
      });
    };

    // Since this is a passive effect, the tree may have been mutated before our initial subscription.
    if (store.revision !== initialRevision) {
      // At the moment, we can treat this as a mutation.
      // We don't know which Elements were newly added/removed, but that should be okay in this case.
      // It would only impact the search state, which is unlikely to exist yet at this point.
      dispatch({
        type: 'HANDLE_STORE_MUTATION',
        payload: [[], new Map(), null],
      });
    }

    store.addListener('mutated', handleStoreMutated);
    return () => store.removeListener('mutated', handleStoreMutated);
  }, [dispatch, initialRevision, store]);

  return (
    <TreeStateContext.Provider value={state}>
      <TreeDispatcherContext.Provider value={transitionDispatch}>
        {children}
      </TreeDispatcherContext.Provider>
    </TreeStateContext.Provider>
  );
}
function recursivelySearchTree(
  store: Store,
  elementID: number,
  regExp: RegExp,
  searchResults: Array<number>,
): void {
  const element = store.getElementByID(elementID);

  if (element == null) {
    return;
  }

  const {
    children,
    displayName,
    hocDisplayNames,
    compiledWithForget,
    key,
    nameProp,
  } = element;
  if (displayName != null && regExp.test(displayName) === true) {
    searchResults.push(elementID);
  } else if (
    hocDisplayNames != null &&
    hocDisplayNames.length > 0 &&
    hocDisplayNames.some(name => regExp.test(name)) === true
  ) {
    searchResults.push(elementID);
  } else if (compiledWithForget && regExp.test('Forget')) {
    searchResults.push(elementID);
  } else if (typeof key === 'string' && regExp.test(key)) {
    searchResults.push(elementID);
  } else if (typeof nameProp === 'string' && regExp.test(nameProp)) {
    searchResults.push(elementID);
  }

  children.forEach(childID =>
    recursivelySearchTree(store, childID, regExp, searchResults),
  );
}

function getNearestResultIndex(
  store: Store,
  searchResults: Array<number>,
  inspectedElementIndex: number,
): number {
  // When the currently selected element is itself a match for the new query
  // (e.g. you cleared the search and retyped the same text while a result was
  // still selected), advance to the *next* match instead of snapping back to
  // the same component. This mirrors "find next" semantics in browsers/editors
  // and avoids the search feeling stuck on the same result.
  const selectedIsResult = searchResults.some(
    id => store.getIndexOfElementID(id) === inspectedElementIndex,
  );

  const index = searchResults.findIndex(id => {
    const innerIndex = store.getIndexOfElementID(id);
    if (innerIndex === null) {
      return false;
    }
    return selectedIsResult
      ? innerIndex > inspectedElementIndex
      : innerIndex >= inspectedElementIndex;
  });

  return index === -1 ? 0 : index;
}

export {TreeDispatcherContext, TreeStateContext, TreeContextController};
