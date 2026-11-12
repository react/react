/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {useState, startTransition} from 'react';

import portaledContent from '../portaledContent';

import styles from './EditorPane.css';

import Button from 'react-devtools-shared/src/devtools/views/Button';
import ButtonIcon from 'react-devtools-shared/src/devtools/views/ButtonIcon';

import OpenInEditorButton from './OpenInEditorButton';
import useEditorURL from '../useEditorURL';

import EditorSettings from './EditorSettings';
import CodeEditorByDefault from '../Settings/CodeEditorByDefault';

export type SourceSelection = {
  url: string,
  // The selection is a ref so that we don't have to rerender every keystroke.
  selectionRef: {
    line: number,
    column: number,
  },
};

export type Props = {selectedSource: ?SourceSelection};

function EditorPane({selectedSource}: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [showLinkInfo, setShowLinkInfo] = useState(false);

  const editorURL = useEditorURL();

  if (showLinkInfo) {
    return (
      <div className={styles.EditorPane}>
        <div className={styles.EditorToolbar}>
          <div style={{display: 'flex', flex: '1 1 auto'}}>
            To enable link handling in your browser's DevTools settings, look
            for the option Extension -> Link Handling. Select "React Developer
            Tools".
          </div>
          <div className={styles.VRule} />
          <Button
            onClick={() =>
              startTransition(() => {
                setShowLinkInfo(false);
                setShowSettings(false);
              })
            }>
            <ButtonIcon type="close" />
          </Button>
        </div>
      </div>
    );
  }

  let editorToolbar;
  if (showSettings) {
    editorToolbar = (
      <div className={styles.EditorToolbar}>
        <EditorSettings />
        <div className={styles.VRule} />
        <Button onClick={() => startTransition(() => setShowSettings(false))}>
          <ButtonIcon type="close" />
        </Button>
      </div>
    );
  } else {
    editorToolbar = (
      <div className={styles.EditorToolbar}>
        <OpenInEditorButton
          className={styles.WideButton}
          editorURL={editorURL}
          source={selectedSource}
        />
        <div className={styles.VRule} />
        <Button
          onClick={() => startTransition(() => setShowSettings(true))}
          // We don't use the title here because we don't have enough space to show it.
          // Once we expand this pane we can add it.
          // title="Configure code editor"
        >
          <ButtonIcon type="settings" />
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.EditorPane}>
      {editorToolbar}
      <div className={styles.EditorInfo}>
        {editorURL ? (
          <CodeEditorByDefault
            onChange={alwaysOpenInEditor => {
              if (alwaysOpenInEditor) {
                startTransition(() => setShowLinkInfo(true));
              }
            }}
          />
        ) : (
          'Configure an external editor to open local files.'
        )}
      </div>
    </div>
  );
}
export default portaledContent(EditorPane) as component();
