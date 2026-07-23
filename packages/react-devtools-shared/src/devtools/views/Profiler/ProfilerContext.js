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
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';
import {useLocalStorage, useSubscription} from '../hooks';
import {
  TreeDispatcherContext,
  TreeStateContext,
} from '../Components/TreeContext';
import {StoreContext} from '../context';
import {createRegExp} from '../utils';
import {logEvent} from 'react-devtools-shared/src/Logger';
import {useCommitFilteringAndNavigation} from './useCommitFilteringAndNavigation';

import type {CommitDataFrontend, ProfilingDataFrontend} from './types';

export type TabID = 'flame-chart' | 'ranked-chart' | 'timeline';

type SearchResult = {id: number, name: string | null};

export type Context = {
  // Which tab is selected in the Profiler UI?
  selectedTabID: TabID,
  selectTab(id: TabID): void,

  // Store subscription based values.
  // The isProfiling value may be modified by the record button in the Profiler toolbar,
  // or from the backend itself (after a reload-and-profile action).
  // It is synced between the backend and frontend via a Store subscription.
  didRecordCommits: boolean,
  isProcessingData: boolean,
  isProfiling: boolean,
  profilingData: ProfilingDataFrontend | null,
  startProfiling(): void,
  stopProfiling(): void,
  supportsProfiling: boolean,

  // Which root should profiling data be shown for?
  // This value should be initialized to either:
  // 1. The selected root in the Components tree (if it has any profiling data) or
  // 2. The first root in the list with profiling data.
  rootID: number | null,
  setRootID: (id: number) => void,

  // Controls whether commits are filtered by duration.
  // This value is controlled by a filter toggle UI in the Profiler toolbar.
  // It impacts the commit selector UI as well as the fiber commits bar chart.
  isCommitFilterEnabled: boolean,
  setIsCommitFilterEnabled: (value: boolean) => void,
  minCommitDuration: number,
  setMinCommitDuration: (value: number) => void,

  // Which commit is currently selected in the commit selector UI.
  // Note that this is the index of the commit in all commits (non-filtered) that were profiled.
  // This value is controlled by the commit selector UI in the Profiler toolbar.
  // It impacts the flame graph and ranked charts.
  selectedCommitIndex: number | null,
  selectCommitIndex: (value: number | null) => void,
  selectNextCommitIndex(): void,
  selectPrevCommitIndex(): void,

  // Which commits are currently filtered by duration?
  filteredCommitIndices: Array<number>,
  selectedFilteredCommitIndex: number | null,

  // Which fiber is currently selected in the Ranked or Flamegraph charts?
  selectedFiberID: number | null,
  selectedFiberName: string | null,
  selectFiber: (id: number | null, name: string | null) => void,

  // Component search within the currently selected commit.
  // Toggled by Cmd/Ctrl+F in the flame graph and ranked charts.
  // Unlike the Components tab, results are scoped to the selected commit only.
  isSearchInputVisible: boolean,
  showSearchInput(): void,
  hideSearchInput(): void,
  searchText: string,
  setSearchText: (text: string) => void,
  searchResults: Array<SearchResult>,
  searchIndex: number,
  goToNextSearchResult(): void,
  goToPreviousSearchResult(): void,
};

const ProfilerContext: ReactContext<Context> = createContext<Context>(
  null as any as Context,
);
ProfilerContext.displayName = 'ProfilerContext';

type StoreProfilingState = {
  didRecordCommits: boolean,
  isProcessingData: boolean,
  isProfiling: boolean,
  profilingData: ProfilingDataFrontend | null,
  supportsProfiling: boolean,
};

type Props = {
  children: React$Node,
};

function ProfilerContextController({children}: Props): React.Node {
  const store = useContext(StoreContext);
  const {inspectedElementID} = useContext(TreeStateContext);
  const dispatch = useContext(TreeDispatcherContext);

  const {profilerStore} = store;

  const subscription = useMemo(
    () => ({
      getCurrentValue: () => ({
        didRecordCommits: profilerStore.didRecordCommits,
        isProcessingData: profilerStore.isProcessingData,
        isProfiling: profilerStore.isProfilingBasedOnUserInput,
        profilingData: profilerStore.profilingData,
        supportsProfiling: store.rootSupportsBasicProfiling,
      }),
      subscribe: (callback: Function) => {
        profilerStore.addListener('profilingData', callback);
        profilerStore.addListener('isProcessingData', callback);
        profilerStore.addListener('isProfiling', callback);
        store.addListener('rootSupportsBasicProfiling', callback);
        return () => {
          profilerStore.removeListener('profilingData', callback);
          profilerStore.removeListener('isProcessingData', callback);
          profilerStore.removeListener('isProfiling', callback);
          store.removeListener('rootSupportsBasicProfiling', callback);
        };
      },
    }),
    [profilerStore, store],
  );
  const {
    didRecordCommits,
    isProcessingData,
    isProfiling,
    profilingData,
    supportsProfiling,
  } = useSubscription<StoreProfilingState>(subscription);

  const [prevProfilingData, setPrevProfilingData] =
    useState<ProfilingDataFrontend | null>(null);
  const [rootID, setRootID] = useState<number | null>(null);
  const [selectedFiberID, selectFiberID] = useState<number | null>(null);
  const [selectedFiberName, selectFiberName] = useState<string | null>(null);

  // Component search (scoped to the currently selected commit).
  const [isSearchInputVisible, setIsSearchInputVisible] =
    useState<boolean>(false);
  const [searchText, setSearchTextState] = useState<string>('');
  const [searchIndex, setSearchIndex] = useState<number>(-1);

  const selectFiber = useCallback(
    (id: number | null, name: string | null) => {
      selectFiberID(id);
      selectFiberName(name);

      // Sync selection to the Components tab for convenience.
      // Keep in mind that profiling data may be from a previous session.
      // If data has been imported, we should skip the selection sync.
      if (
        id !== null &&
        profilingData !== null &&
        profilingData.imported === false
      ) {
        // We should still check to see if this element is still in the store.
        // It may have been removed during profiling.
        if (store.containsElement(id)) {
          dispatch({
            type: 'SELECT_ELEMENT_BY_ID',
            payload: id,
          });
        }
      }
    },
    [dispatch, selectFiberID, selectFiberName, store, profilingData],
  );

  const setRootIDAndClearFiber = useCallback(
    (id: number | null) => {
      selectFiber(null, null);
      setRootID(id);
    },
    [setRootID, selectFiber],
  );

  // Sync rootID with profilingData changes.
  if (prevProfilingData !== profilingData) {
    setPrevProfilingData(profilingData);

    const dataForRoots =
      profilingData !== null ? profilingData.dataForRoots : null;
    if (dataForRoots != null) {
      const firstRootID = dataForRoots.keys().next().value || null;

      if (rootID === null || !dataForRoots.has(rootID)) {
        let selectedElementRootID = null;
        if (inspectedElementID !== null) {
          selectedElementRootID = store.getRootIDForElement(inspectedElementID);
        }
        if (
          selectedElementRootID !== null &&
          dataForRoots.has(selectedElementRootID)
        ) {
          setRootIDAndClearFiber(selectedElementRootID);
        } else {
          setRootIDAndClearFiber(firstRootID);
        }
      }
    }
  }

  const [selectedTabID, selectTab] = useLocalStorage<TabID>(
    'React::DevTools::Profiler::defaultTab',
    'flame-chart',
    value => {
      logEvent({
        event_name: 'profiler-tab-changed',
        metadata: {
          tabId: value,
        },
      });
    },
  );

  const stopProfiling = useCallback(
    () => store.profilerStore.stopProfiling(),
    [store],
  );

  // Get commit data for the current root
  // NOTE: Unlike profilerStore.getDataForRoot() which uses Suspense (throws when data unavailable),
  // this uses subscription pattern and returns [] when data isn't ready.
  // Always check didRecordCommits before using commitData or filteredCommitIndices.
  const commitData = useMemo(() => {
    if (!didRecordCommits || rootID === null || profilingData === null) {
      return [] as Array<CommitDataFrontend>;
    }
    const dataForRoot = profilingData.dataForRoots.get(rootID);
    return dataForRoot
      ? dataForRoot.commitData
      : ([] as Array<CommitDataFrontend>);
  }, [didRecordCommits, rootID, profilingData]);

  // Commit filtering and navigation
  const {
    isCommitFilterEnabled,
    setIsCommitFilterEnabled,
    minCommitDuration,
    setMinCommitDuration,
    selectedCommitIndex,
    selectCommitIndex,
    filteredCommitIndices,
    selectedFilteredCommitIndex,
    selectNextCommitIndex,
    selectPrevCommitIndex,
  } = useCommitFilteringAndNavigation(commitData);

  // Fibers in the selected commit matching `text`, in tree order.
  // Always scoped to the current commit, never the whole trace.
  const findMatches = useCallback(
    (text: string): Array<SearchResult> => {
      if (
        text === '' ||
        rootID === null ||
        selectedCommitIndex === null ||
        !didRecordCommits
      ) {
        return [];
      }

      const commitTree = profilerStore.profilingCache.getCommitTree({
        commitIndex: selectedCommitIndex,
        rootID,
      });
      const regExp = createRegExp(text);
      const matches: Array<SearchResult> = [];
      const walk = (id: number) => {
        const node = commitTree.nodes.get(id);
        if (node == null) {
          return;
        }
        const {displayName, hocDisplayNames, key} = node;
        if (
          (displayName !== null && regExp.test(displayName)) ||
          (hocDisplayNames !== null &&
            hocDisplayNames.some(name => regExp.test(name))) ||
          (key !== null && regExp.test(String(key)))
        ) {
          matches.push({id, name: displayName});
        }
        node.children.forEach(walk);
      };
      walk(commitTree.rootID);
      return matches;
    },
    [rootID, selectedCommitIndex, didRecordCommits, profilerStore],
  );

  const searchResults = useMemo<Array<SearchResult>>(
    () => findMatches(searchText),
    [findMatches, searchText],
  );

  const selectMatch = useCallback(
    (matches: Array<SearchResult>, index: number) => {
      if (index >= 0 && index < matches.length) {
        selectFiber(matches[index].id, matches[index].name);
      }
    },
    [selectFiber],
  );

  const setSearchText = useCallback(
    (text: string) => {
      setSearchTextState(text);
      // Match eagerly to jump to the first result; the memo above only updates
      // on the next render.
      const matches = findMatches(text);
      setSearchIndex(matches.length === 0 ? -1 : 0);
      if (matches.length > 0) {
        selectMatch(matches, 0);
      } else if (text !== '') {
        // A non-empty query with no matches: clear the now-stale selection so
        // the chart isn't left zoomed on an unrelated fiber.
        selectFiber(null, null);
      }
    },
    [findMatches, selectMatch, selectFiber],
  );

  const goToNextSearchResult = useCallback(() => {
    const count = searchResults.length;
    if (count === 0) {
      return;
    }
    // Clamp: the selected commit may have changed and shrunk the result set.
    const current = searchIndex < 0 || searchIndex >= count ? -1 : searchIndex;
    const nextIndex = current < 0 ? 0 : (current + 1) % count;
    setSearchIndex(nextIndex);
    selectMatch(searchResults, nextIndex);
  }, [searchResults, searchIndex, selectMatch]);

  const goToPreviousSearchResult = useCallback(() => {
    const count = searchResults.length;
    if (count === 0) {
      return;
    }
    const current =
      searchIndex < 0 || searchIndex >= count ? count : searchIndex;
    const prevIndex = current <= 0 ? count - 1 : current - 1;
    setSearchIndex(prevIndex);
    selectMatch(searchResults, prevIndex);
  }, [searchResults, searchIndex, selectMatch]);

  const showSearchInput = useCallback(() => setIsSearchInputVisible(true), []);

  const hideSearchInput = useCallback(() => {
    setIsSearchInputVisible(false);
    setSearchTextState('');
    setSearchIndex(-1);
  }, []);

  const startProfiling = useCallback(() => {
    logEvent({
      event_name: 'profiling-start',
      metadata: {current_tab: selectedTabID},
    });

    // Clear selections when starting a new profiling session
    selectCommitIndex(null);
    selectFiberID(null);
    selectFiberName(null);

    // Clear any active search from the previous session.
    setIsSearchInputVisible(false);
    setSearchTextState('');
    setSearchIndex(-1);

    store.profilerStore.startProfiling();
  }, [store, selectedTabID, selectCommitIndex]);

  // Auto-select first commit when profiling data becomes available and no commit is selected.
  useEffect(() => {
    if (
      profilingData !== null &&
      selectedCommitIndex === null &&
      rootID !== null
    ) {
      const dataForRoot = profilingData.dataForRoots.get(rootID);
      if (dataForRoot && dataForRoot.commitData.length > 0) {
        selectCommitIndex(0);
      }
    }
  }, [profilingData, rootID, selectCommitIndex]);

  const value = useMemo(
    () => ({
      selectedTabID,
      selectTab,

      didRecordCommits,
      isProcessingData,
      isProfiling,
      profilingData,
      startProfiling,
      stopProfiling,
      supportsProfiling,

      rootID,
      setRootID: setRootIDAndClearFiber,

      isCommitFilterEnabled,
      setIsCommitFilterEnabled,
      minCommitDuration,
      setMinCommitDuration,

      selectedCommitIndex,
      selectCommitIndex,
      selectNextCommitIndex,
      selectPrevCommitIndex,
      filteredCommitIndices,
      selectedFilteredCommitIndex,

      selectedFiberID,
      selectedFiberName,
      selectFiber,

      isSearchInputVisible,
      showSearchInput,
      hideSearchInput,
      searchText,
      setSearchText,
      searchResults,
      searchIndex,
      goToNextSearchResult,
      goToPreviousSearchResult,
    }),
    [
      selectedTabID,
      selectTab,

      didRecordCommits,
      isProcessingData,
      isProfiling,
      profilingData,
      startProfiling,
      stopProfiling,
      supportsProfiling,

      rootID,
      setRootIDAndClearFiber,

      isCommitFilterEnabled,
      setIsCommitFilterEnabled,
      minCommitDuration,
      setMinCommitDuration,

      selectedCommitIndex,
      selectCommitIndex,
      selectNextCommitIndex,
      selectPrevCommitIndex,
      filteredCommitIndices,
      selectedFilteredCommitIndex,

      selectedFiberID,
      selectedFiberName,
      selectFiber,

      isSearchInputVisible,
      showSearchInput,
      hideSearchInput,
      searchText,
      setSearchText,
      searchResults,
      searchIndex,
      goToNextSearchResult,
      goToPreviousSearchResult,
    ],
  );

  return (
    <ProfilerContext.Provider value={value}>
      {children}
    </ProfilerContext.Provider>
  );
}

export {ProfilerContext, ProfilerContextController};
