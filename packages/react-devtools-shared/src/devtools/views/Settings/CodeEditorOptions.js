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
  LOCAL_STORAGE_OPEN_IN_EDITOR_URL,
  LOCAL_STORAGE_OPEN_IN_EDITOR_URL_PRESET,
} from '../../../constants';
import {useLocalStorage} from '../hooks';
import {
  getDefaultPreset,
  getDefaultOpenInEditorURL,
} from 'react-devtools-shared/src/utils';

import styles from './SettingsShared.css';

export default function CodeEditorOptions({
  environmentNames,
}: {
  environmentNames: Promise<Array<string>>,
}): React.Node {
  const [openInEditorURLPreset, setOpenInEditorURLPreset] = useLocalStorage<
    'vscode' | 'custom',
  >(LOCAL_STORAGE_OPEN_IN_EDITOR_URL_PRESET, getDefaultPreset());

  const [openInEditorURL, setOpenInEditorURL] = useLocalStorage<string>(
    LOCAL_STORAGE_OPEN_IN_EDITOR_URL,
    getDefaultOpenInEditorURL(),
  );

  return (
    <>
      <select
        value={openInEditorURLPreset}
        onChange={({currentTarget}) => {
          const selectedValue = currentTarget.value;
          setOpenInEditorURLPreset(selectedValue);
        }}>
        <option value="vscode">VS Code</option>
        <option value="custom">Custom</option>
      </select>
      {openInEditorURLPreset === 'custom' && (
        <input
          className={styles.Input}
          type="text"
          placeholder={getDefaultOpenInEditorURL()}
          value={openInEditorURL}
          onChange={event => {
            setOpenInEditorURL(event.target.value);
          }}
        />
      )}
    </>
  );
}
