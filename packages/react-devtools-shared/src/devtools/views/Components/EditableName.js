/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useCallback, useState} from 'react';
import AutoSizeInput from './NativeStyleEditor/AutoSizeInput';
import styles from './EditableName.css';

type Type = 'props' | 'state' | 'context' | 'hooks';
type OverrideNameFn = (
  oldName: Array<string | number>,
  newName: Array<string | number>,
) => void;

type EditableNameProps = {
  allowEmpty?: boolean,
  allowWhiteSpace?: boolean,
  autoFocus?: boolean,
  className?: string,
  initialValue?: string,
  overrideName: OverrideNameFn,
  path: Array<string | number>,
  type: Type,
};

export default function EditableName({
  allowEmpty = false,
  allowWhiteSpace = false,
  autoFocus = false,
  className = '',
  initialValue = '',
  overrideName,
  path,
  type,
}: EditableNameProps): React.Node {
  const [editableName, setEditableName] = useState(initialValue);
  const [isValid, setIsValid] = useState(false);

  const handleChange = useCallback(
    ({target}: $FlowFixMe) => {
      let value = target.value;
      if (!allowWhiteSpace) {
        value = value.trim();
      }

      if (allowEmpty || value !== '') {
        setIsValid(true);
      } else {
        setIsValid(false);
      }

      setEditableName(value);
    },
    [overrideName],
  );

  const handleKeyDown = useCallback(
    (event: $FlowFixMe) => {
      // Prevent keydown events from e.g. change selected element in the tree
      event.stopPropagation();

      switch (event.key) {
        case 'Enter':
        case 'Tab':
          if (isValid) {
            const basePath = path.slice(0, path.length - 1);
            overrideName(
              [...basePath, initialValue],
              [...basePath, editableName],
            );
          }
          break;
        case 'Escape':
          setEditableName(initialValue);
          break;
        default:
          break;
      }
    },
    [editableName, setEditableName, isValid, initialValue, overrideName],
  );

  return (
    <AutoSizeInput
      autoFocus={autoFocus}
      className={[styles.Input, className].join(' ')}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="new entry"
      testName="EditableName"
      type="text"
      value={editableName}
    />
  );
}
