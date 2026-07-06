/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext} from 'react';

import SearchInput from 'react-devtools-shared/src/devtools/views/SearchInput';
import {ProfilerContext} from './ProfilerContext';

export default function ProfilerSearchInput(): React.Node {
  const {
    searchText,
    setSearchText,
    searchResults,
    searchIndex,
    goToNextSearchResult,
    goToPreviousSearchResult,
    hideSearchInput,
  } = useContext(ProfilerContext);

  return (
    <SearchInput
      autoFocus={true}
      goToNextResult={goToNextSearchResult}
      goToPreviousResult={goToPreviousSearchResult}
      onClose={hideSearchInput}
      placeholder="Search this commit (text or /regex/)"
      search={setSearchText}
      searchIndex={searchIndex}
      searchResultsCount={searchResults.length}
      searchText={searchText}
      testName="ProfilerSearchInput"
    />
  );
}
