/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {LOCAL_STORAGE_ALWAYS_OPEN_IN_EDITOR} from '../../../constants';
import {useLocalStorage} from '../hooks';

import styles from './SettingsShared.css';

export default function CodeEditorByDefault({
  onChange,
}: {
  onChange?: boolean => void,
}): React.Node {
  const [alwaysOpenInEditor, setAlwaysOpenInEditor] = useLocalStorage<boolean>(
    LOCAL_STORAGE_ALWAYS_OPEN_IN_EDITOR,
    false,
  );

  return (
    <label className={styles.SettingRow}>
      <input
        type="checkbox"
        checked={alwaysOpenInEditor}
        onChange={({currentTarget}) => {
          setAlwaysOpenInEditor(currentTarget.checked);
          if (onChange) {
            onChange(currentTarget.checked);
          }
        }}
        className={styles.SettingRowCheckbox}
      />
      Open local files directly in your code editor
    </label>
  );
}
