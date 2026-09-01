/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useState, useContext, useCallback} from 'react';

import SearchInput from 'react-devtools-shared/src/devtools/views/SearchInput';
import {
  TreeDispatcherContext,
  TreeStateContext,
} from 'react-devtools-shared/src/devtools/views/Components/TreeContext';

export default function ComponentSearchInput(): React.Node {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const {searchIndex, searchResults} = useContext(TreeStateContext);
  const transitionDispatch = useContext(TreeDispatcherContext);

  const search = useCallback(
    (text: string) => {
      setLocalSearchQuery(text);
      transitionDispatch({type: 'SET_SEARCH_TEXT', payload: text});
    },
    [setLocalSearchQuery, transitionDispatch],
  );
  const goToNextResult = useCallback(
    () => transitionDispatch({type: 'GO_TO_NEXT_SEARCH_RESULT'}),
    [transitionDispatch],
  );
  const goToPreviousResult = useCallback(
    () => transitionDispatch({type: 'GO_TO_PREVIOUS_SEARCH_RESULT'}),
    [transitionDispatch],
  );
  const goToResult = useCallback(
    (index: number) =>
      transitionDispatch({type: 'GO_TO_SEARCH_RESULT', payload: index}),
    [transitionDispatch],
  );

  return (
    <SearchInput
      goToNextResult={goToNextResult}
      goToPreviousResult={goToPreviousResult}
      goToResult={goToResult}
      placeholder="Search (text or /regex/)"
      search={search}
      searchIndex={searchIndex}
      searchResultsCount={searchResults.length}
      searchText={localSearchQuery}
      testName="ComponentSearchInput"
    />
  );
}
