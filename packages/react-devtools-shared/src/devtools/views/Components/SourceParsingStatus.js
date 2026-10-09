/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useCallback, useContext, useSyncExternalStore} from 'react';
import FetchFileWithCachingContext from './FetchFileWithCachingContext';
import {TreeStateContext} from './TreeContext';
import {
  getSourceParsingStatus,
  subscribeSourceParsingStatus,
} from 'react-devtools-shared/src/symbolicateSource';
import styles from './SourceParsingStatus.css';

export default function SourceParsingStatus(): React.Node {
  const fetchFile = useContext(FetchFileWithCachingContext);
  const {inspectedElementID} = useContext(TreeStateContext);
  const getSnapshot = useCallback(
    () => getSourceParsingStatus(fetchFile, inspectedElementID),
    [fetchFile, inspectedElementID],
  );
  const status = useSyncExternalStore(
    subscribeSourceParsingStatus,
    getSnapshot,
    getSnapshot,
  );
  if (inspectedElementID === null) return null;
  const unmappedAttempts = status.unmapped + status.dropped;
  const pending = status.pending > 0;
  const label =
    fetchFile === null
      ? 'Source parsing unavailable'
      : pending
        ? 'Resolving source maps · ' + status.pending + ' remaining'
        : 'Source parsing complete' +
          (unmappedAttempts > 0
            ? ' · ' + unmappedAttempts + ' unmapped/skipped attempts'
            : '');
  const title =
    fetchFile === null
      ? 'A source file reader is not available in this panel.'
      : 'Source file reads and source map parsing for the selected component and its stacks. Mapped attempts: ' +
        status.mapped +
        '. Unmapped attempts: ' +
        status.unmapped +
        '. Queue overflow attempts: ' +
        status.dropped +
        '. Retries at the same position count as separate attempts. Unmapped tasks retain their original locations. Complete means no tasks are pending; results may have been cached.';
  return (
    <div
      className={styles.Status}
      role="status"
      aria-live="polite"
      title={title}>
      <span
        className={pending ? styles.PendingDot : styles.Dot}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
