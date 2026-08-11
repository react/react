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
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import TabBar from '../TabBar';
import ClearProfilingDataButton from './ClearProfilingDataButton';
import CommitFlamegraph from './CommitFlamegraph';
import CommitRanked from './CommitRanked';
import RootSelector from './RootSelector';
import RecordToggle from './RecordToggle';
import ReloadAndProfileButton from './ReloadAndProfileButton';
import ProfilingImportExportButtons from './ProfilingImportExportButtons';
import SnapshotSelector from './SnapshotSelector';
import ProfilerSearchInput from './ProfilerSearchInput';
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
    isSearchInputVisible,
    showSearchInput,
    hideSearchInput,
  } = useContext(ProfilerContext);

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
    } else if (didRecordCommits && correctModifier && event.key === 'f') {
      // Cmd+F (Mac) or Ctrl+F (Windows/Linux) to search components in the commit
      showSearchInput();
      event.preventDefault();
      event.stopPropagation();
    } else if (isSearchInputVisible && event.key === 'Escape') {
      // Escape closes the search input.
      hideSearchInput();
      event.preventDefault();
      event.stopPropagation();
    } else if (didRecordCommits && selectedCommitIndex !== null) {
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
    // Capture phase: Cmd/Ctrl+F is a reserved browser shortcut (Find), so we
    // must intercept it before the browser to open our own search instead.
    ownerWindow.addEventListener('keydown', handleKeyDown, true);
    return () => {
      ownerWindow.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  let view = null;
  if (didRecordCommits) {
    switch (selectedTabID) {
      case 'flame-chart':
        view = <CommitFlamegraph />;
        break;
      case 'ranked-chart':
        view = <CommitRanked />;
        break;
      default:
        break;
    }
  } else if (isProfiling) {
    view = <RecordingInProgress />;
  } else if (isProcessingData) {
    view = <ProcessingData />;
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
      default:
        break;
    }
  }

  return (
    <SettingsModalContextController>
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
              tabs={tabs}
              type="profiler"
            />
            <RootSelector />
            <div className={styles.Spacer} />
            <SettingsModalContextToggle />
            {didRecordCommits && (
              <Fragment>
                <div className={styles.VRule} />
                <Button
                  onClick={
                    isSearchInputVisible ? hideSearchInput : showSearchInput
                  }
                  title={`Search components in this commit (${
                    isMac ? '⌘' : 'Ctrl+'
                  }F)`}
                  data-testname="ProfilerSearchButton">
                  <ButtonIcon type="find" />
                </Button>
                <SnapshotSelector />
              </Fragment>
            )}
          </div>
          <div className={styles.Content}>
            {didRecordCommits && isSearchInputVisible && (
              <div className={styles.SearchInputOverlay}>
                <ProfilerSearchInput />
              </div>
            )}
            {view}
            <ModalDialog />
          </div>
        </div>
        <div className={styles.RightColumn}>{sidebar}</div>
        <SettingsModal />
      </div>
    </SettingsModalContextController>
  );
}

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
];

export default portaledContent(Profiler) as component();
