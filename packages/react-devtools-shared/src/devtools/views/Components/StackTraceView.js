/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext} from 'react';

import Button from '../Button';
import useOpenResource from '../useOpenResource';

import ElementBadges from './ElementBadges';

import styles from './StackTraceView.css';

import type {ReactStackTrace, ReactCallSite} from 'shared/ReactTypes';

import type {SourceMappedLocation} from 'react-devtools-shared/src/symbolicateSource';

import SourceMappedStackContext from './SourceMappedStackContext';
import useSymbolicatedSources from './useSymbolicatedSources';
import type {MappedSources} from './useSymbolicatedSources';

import formatLocationForDisplay from './formatLocationForDisplay';

type CallSiteViewProps = {
  callSite: ReactCallSite,
  symbolicatedCallSite: SourceMappedLocation | null,
  environmentName: null | string,
  showIgnoreList: boolean,
};

export function CallSiteView({
  callSite,
  symbolicatedCallSite,
  environmentName,
  showIgnoreList,
}: CallSiteViewProps): React.Node {
  const [virtualFunctionName] = callSite;

  const [linkIsEnabled, viewSource] = useOpenResource(
    callSite,
    symbolicatedCallSite == null ? null : symbolicatedCallSite.location,
  );
  const [functionName, url, line, column] =
    symbolicatedCallSite !== null ? symbolicatedCallSite.location : callSite;
  const ignored =
    symbolicatedCallSite !== null ? symbolicatedCallSite.ignored : false;

  const isBuiltIn = url === '' || url.startsWith('<anonymous>'); // This looks like a fake anonymous through eval.
  return (
    <div
      className={
        ignored
          ? styles.IgnoredCallSite +
            (showIgnoreList ? ' ' + styles.CallSite : '')
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

type IgnoreListToggleButtonProps = {
  onClick: () => void,
  showIgnoreList: boolean,
};

export function IgnoreListToggleButton({
  onClick,
  showIgnoreList,
}: IgnoreListToggleButtonProps): React.Node {
  const label = showIgnoreList
    ? 'Hide ignore-listed frames'
    : 'Show ignore-listed frames';

  return (
    <div className={styles.IgnoreListToggleContainer}>
      <Button
        className={styles.IgnoreListToggleButton}
        onClick={onClick}
        title={label}>
        {label}
      </Button>
    </div>
  );
}

type Props = {
  stack: ReactStackTrace,
  environmentName: null | string,
  showIgnoreList: boolean,
};

export default function StackTraceView({
  stack,
  environmentName,
  showIgnoreList,
}: Props): React.Node {
  const mapped = useContext(SourceMappedStackContext);
  return mapped === null ? (
    <StandaloneStackTraceView
      stack={stack}
      environmentName={environmentName}
      showIgnoreList={showIgnoreList}
    />
  ) : (
    <StackTraceContent
      stack={stack}
      environmentName={environmentName}
      showIgnoreList={showIgnoreList}
      mapped={mapped}
    />
  );
}

function StandaloneStackTraceView(props: Props): React.Node {
  const mapped = useSymbolicatedSources(props.stack);
  return <StackTraceContent {...props} mapped={mapped} />;
}

function StackTraceContent({
  stack,
  environmentName,
  showIgnoreList,
  mapped,
}: {
  ...Props,
  mapped: MappedSources,
}): React.Node {
  let lastMeaningfulFrameIndex = -1;
  // Reverse loop to find the last non-ignored, non-built-in index
  for (let index = stack.length - 1; index >= 0; index--) {
    const callSite = stack[index];
    const symbolicatedCallSite = mapped.get(callSite) || null;
    const [, url] =
      symbolicatedCallSite !== null ? symbolicatedCallSite.location : callSite;
    const ignored =
      symbolicatedCallSite !== null ? symbolicatedCallSite.ignored : false;
    // This looks like a fake anonymous through eval.
    const isBuiltIn = url === '' || url.startsWith('<anonymous>');

    if (!ignored && !isBuiltIn) {
      lastMeaningfulFrameIndex = index;
      break;
    }
  }

  return (
    <div className={styles.StackTraceView}>
      {stack.map((callSite, index) => (
        <CallSiteView
          key={index}
          callSite={callSite}
          symbolicatedCallSite={mapped.get(callSite) || null}
          environmentName={
            // Badge last meaningful frame (non-ignored, non-built-in)
            index === lastMeaningfulFrameIndex ? environmentName : null
          }
          showIgnoreList={showIgnoreList}
        />
      ))}
    </div>
  );
}
