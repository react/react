/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {copy} from 'clipboard-js';
import * as React from 'react';
import {ElementTypeHostComponent} from 'react-devtools-shared/src/frontend/types';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import KeyValue from './KeyValue';
import {alphaSortEntries, serializeDataForCopy} from '../utils';
import Store from '../../store';
import styles from './InspectedElementSharedStyles.css';
import {withPermissionsCheck} from 'react-devtools-shared/src/frontend/utils/withPermissionsCheck';

import type {InspectedElement} from 'react-devtools-shared/src/frontend/types';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type {Element} from 'react-devtools-shared/src/frontend/types';

type Props = {
  bridge: FrontendBridge,
  element: Element,
  inspectedElement: InspectedElement,
  store: Store,
};

export default function InspectedElementStateTree({
  bridge,
  element,
  inspectedElement,
  store,
}: Props): React.Node {
  const {state, type} = inspectedElement;
  if (state == null) {
    return null;
  }

  // HostSingleton and HostHoistable may have state that we don't want to expose to users
  const isHostComponent = type === ElementTypeHostComponent;
  const entries = Object.entries(state);
  const isEmpty = entries.length === 0;
  if (isEmpty || isHostComponent) {
    return null;
  }

  entries.sort(alphaSortEntries);
  const handleCopy = withPermissionsCheck(
    {permissions: ['clipboardWrite']},
    () => copy(serializeDataForCopy(state)),
  );

  return (
    <div>
      <div className={styles.HeaderRow}>
        <div className={styles.Header}>state</div>
        {/* $FlowFixMe[constant-condition] */}
        {!isEmpty && (
          <Button onClick={handleCopy} title="Copy to clipboard">
            <ButtonIcon type="copy" />
          </Button>
        )}
      </div>
      {/* $FlowFixMe[constant-condition] */}
      {isEmpty && <div className={styles.Empty}>None</div>}
      {/* $FlowFixMe[constant-condition] */}
      {!isEmpty &&
        (entries as any).map(([name, value]) => (
          <KeyValue
            key={name}
            alphaSort={true}
            bridge={bridge}
            canDeletePaths={true}
            canEditValues={true}
            canRenamePaths={true}
            depth={1}
            element={element}
            hidden={false}
            inspectedElement={inspectedElement}
            name={name}
            path={[name]}
            pathRoot="state"
            store={store}
            value={value}
          />
        ))}
    </div>
  );
}
