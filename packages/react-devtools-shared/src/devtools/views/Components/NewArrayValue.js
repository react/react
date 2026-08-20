/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useState} from 'react';
import Store from '../../store';
import EditableName from './EditableName';
import {smartParse} from '../../utils';
import {parseHookPathForEdit} from './utils';
import styles from './NewArrayValue.css';

import type {InspectedElement} from 'react-devtools-shared/src/frontend/types';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';

type Props = {
  bridge: FrontendBridge,
  depth: number,
  hidden: boolean,
  hookID?: ?number,
  index: number,
  inspectedElement: InspectedElement,
  path: Array<string | number>,
  store: Store,
  type: 'props' | 'context' | 'hooks' | 'state',
};

export default function NewArrayValue({
  bridge,
  depth,
  hidden,
  hookID,
  index,
  inspectedElement,
  path,
  store,
  type,
}: Props): React.Node {
  const [key, setKey] = useState<number>(0);
  const [isInvalid, setIsInvalid] = useState(false);

  // This is a bit of an unusual usage of the EditableName component,
  // but otherwise it acts the way we want for a new Array entry.
  // $FlowFixMe[missing-local-annot]
  const overrideName = (oldPath: any, newPath) => {
    const value = newPath[newPath.length - 1];

    let parsedValue;
    let newIsInvalid = true;
    try {
      parsedValue = smartParse(value);
      newIsInvalid = false;
    } catch (error) {}

    if (isInvalid !== newIsInvalid) {
      setIsInvalid(newIsInvalid);
    }

    if (!newIsInvalid) {
      setKey(key + 1);

      const {id} = inspectedElement;
      const rendererID = store.getRendererIDForElement(id);
      if (rendererID !== null) {
        let basePath = path;
        if (hookID != null) {
          basePath = parseHookPathForEdit(basePath);
        }

        bridge.send('overrideValueAtPath', {
          type,
          hookID,
          id,
          path: [...basePath, index],
          rendererID,
          value: parsedValue,
        });
      }
    }
  };

  return (
    <div
      key={key}
      hidden={hidden}
      style={{
        paddingLeft: `${(depth - 1) * 0.75}rem`,
      }}>
      <div className={styles.NewArrayValue}>
        <EditableName
          allowWhiteSpace={true}
          autoFocus={key > 0}
          className={[styles.EditableName, isInvalid && styles.Invalid].join(
            ' ',
          )}
          initialValue=""
          overrideName={overrideName}
          path={path}
        />
      </div>
    </div>
  );
}
