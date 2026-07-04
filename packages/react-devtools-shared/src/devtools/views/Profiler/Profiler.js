/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useContext, useEffect, useRef, useEffectEvent} from 'react';
import {ModalDialog} from '../ModalDialog';
import {ProfilerContext} from './ProfilerContext';
import TabBar from '../TabBar';
import AIChatPane from './AIChatPane';
import {AIChatContextController} from './AIChatContext';
import ClearProfilingDataButton from './ClearProfilingDataButton';
import CommitFlamegraph from './CommitFlamegraph';
import CommitRanked from './CommitRanked';
import RootSelector from './RootSelector';
import {Timeline} from 'react-devtools-timeline/src/Timeline';
import SidebarEventInfo from './SidebarEventInfo';
import RecordToggle from './RecordToggle';
import ReloadAndProfileButton from './ReloadAndProfileButton';
import ProfilingImportExportButtons from './ProfilingImportExportButtons';
import SnapshotSelector from './SnapshotSelector';
import SidebarCommitInfo from './SidebarCommitInfo';
import NoProfilingData from './NoProfilingData';
import RecordingInProgress from './RecordingInProgress';
import ProcessingData from './ProcessingData';
import ProfilingNotSupported from './ProfilingNotSupported';
import SidebarSelectedFiberInfo from './SidebarSelectedFiberInfo';
import SettingsModal from 'react-devtools-shared/src/devtools/views/Settings/SettingsModal';
import SettingsModalContextToggle from 'react-devtools-shared/src/devtools/views/Settings/SettingsModalContextToggle';
import {SettingsModalContextController} from 'react-devtools-shared/src/devtools/views/Settings/SettingsModalContext';
import portaledContent from '../portaledContent';
import {StoreContext} from '../context';
import {TimelineContext} from 'react-devtools-timeline/src/TimelineContext';

import styles from './Profiler.css';

function Profiler(_: {}) {
  const profilerRef = useRef<HTMLDivElement | null>(null);
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const {
    didRecordCommits,
    isProcessingData,
    isProfiling,
    selectedCommitIndex,
    selectedFiberID,
    selectedTabID,
    selectTab,
    supportsProfiling,
    startProfiling,
    stopProfiling,
    selectPrevCommitIndex,
    selectNextCommitIndex,
  } = useContext(ProfilerContext);

  const {file: timelineTraceEventData, searchInputContainerRef} =
    useContext(TimelineContext);

  const {supportsTimeline} = useContext(StoreContext);

  const isLegacyProfilerSelected = selectedTabID !== 'timeline';

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const correctModifier = isMac ? event.metaKey : event.ctrlKey;
    // Cmd+E to start/stop profiler recording
    if (correctModifier && event.key === 'e') {
      if (isProfiling) {
        stopProfiling();
      } else {
        startProfiling();
      }
      event.preventDefault();
      event.stopPropagation();
    } else if (
      isLegacyProfilerSelected &&
      didRecordCommits &&
      selectedCommitIndex !== null
    ) {
      // Cmd+Left/Right (Mac) or Ctrl+Left/Right (Windows/Linux) to navigate commits
      if (
        correctModifier &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        if (event.key === 'ArrowLeft') {
          selectPrevCommitIndex();
        } else {
          selectNextCommitIndex();
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });

  useEffect(() => {
    const div = profilerRef.current;
    if (!div) {
      return;
    }
    const ownerWindow = div.ownerDocument.defaultView;
    ownerWindow.addEventListener('keydown', handleKeyDown);
    return () => {
      ownerWindow.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  let view = null;
  if (didRecordCommits || selectedTabID === 'timeline') {
    switch (selectedTabID) {
      case 'flame-chart':
        view = <CommitFlamegraph />;
        break;
      case 'ranked-chart':
        view = <CommitRanked />;
        break;
      case 'timeline':
        view = <Timeline />;
        break;
      case 'ai-chat':
        view = <AIChatPane />;
        break;
      default:
        break;
    }
  } else if (isProfiling) {
    view = <RecordingInProgress />;
  } else if (isProcessingData) {
    view = <ProcessingData />;
  } else if (timelineTraceEventData) {
    view = <OnlyTimelineData />;
  } else if (supportsProfiling) {
    view = <NoProfilingData />;
  } else {
    view = <ProfilingNotSupported />;
  }

  let sidebar = null;
  if (!isProfiling && !isProcessingData && didRecordCommits) {
    switch (selectedTabID) {
      case 'flame-chart':
      case 'ranked-chart':
        // TRICKY
        // Handle edge case where no commit is selected because of a min-duration filter update.
        // In that case, the selected commit index would be null.
        // We could still show a sidebar for the previously selected fiber,
        // but it would be an odd user experience.
        // TODO (ProfilerContext) This check should not be necessary.
        if (selectedCommitIndex !== null) {
          if (selectedFiberID !== null) {
            sidebar = <SidebarSelectedFiberInfo />;
          } else {
            sidebar = <SidebarCommitInfo />;
          }
        }
        break;
      case 'timeline':
        sidebar = <SidebarEventInfo />;
        break;
      default:
        break;
    }
  }

  return (
    <SettingsModalContextController>
      <AIChatContextController>
        <div ref={profilerRef} className={styles.Profiler}>
          <div className={styles.LeftColumn}>
            <div className={styles.Toolbar}>
              <RecordToggle disabled={!supportsProfiling} />
              <ReloadAndProfileButton disabled={!supportsProfiling} />
              <ClearProfilingDataButton />
              <ProfilingImportExportButtons />
              <div className={styles.VRule} />
              <TabBar
                currentTab={selectedTabID}
                id="Profiler"
                selectTab={selectTab}
                tabs={supportsTimeline ? tabsWithTimeline : tabs}
                type="profiler"
              />
              <RootSelector />
              <div className={styles.Spacer} />
              {!isLegacyProfilerSelected && (
                <div
                  ref={searchInputContainerRef}
                  className={styles.TimelineSearchInputContainer}
                />
              )}
              <SettingsModalContextToggle />
              {isLegacyProfilerSelected && didRecordCommits && (
                <Fragment>
                  <div className={styles.VRule} />
                  <SnapshotSelector />
                </Fragment>
              )}
            </div>
            <div className={styles.Content}>
              {view}
              <ModalDialog />
            </div>
          </div>
          <div className={styles.RightColumn}>{sidebar}</div>
          <SettingsModal />
        </div>
      </AIChatContextController>
    </SettingsModalContextController>
  );
}

const OnlyTimelineData = () => (
  <div className={styles.Column}>
    <div className={styles.Header}>Timeline only</div>
    <div className={styles.Row}>
      The current profile contains only Timeline data.
    </div>
  </div>
);

const tabs = [
  {
    id: 'flame-chart',
    icon: 'flame-chart',
    label: 'Flamegraph',
    title: 'Flamegraph chart',
  },
  {
    id: 'ranked-chart',
    icon: 'ranked-chart',
    label: 'Ranked',
    title: 'Ranked chart',
  },
  {
    id: 'ai-chat',
    icon: 'ai-chat',
    label: 'Chat',
    title: 'Ask AI about this profiling session',
  },
];

const tabsWithTimeline = [
  ...tabs,
  null, // Divider/separator
  {
    id: 'timeline',
    icon: 'timeline',
    label: 'Timeline',
    title: 'Timeline',
  },
];

export default portaledContent(Profiler) as component();
