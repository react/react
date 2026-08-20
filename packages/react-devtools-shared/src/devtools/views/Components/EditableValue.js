/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment} from 'react';
import styles from './EditableValue.css';
import {useEditableValue} from '../hooks';

type OverrideValueFn = (path: Array<string | number>, value: any) => void;

type EditableValueProps = {
  className?: string,
  overrideValue: OverrideValueFn,
  path: Array<string | number>,
  value: any,
};

export default function EditableValue({
  className = '',
  overrideValue,
  path,
  value,
}: EditableValueProps): React.Node {
  const [state, dispatch] = useEditableValue(value);
  const {editableValue, hasPendingChanges, isValid, parsedValue} = state;

  const reset = () =>
    dispatch({
      type: 'RESET',
      externalValue: value,
    });

  // $FlowFixMe[missing-local-annot]
  const handleChange = ({target}) =>
    dispatch({
      type: 'UPDATE',
      editableValue: target.value,
      externalValue: value,
    });

  // $FlowFixMe[missing-local-annot]
  const handleCheckBoxToggle = ({target}) => {
    dispatch({
      type: 'UPDATE',
      editableValue: target.checked,
      externalValue: value,
    });

    // Unlike <input type="text"> which has both an onChange and an onBlur,
    // <input type="checkbox"> updates state *and* applies changes in a single event.
    // So we read from target.checked rather than parsedValue (which has not yet updated).
    // We also don't check isValid (because that hasn't changed yet either);
    // we don't need to check it anyway, since target.checked is always a boolean.
    overrideValue(path, target.checked);
  };

  // $FlowFixMe[missing-local-annot]
  const handleKeyDown = event => {
    // Prevent keydown events from e.g. change selected element in the tree
    event.stopPropagation();

    switch (event.key) {
      case 'Enter':
        applyChanges();
        break;
      case 'Escape':
        reset();
        break;
      default:
        break;
    }
  };

  const applyChanges = () => {
    if (isValid && hasPendingChanges) {
      overrideValue(path, parsedValue);
    }
  };

  let placeholder = '';
  if (editableValue === undefined) {
    placeholder = '(undefined)';
  } else {
    placeholder = 'Enter valid JSON';
  }

  const isBool = parsedValue === true || parsedValue === false;

  return (
    <Fragment>
      <input
        autoComplete="new-password"
        className={`${isValid ? styles.Input : styles.Invalid} ${className}`}
        data-testname="EditableValue"
        onBlur={applyChanges}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        type="text"
        value={editableValue}
      />
      {isBool && (
        <input
          className={styles.Checkbox}
          checked={parsedValue}
          type="checkbox"
          onChange={handleCheckBoxToggle}
        />
      )}
    </Fragment>
  );
}
