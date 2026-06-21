/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {use, useCallback, useContext, useEffect, useId, useState} from 'react';

import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import useOpenResource from '../useOpenResource';

import ElementBadges from './ElementBadges';

import styles from './StackTraceView.css';

import type {ReactStackTrace, ReactCallSite} from 'shared/ReactTypes';

import type {SourceMappedLocation} from 'react-devtools-shared/src/symbolicateSource';

import FetchFileWithCachingContext from './FetchFileWithCachingContext';

import {symbolicateSourceWithCache} from 'react-devtools-shared/src/symbolicateSource';

import formatLocationForDisplay from './formatLocationForDisplay';

type ResolvedCallSite = {
  callSite: ReactCallSite,
  ignored: boolean,
  isBuiltIn: boolean,
  location: ReactCallSite,
  symbolicatedLocation: null | ReactCallSite,
};

type CallSiteViewProps = {
  environmentName: null | string,
  resolvedCallSite: ResolvedCallSite,
};

export function CallSiteView({
  resolvedCallSite,
  environmentName,
}: CallSiteViewProps): React.Node {
  const {callSite, ignored, isBuiltIn, location, symbolicatedLocation} =
    resolvedCallSite;
  const [virtualFunctionName] = callSite;
  const [functionName, url, line, column] = location;

  const [linkIsEnabled, viewSource] = useOpenResource(
    callSite,
    symbolicatedLocation,
  );

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
  ignoredCallSites: IgnoredCallSitesState,
};

type IgnoredCallSitesToggleProps = {
  showIgnoredCallSites: boolean,
  onClick: () => void,
};

export function IgnoredCallSitesToggle({
  showIgnoredCallSites,
  onClick,
}: IgnoredCallSitesToggleProps): React.Node {
  const label = showIgnoredCallSites
    ? 'Hide ignore-listed frames'
    : 'Show ignore-listed frames';

  return (
    <Button
      aria-expanded={showIgnoredCallSites}
      className={styles.IgnoredCallSitesToggle}
      onClick={onClick}
      testName="ToggleIgnoreListedFrames"
      title={label}>
      <ButtonIcon
        className={styles.IgnoredCallSitesToggleIcon}
        type={showIgnoredCallSites ? 'expanded' : 'collapsed'}
      />
      <span className={styles.IgnoredCallSitesToggleLabel}>{label}</span>
    </Button>
  );
}

type IgnoredCallSitesState = {
  hasIgnoredCallSites: boolean,
  showIgnoredCallSites: boolean,
  onHasIgnoredCallSitesChange: (
    stackID: string,
    hasIgnoredCallSites: boolean,
  ) => void,
  onStackUnmount: (stackID: string) => void,
  toggle: () => void,
};

export function useIgnoredCallSites(): IgnoredCallSitesState {
  const [showIgnoredCallSites, setShowIgnoredCallSites] = useState(false);
  const [ignoredCallSiteStackIDs, setIgnoredCallSiteStackIDs] = useState<
    Set<string>,
  >(() => new Set());

  const onHasIgnoredCallSitesChange = useCallback(
    (stackID: string, hasIgnoredCallSites: boolean) => {
      setIgnoredCallSiteStackIDs(previous => {
        if (previous.has(stackID) === hasIgnoredCallSites) {
          return previous;
        }
        const next = new Set(previous);
        if (hasIgnoredCallSites) {
          next.add(stackID);
        } else {
          next.delete(stackID);
        }
        return next;
      });
    },
    [],
  );
  const onStackUnmount = useCallback((stackID: string) => {
    setIgnoredCallSiteStackIDs(previous => {
      if (!previous.has(stackID)) {
        return previous;
      }
      const next = new Set(previous);
      next.delete(stackID);
      return next;
    });
  }, []);

  const hasIgnoredCallSites = ignoredCallSiteStackIDs.size > 0;
  const toggle = useCallback(() => {
    setShowIgnoredCallSites(
      prevShowIgnoredCallSites => !prevShowIgnoredCallSites,
    );
  }, []);

  return {
    hasIgnoredCallSites,
    showIgnoredCallSites,
    onHasIgnoredCallSitesChange,
    onStackUnmount,
    toggle,
  };
}

export default function StackTraceView({
  stack,
  environmentName,
  ignoredCallSites,
}: Props): React.Node {
  const stackID = useId();
  const {onHasIgnoredCallSitesChange, onStackUnmount, showIgnoredCallSites} =
    ignoredCallSites;
  const fetchFileWithCaching = useContext(FetchFileWithCachingContext);

  const resolvedCallSites: Array<ResolvedCallSite> = [];
  let hasIgnoredCallSites = false;
  let lastVisibleCallSiteIndex = -1;

  for (let index = 0; index < stack.length; index++) {
    const callSite = stack[index];
    const [, virtualURL, virtualLine, virtualColumn] = callSite;

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

    const symbolicatedLocation =
      symbolicatedCallSite !== null ? symbolicatedCallSite.location : null;
    const location =
      symbolicatedLocation !== null ? symbolicatedLocation : callSite;
    const [, url] = location;

    const resolvedCallSite = {
      callSite,
      ignored:
        symbolicatedCallSite !== null ? symbolicatedCallSite.ignored : false,
      // This looks like a fake anonymous through eval.
      isBuiltIn: url === '' || url.startsWith('<anonymous>'),
      location,
      symbolicatedLocation,
    };
    resolvedCallSites.push(resolvedCallSite);

    if (resolvedCallSite.ignored) {
      hasIgnoredCallSites = true;
      continue;
    }

    if (!resolvedCallSite.isBuiltIn) {
      lastVisibleCallSiteIndex = index;
      continue;
    }

    const previousCallSite = resolvedCallSites[index - 1];
    if (
      previousCallSite !== undefined &&
      !previousCallSite.ignored &&
      !previousCallSite.isBuiltIn
    ) {
      lastVisibleCallSiteIndex = index;
    }
  }

  useEffect(() => {
    onHasIgnoredCallSitesChange(stackID, hasIgnoredCallSites);
  }, [hasIgnoredCallSites, onHasIgnoredCallSitesChange, stackID]);

  useEffect(() => {
    return () => {
      onStackUnmount(stackID);
    };
  }, [onStackUnmount, stackID]);

  return (
    <div
      className={
        showIgnoredCallSites
          ? `${styles.StackTraceView} ${styles.ShowIgnoredCallSites}`
          : styles.StackTraceView
      }>
      {resolvedCallSites.map((resolvedCallSite, index) => (
        <CallSiteView
          key={index}
          resolvedCallSite={resolvedCallSite}
          environmentName={
            // Badge the last visible row.
            index === lastVisibleCallSiteIndex ? environmentName : null
          }
        />
      ))}
    </div>
  );
}
