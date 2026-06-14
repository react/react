/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import Button from './Button';
import ButtonIcon from './ButtonIcon';
import Icon from './Icon';

import styles from './SearchInput.css';

type Props = {
  goToNextResult: () => void,
  goToPreviousResult: () => void,
  goToResult: (index: number) => void,
  placeholder: string,
  search: (text: string) => void,
  searchIndex: number,
  searchResultsCount: number,
  searchText: string,
  testName?: ?string,
};

export default function SearchInput({
  goToNextResult,
  goToPreviousResult,
  goToResult,
  placeholder,
  search,
  searchIndex,
  searchResultsCount,
  searchText,
  testName,
}: Props): React.Node {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [indexDraft, setIndexDraft] = useState<string | null>(null);
  const currentResultNumber = Math.min(searchIndex + 1, searchResultsCount);
  const indexValue =
    indexDraft !== null ? indexDraft : String(currentResultNumber);

  // $FlowFixMe[missing-local-annot]
  const handleIndexFocus = ({currentTarget}) => currentTarget.select();
  // $FlowFixMe[missing-local-annot]
  const handleIndexChange = ({currentTarget}) => {
    const raw = currentTarget.value;
    setIndexDraft(raw);

    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && searchResultsCount > 0) {
      const clamped = Math.max(1, Math.min(parsed, searchResultsCount));
      goToResult(clamped - 1);
    }
  };
  const handleIndexBlur = () => setIndexDraft(null);
  // $FlowFixMe[missing-local-annot]
  const handleIndexKeyDown = event => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const resetSearch = () => search('');

  // $FlowFixMe[missing-local-annot]
  const handleChange = ({currentTarget}) => {
    search(currentTarget.value);
  };
  // $FlowFixMe[missing-local-annot]
  const handleKeyPress = ({key, shiftKey}) => {
    if (key === 'Enter') {
      if (shiftKey) {
        goToPreviousResult();
      } else {
        goToNextResult();
      }
    }
  };

  // Auto-focus search input
  useEffect(() => {
    if (inputRef.current === null) {
      return () => {};
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const {key, metaKey} = event;
      if (key === 'f' && metaKey) {
        const inputElement = inputRef.current;
        if (inputElement !== null) {
          inputElement.focus();
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    // It's important to listen to the ownerDocument to support the browser extension.
    // Here we use portals to render individual tabs (e.g. Profiler),
    // and the root document might belong to a different window.
    const ownerDocumentElement = inputRef.current.ownerDocument.documentElement;
    if (ownerDocumentElement === null) {
      return;
    }
    ownerDocumentElement.addEventListener('keydown', handleKeyDown);

    return () =>
      ownerDocumentElement.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.SearchInput} data-testname={testName}>
      <Icon className={styles.InputIcon} type="search" />
      <input
        data-testname={testName ? `${testName}-Input` : undefined}
        className={styles.Input}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        ref={inputRef}
        value={searchText}
      />
      {!!searchText && (
        <React.Fragment>
          <span
            className={styles.IndexLabel}
            data-testname={testName ? `${testName}-ResultsCount` : undefined}>
            <input
              className={styles.IndexInput}
              data-testname={
                testName ? `${testName}-ResultIndexInput` : undefined
              }
              type="text"
              inputMode="numeric"
              disabled={searchResultsCount === 0}
              onBlur={handleIndexBlur}
              onChange={handleIndexChange}
              onFocus={handleIndexFocus}
              onKeyDown={handleIndexKeyDown}
              style={{
                width: `calc(${String(searchResultsCount).length}ch + 2px)`,
              }}
              title="Go to search result number"
              value={indexValue}
            />
            {' | '}
            {searchResultsCount}
          </span>
          <div className={styles.LeftVRule} />
          <Button
            data-testname={testName ? `${testName}-PreviousButton` : undefined}
            disabled={!searchText}
            onClick={goToPreviousResult}
            title={
              <React.Fragment>
                Scroll to previous search result (<kbd>Shift</kbd> +{' '}
                <kbd>Enter</kbd>)
              </React.Fragment>
            }>
            <ButtonIcon type="up" />
          </Button>
          <Button
            data-testname={testName ? `${testName}-NextButton` : undefined}
            disabled={!searchText}
            onClick={goToNextResult}
            title={
              <React.Fragment>
                Scroll to next search result (<kbd>Enter</kbd>)
              </React.Fragment>
            }>
            <ButtonIcon type="down" />
          </Button>
          <Button
            data-testname={testName ? `${testName}-ResetButton` : undefined}
            disabled={!searchText}
            onClick={resetSearch}
            title="Reset search">
            <ButtonIcon type="close" />
          </Button>
        </React.Fragment>
      )}
    </div>
  );
}
