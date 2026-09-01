/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

import Button from 'react-devtools-shared/src/devtools/views/Button';
import ButtonIcon from 'react-devtools-shared/src/devtools/views/ButtonIcon';
import ButtonLabel from 'react-devtools-shared/src/devtools/views/ButtonLabel';

import type {SourceSelection} from './EditorPane';
import type {ReactFunctionLocation} from 'shared/ReactTypes';

import {checkConditions} from './utils';

type Props = {
  editorURL: string,
  source: ?SourceSelection,
  className?: string,
};

function ActualOpenInEditorButton({
  editorURL,
  source,
  className,
}: Props): React.Node {
  let disable;
  if (source == null) {
    disable = true;
  } else {
    const staleLocation: ReactFunctionLocation = [
      '',
      source.url,
      // This is not live but we just use any line/column to validate whether this can be opened.
      // We'll call checkConditions again when we click it to get the latest line number.
      source.selectionRef.line,
      source.selectionRef.column,
    ];
    disable = checkConditions(editorURL, staleLocation).shouldDisableButton;
  }
  return (
    <Button
      disabled={disable}
      className={className}
      onClick={() => {
        if (source == null) {
          return;
        }
        const latestLocation: ReactFunctionLocation = [
          '',
          source.url,
          // These might have changed since we last read it.
          source.selectionRef.line,
          source.selectionRef.column,
        ];
        const {url, shouldDisableButton} = checkConditions(
          editorURL,
          latestLocation,
        );
        if (!shouldDisableButton) {
          window.open(url);
        }
      }}>
      <ButtonIcon type="editor" />
      <ButtonLabel>Open in editor</ButtonLabel>
    </Button>
  );
}

function OpenInEditorButton({editorURL, source, className}: Props): React.Node {
  return (
    <React.Suspense
      fallback={
        <Button disabled={true} className={className}>
          <ButtonIcon type="editor" />
          <ButtonLabel>Loading source maps...</ButtonLabel>
        </Button>
      }>
      <ActualOpenInEditorButton
        editorURL={editorURL}
        source={source}
        className={className}
      />
    </React.Suspense>
  );
}

export default OpenInEditorButton;
