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
import styles from './UserList.css';

type Props = {
  onSave: (name: string, age: number) => void,
};

// Form state is local, so typing re-renders only this component.
// Rendering stays fast; the slow part of this playground is the list.
export default function UserForm({onSave}: Props): React.Node {
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');

  const handleSave = useCallback(() => {
    const parsedAge = parseInt(age, 10);
    if (name !== '' && !isNaN(parsedAge)) {
      onSave(name, parsedAge);
      setName('');
      setAge('');
    }
  }, [name, age, onSave]);

  const handleKeyPress = useCallback(
    (event: $FlowFixMe) => {
      if (event.key === 'Enter') {
        handleSave();
      }
    },
    [handleSave],
  );

  return (
    <div className={styles.Form}>
      <input
        type="text"
        placeholder="Name"
        className={styles.Input}
        value={name}
        onChange={event => setName(event.currentTarget.value)}
        onKeyPress={handleKeyPress}
      />
      <input
        type="number"
        placeholder="Age"
        className={styles.Input}
        value={age}
        onChange={event => setAge(event.currentTarget.value)}
        onKeyPress={handleKeyPress}
      />
      <button
        className={styles.SaveButton}
        disabled={name === '' || age === ''}
        onClick={handleSave}>
        Save
      </button>
    </div>
  );
}
