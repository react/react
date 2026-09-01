/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext, useMemo} from 'react';
import {SettingsContext} from './SettingsContext';
import {StoreContext} from '../context';
import {CHANGE_LOG_URL} from 'react-devtools-shared/src/devtools/constants';
import {isInternalFacebookBuild} from 'react-devtools-feature-flags';

import styles from './SettingsShared.css';

import CodeEditorOptions from './CodeEditorOptions';
import CodeEditorByDefault from './CodeEditorByDefault';
import {LOCAL_STORAGE_ALWAYS_OPEN_IN_EDITOR} from '../../../constants';
import {useLocalStorage} from '../hooks';

function getChangeLogUrl(version: ?string): string | null {
  if (!version) {
    return null;
  }

  // Version numbers are in the format of: <major>.<minor>.<patch>-<sha>
  // e.g. "4.23.0-f0dd459e0"
  // GitHub CHANGELOG headers are in the format of: <major>.<minor>.<patch>
  // but the "." are stripped from anchor tags, becomming: <major><minor><patch>
  const versionAnchor = version.replace(/^(\d+)\.(\d+)\.(\d+).*/, '$1$2$3');
  return `${CHANGE_LOG_URL}#${versionAnchor}`;
}

export default function GeneralSettings(_: {}): React.Node {
  const {
    displayDensity,
    setDisplayDensity,
    setTheme,
    setTraceUpdatesEnabled,
    theme,
    traceUpdatesEnabled,
  } = useContext(SettingsContext);

  const {backendVersion, supportsTraceUpdates} = useContext(StoreContext);
  const frontendVersion = process.env.DEVTOOLS_VERSION;

  const showBackendVersion =
    backendVersion && backendVersion !== frontendVersion;

  const [alwaysOpenInEditor] = useLocalStorage<boolean>(
    LOCAL_STORAGE_ALWAYS_OPEN_IN_EDITOR,
    false,
  );

  return (
    <div className={styles.SettingList}>
      {isInternalFacebookBuild && (
        <div className={styles.SettingWrapper}>
          This is an internal build of React DevTools for Meta
        </div>
      )}

      <div className={styles.SettingWrapper}>
        <div className={styles.RadioLabel}>Theme</div>
        <select
          value={theme}
          onChange={({currentTarget}) => setTheme(currentTarget.value)}>
          <option value="auto">Auto</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div className={styles.SettingWrapper}>
        <div className={styles.RadioLabel}>Display density</div>
        <select
          value={displayDensity}
          onChange={({currentTarget}) =>
            setDisplayDensity(currentTarget.value)
          }>
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
        </select>
      </div>

      <div className={styles.SettingWrapper}>
        <label className={styles.SettingRow}>
          <div className={styles.RadioLabel}>Open in Editor URL</div>
          <CodeEditorOptions />
        </label>
      </div>

      <div className={styles.SettingWrapper}>
        <CodeEditorByDefault />
        {alwaysOpenInEditor && (__IS_CHROME__ || __IS_EDGE__) ? (
          <div>
            To enable link handling in your browser's DevTools settings, look
            for the option Extension -> Link Handling. Select "React Developer
            Tools".
          </div>
        ) : null}
      </div>

      {supportsTraceUpdates && (
        <div className={styles.SettingWrapper}>
          <label className={styles.SettingRow}>
            <input
              type="checkbox"
              checked={traceUpdatesEnabled}
              onChange={({currentTarget}) =>
                setTraceUpdatesEnabled(currentTarget.checked)
              }
              className={styles.SettingRowCheckbox}
            />
            Highlight updates when components render
          </label>
        </div>
      )}

      <div className={styles.ReleaseNotes}>
        {showBackendVersion && (
          <div>
            <ul className={styles.VersionsList}>
              <li>
                <Version
                  label="DevTools backend version:"
                  version={backendVersion}
                />
              </li>
              <li>
                <Version
                  label="DevTools frontend version:"
                  version={frontendVersion}
                />
              </li>
            </ul>
          </div>
        )}
        {!showBackendVersion && (
          <Version label="DevTools version:" version={frontendVersion} />
        )}
      </div>
    </div>
  );
}

function Version({label, version}: {label: string, version: ?string}) {
  const changelogLink = useMemo(() => {
    return getChangeLogUrl(version);
  }, [version]);

  if (version == null) {
    return null;
  } else {
    return (
      <>
        {label}{' '}
        <a
          className={styles.ReleaseNotesLink}
          target="_blank"
          rel="noopener noreferrer"
          href={changelogLink}>
          {version}
        </a>
      </>
    );
  }
}
