/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {copy} from 'clipboard-js';

import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import Skeleton from './Skeleton';
import {withPermissionsCheck} from 'react-devtools-shared/src/frontend/utils/withPermissionsCheck';

import useOpenResource from '../useOpenResource';

import type {SourceMappedLocation} from 'react-devtools-shared/src/symbolicateSource';
import type {ReactFunctionLocation} from 'shared/ReactTypes';
import styles from './InspectedElementSourcePanel.css';

import formatLocationForDisplay from './formatLocationForDisplay';

type Props = {
  source: ReactFunctionLocation,
  symbolicatedSourcePromise: Promise<SourceMappedLocation | null>,
};

function InspectedElementSourcePanel({
  source,
  symbolicatedSourcePromise,
}: Props): React.Node {
  return (
    <div>
      <div className={styles.SourceHeaderRow}>
        <div className={styles.SourceHeader}>source</div>

        <React.Suspense
          fallback={
            <Button disabled={true} title="Loading source maps...">
              <ButtonIcon type="copy" />
            </Button>
          }>
          <CopySourceButton
            source={source}
            symbolicatedSourcePromise={symbolicatedSourcePromise}
          />
        </React.Suspense>
      </div>

      <React.Suspense
        fallback={
          <div className={styles.SourceOneLiner}>
            <Skeleton height={16} width="40%" />
          </div>
        }>
        <FormattedSourceString
          source={source}
          symbolicatedSourcePromise={symbolicatedSourcePromise}
        />
      </React.Suspense>
    </div>
  );
}

function CopySourceButton({source, symbolicatedSourcePromise}: Props) {
  const symbolicatedSource = React.use(symbolicatedSourcePromise);
  if (symbolicatedSource == null) {
    const [, sourceURL, line, column] = source;
    const handleCopy = withPermissionsCheck(
      {permissions: ['clipboardWrite']},
      () => copy(`${sourceURL}:${line}:${column}`),
    );

    return (
      <Button onClick={handleCopy} title="Copy to clipboard">
        <ButtonIcon type="copy" />
      </Button>
    );
  }

  const [, sourceURL, line, column] = symbolicatedSource.location;
  const handleCopy = withPermissionsCheck(
    {permissions: ['clipboardWrite']},
    () => copy(`${sourceURL}:${line}:${column}`),
  );

  return (
    <Button onClick={handleCopy} title="Copy to clipboard">
      <ButtonIcon type="copy" />
    </Button>
  );
}

function FormattedSourceString({source, symbolicatedSourcePromise}: Props) {
  const symbolicatedSource = React.use(symbolicatedSourcePromise);

  const [linkIsEnabled, viewSource] = useOpenResource(
    source,
    symbolicatedSource == null ? null : symbolicatedSource.location,
  );

  const [, sourceURL, line, column] =
    symbolicatedSource == null ? source : symbolicatedSource.location;

  return (
    <div
      className={styles.SourceOneLiner}
      data-testname="InspectedElementView-FormattedSourceString">
      <span
        className={linkIsEnabled ? styles.Link : null}
        title={sourceURL + ':' + line}
        onClick={viewSource}>
        {formatLocationForDisplay(sourceURL, line, column)}
      </span>
    </div>
  );
}

export default InspectedElementSourcePanel;
