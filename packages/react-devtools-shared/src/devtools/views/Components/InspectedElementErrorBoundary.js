/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {
  useCallback,
  useContext,
  unstable_useCacheRefresh as useCacheRefresh,
} from 'react';
import ErrorBoundary from '../ErrorBoundary';
import {TreeStateContext} from './TreeContext';
import {clearCacheBecauseOfError} from '../../../inspectedElementCache';
import styles from './InspectedElementErrorBoundary.css';

type WrapperProps = {
  children: React$Node,
};

export default function InspectedElementErrorBoundaryWrapper({
  children,
}: WrapperProps): React.Node {
  // Key on the selected element ID so that changing the selected element automatically hides the boundary.
  // This seems best since an error inspecting one element isn't likely to be relevant to another element.
  const {inspectedElementID} = useContext(TreeStateContext);

  const refresh = useCacheRefresh();
  const handleDsmiss = useCallback(() => {
    clearCacheBecauseOfError(refresh);
  }, [refresh]);

  return (
    <div className={styles.Wrapper}>
      <ErrorBoundary
        key={inspectedElementID}
        canDismiss={true}
        onBeforeDismissCallback={handleDsmiss}>
        {children}
      </ErrorBoundary>
    </div>
  );
}
