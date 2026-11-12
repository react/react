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

import portaledContent from 'react-devtools-shared/src/devtools/views/portaledContent';
import {OptionsContext} from 'react-devtools-shared/src/devtools/views/context';
import InspectedElement from 'react-devtools-shared/src/devtools/views/Components/InspectedElement';
import SettingsModal from 'react-devtools-shared/src/devtools/views/Settings/SettingsModal';
import SettingsModalContextToggle from 'react-devtools-shared/src/devtools/views/Settings/SettingsModalContextToggle';
import {SettingsModalContextController} from 'react-devtools-shared/src/devtools/views/Settings/SettingsModalContext';
import styles from './InspectedElementPane.css';

function InspectedElementPane() {
  const {hideSettings} = useContext(OptionsContext);
  return (
    <SettingsModalContextController>
      <div className={styles.InspectedElementPane}>
        <InspectedElement
          actionButtons={!hideSettings && <SettingsModalContextToggle />}
          fallbackEmpty={"Selected element wasn't rendered with React."}
        />
        <SettingsModal />
      </div>
    </SettingsModalContextController>
  );
}
export default portaledContent(InspectedElementPane) as component();
