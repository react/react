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
  unstable_useCacheRefresh as useCacheRefresh,
  useTransition,
} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import Store from '../../store';
import sharedStyles from './InspectedElementSharedStyles.css';
import styles from './InspectedElementErrorsAndWarningsTree.css';
import {
  clearErrorsForElement as clearErrorsForElementAPI,
  clearWarningsForElement as clearWarningsForElementAPI,
} from 'react-devtools-shared/src/backendAPI';

import type {InspectedElement} from 'react-devtools-shared/src/frontend/types';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';

type Props = {
  bridge: FrontendBridge,
  inspectedElement: InspectedElement,
  store: Store,
};

export default function InspectedElementErrorsAndWarningsTree({
  bridge,
  inspectedElement,
  store,
}: Props): React.Node {
  const refresh = useCacheRefresh();

  const [isErrorsTransitionPending, startClearErrorsTransition] =
    useTransition();
  const clearErrorsForInspectedElement = () => {
    const {id} = inspectedElement;
    const rendererID = store.getRendererIDForElement(id);
    if (rendererID !== null) {
      startClearErrorsTransition(() => {
        clearErrorsForElementAPI({
          bridge,
          id,
          rendererID,
        });
        refresh();
      });
    }
  };

  const [isWarningsTransitionPending, startClearWarningsTransition] =
    useTransition();
  const clearWarningsForInspectedElement = () => {
    const {id} = inspectedElement;
    const rendererID = store.getRendererIDForElement(id);
    if (rendererID !== null) {
      startClearWarningsTransition(() => {
        clearWarningsForElementAPI({
          bridge,
          id,
          rendererID,
        });
        refresh();
      });
    }
  };

  if (!store.displayingErrorsAndWarningsEnabled) {
    return null;
  }

  const {errors, warnings} = inspectedElement;
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <React.Fragment>
      {errors.length > 0 && (
        <Tree
          badgeClassName={styles.ErrorBadge}
          bridge={bridge}
          className={styles.ErrorTree}
          clearMessages={clearErrorsForInspectedElement}
          entries={errors}
          isTransitionPending={isErrorsTransitionPending}
          label="errors"
          messageClassName={styles.Error}
        />
      )}
      {warnings.length > 0 && (
        <Tree
          badgeClassName={styles.WarningBadge}
          bridge={bridge}
          className={styles.WarningTree}
          clearMessages={clearWarningsForInspectedElement}
          entries={warnings}
          isTransitionPending={isWarningsTransitionPending}
          label="warnings"
          messageClassName={styles.Warning}
        />
      )}
    </React.Fragment>
  );
}

type TreeProps = {
  badgeClassName: string,
  actions: React$Node,
  className: string,
  clearMessages: () => void,
  entries: Array<[string, number]>,
  isTransitionPending: boolean,
  label: string,
  messageClassName: string,
};

function Tree({
  badgeClassName,
  actions,
  className,
  clearMessages,
  entries,
  isTransitionPending,
  label,
  messageClassName,
}: TreeProps) {
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className={className}>
      <div className={`${sharedStyles.HeaderRow} ${styles.HeaderRow}`}>
        <div className={sharedStyles.Header}>{label}</div>
        <Button
          disabled={isTransitionPending}
          onClick={clearMessages}
          title={`Clear all ${label} for this component`}>
          <ButtonIcon type="clear" />
        </Button>
      </div>
      {entries.map(([message, count], index) => (
        <ErrorOrWarningView
          key={`${label}-${index}`}
          badgeClassName={badgeClassName}
          className={messageClassName}
          count={count}
          message={message}
        />
      ))}
    </div>
  );
}

type ErrorOrWarningViewProps = {
  badgeClassName: string,
  className: string,
  count: number,
  message: string,
};

function ErrorOrWarningView({
  className,
  badgeClassName,
  count,
  message,
}: ErrorOrWarningViewProps) {
  return (
    <div className={className}>
      {count > 1 && <div className={badgeClassName}>{count}</div>}
      <div className={styles.Message} title={message}>
        {message}
      </div>
    </div>
  );
}
