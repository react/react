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

import type {ReactFunctionLocation} from 'shared/ReactTypes';
import type {SourceMappedLocation} from 'react-devtools-shared/src/symbolicateSource';

import {checkConditions} from '../Editor/utils';

type Props = {
  editorURL: string,
  source: ReactFunctionLocation,
  symbolicatedSourcePromise: Promise<SourceMappedLocation | null>,
};

function OpenSymbolicatedSourceInEditorButton({
  editorURL,
  source,
  symbolicatedSourcePromise,
}: Props): React.Node {
  const symbolicatedSource = React.use(symbolicatedSourcePromise);

  const {url, shouldDisableButton} = checkConditions(
    editorURL,
    symbolicatedSource ? symbolicatedSource.location : source,
  );

  return (
    <Button
      disabled={shouldDisableButton}
      onClick={() => window.open(url)}
      title="Open in editor">
      <ButtonIcon type="editor" />
    </Button>
  );
}

function OpenInEditorButton(props: Props): React.Node {
  return (
    <React.Suspense
      fallback={
        <Button disabled={true} title="retrieving original source…">
          <ButtonIcon type="editor" />
        </Button>
      }>
      <OpenSymbolicatedSourceInEditorButton {...props} />
    </React.Suspense>
  );
}

export default OpenInEditorButton;
