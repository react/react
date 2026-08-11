/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {useCallback, useMemo, useState} from 'react';
import {useLocalStorage} from '../hooks';

import type {CommitDataFrontend} from './types';

export type CommitFilteringAndNavigation = {
  isCommitFilterEnabled: boolean,
  setIsCommitFilterEnabled: (value: boolean) => void,
  minCommitDuration: number,
  setMinCommitDuration: (value: number) => void,

  // Selection state
  selectedCommitIndex: number | null,
  selectCommitIndex: (value: number | null) => void,

  // Filtered data
  filteredCommitIndices: Array<number>,
  selectedFilteredCommitIndex: number | null,

  // Navigation
  selectNextCommitIndex: () => void,
  selectPrevCommitIndex: () => void,
};

export function useCommitFilteringAndNavigation(
  commitData: Array<CommitDataFrontend>,
): CommitFilteringAndNavigation {
  // Filter settings persisted to localStorage
  const [isCommitFilterEnabled, setIsCommitFilterEnabledValue] =
    useLocalStorage<boolean>('React::DevTools::isCommitFilterEnabled', false);
  const [minCommitDuration, setMinCommitDurationValue] =
    useLocalStorage<number>('minCommitDuration', 0);

  // Currently selected commit index (in the unfiltered list)
  const [selectedCommitIndex, selectCommitIndex] = useState<number | null>(
    null,
  );

  // Reset commit index when commitData changes (e.g., when switching roots).
  const [previousCommitData, setPreviousCommitData] =
    useState<Array<CommitDataFrontend>>(commitData);
  if (previousCommitData !== commitData) {
    setPreviousCommitData(commitData);
    selectCommitIndex(commitData.length > 0 ? 0 : null);
  }

  const calculateFilteredIndices = useCallback(
    (enabled: boolean, minDuration: number): Array<number> => {
      return commitData.reduce((reduced: Array<number>, commitDatum, index) => {
        if (!enabled || commitDatum.duration >= minDuration) {
          reduced.push(index);
        }
        return reduced;
      }, [] as Array<number>);
    },
    [commitData],
  );

  const findFilteredIndex = useCallback(
    (commitIndex: number | null, filtered: Array<number>): number | null => {
      if (commitIndex === null) return null;
      for (let i = 0; i < filtered.length; i++) {
        if (filtered[i] === commitIndex) {
          return i;
        }
      }
      return null;
    },
    [],
  );

  // Adjust selection when filter settings change to keep a valid selection
  const adjustSelectionAfterFilterChange = useCallback(
    (newFilteredIndices: Array<number>) => {
      const currentSelectedIndex = selectedCommitIndex;
      const selectedFilteredIndex = findFilteredIndex(
        currentSelectedIndex,
        newFilteredIndices,
      );

      if (newFilteredIndices.length === 0) {
        // No commits pass the filter - clear selection
        selectCommitIndex(null);
      } else if (currentSelectedIndex === null) {
        // No commit was selected - select first available
        selectCommitIndex(newFilteredIndices[0]);
      } else if (selectedFilteredIndex === null) {
        // Currently selected commit was filtered out - find closest commit before it
        let closestBefore = null;
        for (let i = newFilteredIndices.length - 1; i >= 0; i--) {
          if (newFilteredIndices[i] < currentSelectedIndex) {
            closestBefore = newFilteredIndices[i];
            break;
          }
        }
        // If no commit before it, use the first available
        selectCommitIndex(
          closestBefore !== null ? closestBefore : newFilteredIndices[0],
        );
      } else if (selectedFilteredIndex >= newFilteredIndices.length) {
        // Filtered position is out of bounds - clamp to last available
        selectCommitIndex(newFilteredIndices[newFilteredIndices.length - 1]);
      }
      // Otherwise, the current selection is still valid in the filtered list, keep it
    },
    [findFilteredIndex, selectedCommitIndex, selectCommitIndex],
  );

  const filteredCommitIndices = useMemo(
    () => calculateFilteredIndices(isCommitFilterEnabled, minCommitDuration),
    [calculateFilteredIndices, isCommitFilterEnabled, minCommitDuration],
  );

  const selectedFilteredCommitIndex = useMemo(
    () => findFilteredIndex(selectedCommitIndex, filteredCommitIndices),
    [findFilteredIndex, selectedCommitIndex, filteredCommitIndices],
  );

  const selectNextCommitIndex = useCallback(() => {
    if (
      selectedFilteredCommitIndex === null ||
      filteredCommitIndices.length === 0
    ) {
      return;
    }
    let nextCommitIndex = selectedFilteredCommitIndex + 1;
    if (nextCommitIndex === filteredCommitIndices.length) {
      nextCommitIndex = 0;
    }
    selectCommitIndex(filteredCommitIndices[nextCommitIndex]);
  }, [selectedFilteredCommitIndex, filteredCommitIndices, selectCommitIndex]);

  const selectPrevCommitIndex = useCallback(() => {
    if (
      selectedFilteredCommitIndex === null ||
      filteredCommitIndices.length === 0
    ) {
      return;
    }
    let prevCommitIndex = selectedFilteredCommitIndex - 1;
    if (prevCommitIndex < 0) {
      prevCommitIndex = filteredCommitIndices.length - 1;
    }
    selectCommitIndex(filteredCommitIndices[prevCommitIndex]);
  }, [selectedFilteredCommitIndex, filteredCommitIndices, selectCommitIndex]);

  // Setters that also adjust selection when filter changes
  const setIsCommitFilterEnabled = useCallback(
    (value: boolean) => {
      setIsCommitFilterEnabledValue(value);

      const newFilteredIndices = calculateFilteredIndices(
        value,
        minCommitDuration,
      );

      adjustSelectionAfterFilterChange(newFilteredIndices);
    },
    [
      setIsCommitFilterEnabledValue,
      calculateFilteredIndices,
      minCommitDuration,
      adjustSelectionAfterFilterChange,
    ],
  );

  const setMinCommitDuration = useCallback(
    (value: number) => {
      setMinCommitDurationValue(value);

      const newFilteredIndices = calculateFilteredIndices(
        isCommitFilterEnabled,
        value,
      );

      adjustSelectionAfterFilterChange(newFilteredIndices);
    },
    [
      setMinCommitDurationValue,
      calculateFilteredIndices,
      isCommitFilterEnabled,
      adjustSelectionAfterFilterChange,
    ],
  );

  return {
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
  };
}
