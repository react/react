/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {use, useContext} from 'react';

import useOpenResource from '../useOpenResource';

import ElementBadges from './ElementBadges';

import styles from './StackTraceView.css';

import type {ReactStackTrace, ReactCallSite} from 'shared/ReactTypes';

import type {SourceMappedLocation} from 'react-devtools-shared/src/symbolicateSource';

import FetchFileWithCachingContext from './FetchFileWithCachingContext';

import {symbolicateSourceWithCache} from 'react-devtools-shared/src/symbolicateSource';

import formatLocationForDisplay from './formatLocationForDisplay';

type CallSiteViewProps = {
  callSite: ReactCallSite,
  environmentName: null | string,
};

export function CallSiteView({
  callSite,
  environmentName,
}: CallSiteViewProps): React.Node {
  const fetchFileWithCaching = useContext(FetchFileWithCachingContext);

  const [virtualFunctionName, virtualURL, virtualLine, virtualColumn] =
    callSite;

  const symbolicatedCallSite: null | SourceMappedLocation =
    fetchFileWithCaching !== null
      ? use(
          symbolicateSourceWithCache(
            fetchFileWithCaching,
            virtualURL,
            virtualLine,
            virtualColumn,
          ),
        )
      : null;

  const [linkIsEnabled, viewSource] = useOpenResource(
    callSite,
    symbolicatedCallSite == null ? null : symbolicatedCallSite.location,
  );
  const [functionName, url, line, column] =
    symbolicatedCallSite !== null ? symbolicatedCallSite.location : callSite;
  const ignored =
    symbolicatedCallSite !== null ? symbolicatedCallSite.ignored : false;
  // TODO: Make an option to be able to toggle the display of ignore listed rows.
  // Ideally this UI should be higher than a single Stack Trace so that there's not
  // multiple buttons in a single inspection taking up space.

  const isBuiltIn = url === '' || url.startsWith('<anonymous>'); // This looks like a fake anonymous through eval.
  return (
    <div
      className={
        ignored
          ? styles.IgnoredCallSite
          : isBuiltIn
            ? styles.BuiltInCallSite
            : styles.CallSite
      }>
      {functionName || virtualFunctionName}
      {!isBuiltIn && (
        <>
          {' @ '}
          <span
            className={linkIsEnabled ? styles.Link : null}
            onClick={viewSource}
            title={url + ':' + line}>
            {formatLocationForDisplay(url, line, column)}
          </span>
        </>
      )}
      <ElementBadges
        className={styles.ElementBadges}
        environmentName={environmentName}
      />
    </div>
  );
}

type Props = {
  stack: ReactStackTrace,
  environmentName: null | string,
};

export default function StackTraceView({
  stack,
  environmentName,
}: Props): React.Node {
  return (
    <div className={styles.StackTraceView}>
      {stack.map((callSite, index) => (
        <CallSiteView
          key={index}
          callSite={callSite}
          environmentName={
            // Badge last row
            // TODO: If we start ignore listing the last row, we should badge the last
            // non-ignored row.
            index === stack.length - 1 ? environmentName : null
          }
        />
      ))}
    </div>
  );
}
