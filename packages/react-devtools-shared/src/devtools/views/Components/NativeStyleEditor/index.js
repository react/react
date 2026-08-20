/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useContext, useMemo} from 'react';

import {StoreContext} from 'react-devtools-shared/src/devtools/views/context';
import {useSubscription} from 'react-devtools-shared/src/devtools/views/hooks';
import {TreeStateContext} from 'react-devtools-shared/src/devtools/views/Components/TreeContext';

import {NativeStyleContext} from './context';
import LayoutViewer from './LayoutViewer';
import StyleEditor from './StyleEditor';
import styles from './index.css';

export default function NativeStyleEditorWrapper(): React.Node {
  const store = useContext(StoreContext);
  const subscription = useMemo(
    () => ({
      getCurrentValue: () => store.supportsNativeStyleEditor,
      subscribe: (callback: Function) => {
        store.addListener('supportsNativeStyleEditor', callback);
        return () => {
          store.removeListener('supportsNativeStyleEditor', callback);
        };
      },
    }),
    [store],
  );

  const supportsNativeStyleEditor = useSubscription<boolean>(subscription);
  if (!supportsNativeStyleEditor) {
    return null;
  }

  return <NativeStyleEditor />;
}

function NativeStyleEditor() {
  const {inspectedElementID} = useContext(TreeStateContext);
  const inspectedElementStyleAndLayout = useContext(NativeStyleContext);
  if (inspectedElementID === null) {
    return null;
  }
  if (inspectedElementStyleAndLayout === null) {
    return null;
  }

  const {layout, style} = inspectedElementStyleAndLayout;
  if (layout === null && style === null) {
    return null;
  }

  return (
    <div className={styles.Stack}>
      {layout !== null && (
        <LayoutViewer id={inspectedElementID} layout={layout} />
      )}
      {style !== null && <StyleEditor id={inspectedElementID} style={style} />}
    </div>
  );
}
