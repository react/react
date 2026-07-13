/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ViewState} from './types';

import * as React from 'react';
import {
  Suspense,
  useContext,
  useDeferredValue,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {SettingsContext} from 'react-devtools-shared/src/devtools/views/Settings/SettingsContext';
import {ProfilerContext} from 'react-devtools-shared/src/devtools/views/Profiler/ProfilerContext';
import NoProfilingData from 'react-devtools-shared/src/devtools/views/Profiler/NoProfilingData';
import RecordingInProgress from 'react-devtools-shared/src/devtools/views/Profiler/RecordingInProgress';
import {updateColorsToMatchTheme} from './content-views/constants';
import {TimelineContext} from './TimelineContext';
import CanvasPage from './CanvasPage';
import {importFile} from './timelineCache';
import TimelineSearchInput from './TimelineSearchInput';
import TimelineNotSupported from './TimelineNotSupported';
import {TimelineSearchContextController} from './TimelineSearchContext';

import styles from './Timeline.css';

export function Timeline(_: {}): React.Node {
  const {
    file,
    inMemoryTimelineData,
    isPerformanceTracksSupported,
    isTimelineSupported,
    setFile,
    viewState,
  } = useContext(TimelineContext);
  const {didRecordCommits, isProfiling} = useContext(ProfilerContext);

  const ref = useRef(null);

  // HACK: Canvas rendering uses an imperative API,
  // but DevTools colors are stored in CSS variables (see root.css and SettingsContext).
  // When the theme changes, we need to trigger update the imperative colors and re-draw the Canvas.
  const {theme} = useContext(SettingsContext);
  // HACK: SettingsContext also uses a useLayoutEffect to update styles;
  // make sure the theme context in SettingsContext updates before this code.
  const deferredTheme = useDeferredValue(theme);
  // HACK: Schedule a re-render of the Canvas once colors have been updated.
  // The easiest way to guarangee this happens is to recreate the inner Canvas component.
  const [key, setKey] = useState<string>(theme);
  useLayoutEffect(() => {
    const pollForTheme = () => {
      if (updateColorsToMatchTheme(ref.current as any as HTMLDivElement)) {
        clearInterval(intervalID);
        setKey(deferredTheme);
      }
    };

    const intervalID = setInterval(pollForTheme, 50);

    return () => {
      clearInterval(intervalID);
    };
  }, [deferredTheme]);

  let content = null;
  if (isProfiling) {
    content = <RecordingInProgress />;
  } else if (inMemoryTimelineData && inMemoryTimelineData.length > 0) {
    // TODO (timeline) Support multiple renderers.
    const timelineData = inMemoryTimelineData[0];

    content = (
      <TimelineSearchContextController
        profilerData={timelineData}
        viewState={viewState}>
        <TimelineSearchInput />
        <CanvasPage profilerData={timelineData} viewState={viewState} />
      </TimelineSearchContextController>
    );
  } else if (file) {
    content = (
      <Suspense fallback={<ProcessingData />}>
        <FileLoader
          file={file}
          key={key}
          onFileSelect={setFile}
          viewState={viewState}
        />
      </Suspense>
    );
  } else if (didRecordCommits) {
    content = <NoTimelineData />;
  } else if (isTimelineSupported) {
    content = <NoProfilingData />;
  } else {
    content = (
      <TimelineNotSupported
        isPerformanceTracksSupported={isPerformanceTracksSupported}
      />
    );
  }

  return (
    <div className={styles.Content} ref={ref}>
      {content}
    </div>
  );
}

const ProcessingData = () => (
  <div className={styles.EmptyStateContainer}>
    <div className={styles.Header}>Processing data...</div>
    <div className={styles.Row}>This should only take a minute.</div>
  </div>
);

// $FlowFixMe[missing-local-annot]
const CouldNotLoadProfile = ({error, onFileSelect}) => (
  <div className={styles.EmptyStateContainer}>
    <div className={styles.Header}>Could not load profile</div>
    {error.message && (
      <div className={styles.Row}>
        <div className={styles.ErrorMessage}>{error.message}</div>
      </div>
    )}
    <div className={styles.Row}>
      Try importing another Chrome performance profile.
    </div>
  </div>
);

const NoTimelineData = () => (
  <div className={styles.EmptyStateContainer}>
    <div className={styles.Row}>
      This current profile does not contain timeline data.
    </div>
  </div>
);

const FileLoader = ({
  file,
  onFileSelect,
  viewState,
}: {
  file: File | null,
  onFileSelect: (file: File) => void,
  viewState: ViewState,
}) => {
  if (file === null) {
    return null;
  }

  const dataOrError = importFile(file);
  if (dataOrError instanceof Error) {
    return (
      <CouldNotLoadProfile error={dataOrError} onFileSelect={onFileSelect} />
    );
  }

  return (
    <TimelineSearchContextController
      profilerData={dataOrError}
      viewState={viewState}>
      <TimelineSearchInput />
      <CanvasPage profilerData={dataOrError} viewState={viewState} />
    </TimelineSearchContextController>
  );
};
