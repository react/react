/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof {
  SyntheticEvent,
  SyntheticKeyboardEvent,
} from 'react-dom-bindings/src/events/SyntheticEvent';

import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import Button from './Button';
import ButtonIcon from './ButtonIcon';
import Icon from './Icon';
import AutoSizeInput from './Components/NativeStyleEditor/AutoSizeInput';

import styles from './SearchInput.css';

type Props = {
  autoFocus?: boolean,
  goToNextResult: () => void,
  goToPreviousResult: () => void,
  onClose?: () => void,
  goToResult: (index: number) => void,
  placeholder: string,
  search: (text: string) => void,
  searchIndex: number,
  searchResultsCount: number,
  searchText: string,
  testName?: ?string,
};

export default function SearchInput({
  autoFocus,
  goToNextResult,
  goToPreviousResult,
  onClose,
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

  const handleIndexChange = (event: SyntheticEvent) => {
    // Only digits are meaningful here; strip anything else as it's typed.
    const raw = event.currentTarget.value.replace(/[^0-9]/g, '');

    if (raw === '' || searchResultsCount === 0) {
      setIndexDraft(raw);
      return;
    }

    // Clamp into [1, searchResultsCount] so the field never displays an
    // out-of-range value, then live-preview by scrolling to that result.
    const clamped = Math.max(
      1,
      Math.min(parseInt(raw, 10), searchResultsCount),
    );
    setIndexDraft(String(clamped));
    goToResult(clamped - 1);
  };
  const handleIndexBlur = () => setIndexDraft(null);
  const handleIndexKeyDown = (event: SyntheticKeyboardEvent) => {
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
    const input = inputRef.current;
    if (input === null) {
      return () => {};
    }

    if (autoFocus) {
      input.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const {key, metaKey} = event;
      if (key === 'f' && metaKey) {
        input.focus();
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // It's important to listen to the ownerDocument to support the browser extension.
    // Here we use portals to render individual tabs (e.g. Profiler),
    // and the root document might belong to a different window.
    const ownerDocumentElement = input.ownerDocument.documentElement;
    if (ownerDocumentElement === null) {
      return;
    }
    ownerDocumentElement.addEventListener('keydown', handleKeyDown);

    return () =>
      ownerDocumentElement.removeEventListener('keydown', handleKeyDown);
  }, [autoFocus]);

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
            <AutoSizeInput
              className={styles.IndexInput}
              testName={testName ? `${testName}-ResultIndexInput` : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Go to search result number"
              title="Go to search result number"
              disabled={searchResultsCount === 0}
              onBlur={handleIndexBlur}
              onChange={handleIndexChange}
              onKeyDown={handleIndexKeyDown}
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
          {onClose == null && (
            <Button
              data-testname={testName ? `${testName}-ResetButton` : undefined}
              disabled={!searchText}
              onClick={resetSearch}
              title="Reset search">
              <ButtonIcon type="close" />
            </Button>
          )}
        </React.Fragment>
      )}
      {onClose != null && (
        <Button
          data-testname={testName ? `${testName}-CloseButton` : undefined}
          onClick={onClose}
          title="Close search (Esc)">
          <ButtonIcon type="close" />
        </Button>
      )}
    </div>
  );
}
