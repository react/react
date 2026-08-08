/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useContext, useCallback, useRef} from 'react';
import {ProfilerContext} from './ProfilerContext';
import {ModalDialogContext} from '../ModalDialog';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {StoreContext} from '../context';
import {
  prepareProfilingDataExport,
  prepareProfilingDataFrontendFromExport,
} from './utils';
import {downloadFile} from '../utils';
import isArray from 'shared/isArray';
import hasOwnProperty from 'shared/hasOwnProperty';

import styles from './ProfilingImportExportButtons.css';

import type {ProfilingDataExport} from './types';

export default function ProfilingImportExportButtons(): React.Node {
  const {isProfiling, profilingData, rootID} = useContext(ProfilerContext);
  const store = useContext(StoreContext);
  const {profilerStore} = store;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const downloadRef = useRef<HTMLAnchorElement | null>(null);

  const {dispatch: modalDialogDispatch} = useContext(ModalDialogContext);

  const doesHaveInMemoryData = profilerStore.didRecordCommits;

  const downloadData = useCallback(() => {
    if (rootID === null) {
      return;
    }

    const anchorElement = downloadRef.current;

    if (profilingData !== null && anchorElement !== null) {
      const profilingDataExport = prepareProfilingDataExport(profilingData);
      const date = new Date();
      const dateString = date
        .toLocaleDateString(undefined, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\//g, '-');
      const timeString = date
        .toLocaleTimeString(undefined, {
          hour12: false,
        })
        .replace(/:/g, '-');
      downloadFile(
        anchorElement,
        `profiling-data.${dateString}.${timeString}.json`,
        JSON.stringify(profilingDataExport, null, 2),
      );
    }
  }, [rootID, profilingData]);

  const clickInputElement = useCallback(() => {
    if (inputRef.current !== null) {
      inputRef.current.click();
    }
  }, []);

  const showImportError = (message: string | null) => {
    modalDialogDispatch({
      id: 'ProfilingImportExportButtons',
      type: 'SHOW',
      title: 'Import failed',
      content: (
        <Fragment>
          <div>The profiling data you selected cannot be imported.</div>
          {message !== null && (
            <div className={styles.ErrorMessage}>{message}</div>
          )}
        </Fragment>
      ),
    });
  };

  // TODO (profiling) We should probably use a transition for this and suspend while loading the file.
  // Local files load so fast it's probably not very noticeable though.
  const handleChange = () => {
    const input = inputRef.current;
    if (input !== null && input.files.length > 0) {
      const file = input.files[0];

      // TODO (profiling) Handle fileReader errors.
      const fileReader = new FileReader();
      fileReader.addEventListener('load', () => {
        const raw = fileReader.result as any as string;

        let json;
        try {
          json = JSON.parse(raw);
        } catch (error) {
          showImportError(error !== null ? error.message : null);
          return;
        }

        if (isArray(json) || !hasOwnProperty.call(json, 'version')) {
          showImportError(
            'This file does not look like a profile exported from the React DevTools profiler.',
          );
          return;
        }

        try {
          const profilingDataExport = json as any as ProfilingDataExport;
          profilerStore.profilingData =
            prepareProfilingDataFrontendFromExport(profilingDataExport);
        } catch (error) {
          showImportError(error !== null ? error.message : null);
        }
      });
      fileReader.readAsText(file);
    }
  };

  return (
    <Fragment>
      <div className={styles.VRule} />
      <input
        ref={inputRef}
        className={styles.Input}
        type="file"
        accept=".json"
        onChange={handleChange}
        tabIndex={-1}
      />
      <a ref={downloadRef} className={styles.Input} />
      <Button
        disabled={isProfiling}
        onClick={clickInputElement}
        title="Load profile...">
        <ButtonIcon type="import" />
      </Button>
      <Button
        disabled={isProfiling || !doesHaveInMemoryData}
        onClick={downloadData}
        title="Save profile...">
        <ButtonIcon type="export" />
      </Button>
    </Fragment>
  );
}
