/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';

import * as React from 'react';
import {createContext, useMemo, useReducer} from 'react';

import type {ReactComponentMeasure, TimelineData, ViewState} from './types';

type State = {
  profilerData: TimelineData,
  searchIndex: number,
  searchRegExp: RegExp | null,
  searchResults: Array<ReactComponentMeasure>,
  searchText: string,
};

type ACTION_GO_TO_NEXT_SEARCH_RESULT = {
  type: 'GO_TO_NEXT_SEARCH_RESULT',
};
type ACTION_GO_TO_PREVIOUS_SEARCH_RESULT = {
  type: 'GO_TO_PREVIOUS_SEARCH_RESULT',
};
type ACTION_SET_SEARCH_TEXT = {
  type: 'SET_SEARCH_TEXT',
  payload: string,
};

type Action =
  | ACTION_GO_TO_NEXT_SEARCH_RESULT
  | ACTION_GO_TO_PREVIOUS_SEARCH_RESULT
  | ACTION_SET_SEARCH_TEXT;

type Dispatch = (action: Action) => void;

const EMPTY_ARRAY: Array<ReactComponentMeasure> = [];

function reducer(state: State, action: Action): State {
  let {searchIndex, searchRegExp, searchResults, searchText} = state;

  switch (action.type) {
    case 'GO_TO_NEXT_SEARCH_RESULT':
      if (searchResults.length > 0) {
        if (searchIndex === -1 || searchIndex + 1 === searchResults.length) {
          searchIndex = 0;
        } else {
          searchIndex++;
        }
      }
      break;
    case 'GO_TO_PREVIOUS_SEARCH_RESULT':
      if (searchResults.length > 0) {
        if (searchIndex === -1 || searchIndex === 0) {
          searchIndex = searchResults.length - 1;
        } else {
          searchIndex--;
        }
      }
      break;
    case 'SET_SEARCH_TEXT':
      searchText = action.payload;
      searchRegExp = null;
      searchResults = [];

      if (searchText !== '') {
        const safeSearchText = searchText.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        );
        searchRegExp = new RegExp(`^${safeSearchText}`, 'i');

        // If something is zoomed in on already, and the new search still contains it,
        // don't change the selection (even if overall search results set changes).
        let prevSelectedMeasure = null;
        if (searchIndex >= 0 && searchResults.length > searchIndex) {
          prevSelectedMeasure = searchResults[searchIndex];
        }

        const componentMeasures = state.profilerData.componentMeasures;

        let prevSelectedMeasureIndex = -1;

        for (let i = 0; i < componentMeasures.length; i++) {
          const componentMeasure = componentMeasures[i];
          if (componentMeasure.componentName.match(searchRegExp)) {
            searchResults.push(componentMeasure);

            if (componentMeasure === prevSelectedMeasure) {
              prevSelectedMeasureIndex = searchResults.length - 1;
            }
          }
        }

        searchIndex =
          prevSelectedMeasureIndex >= 0 ? prevSelectedMeasureIndex : 0;
      }
      break;
  }

  return {
    profilerData: state.profilerData,
    searchIndex,
    searchRegExp,
    searchResults,
    searchText,
  };
}

export type Context = {
  profilerData: TimelineData,

  // Search state
  dispatch: Dispatch,
  searchIndex: number,
  searchRegExp: null,
  searchResults: Array<ReactComponentMeasure>,
  searchText: string,
};

const TimelineSearchContext: ReactContext<Context> = createContext<Context>(
  null as any as Context,
);
TimelineSearchContext.displayName = 'TimelineSearchContext';

type Props = {
  children: React$Node,
  profilerData: TimelineData,
  viewState: ViewState,
};

function TimelineSearchContextController({
  children,
  profilerData,
  viewState,
}: Props): React.Node {
  const [state, dispatch] = useReducer<State, State, Action>(reducer, {
    profilerData,
    searchIndex: -1,
    searchRegExp: null,
    searchResults: EMPTY_ARRAY,
    searchText: '',
  });

  const value = useMemo(
    () => ({
      ...state,
      dispatch,
    }),
    [state],
  );

  return (
    <TimelineSearchContext.Provider value={value}>
      {children}
    </TimelineSearchContext.Provider>
  );
}

export {TimelineSearchContext, TimelineSearchContextController};
