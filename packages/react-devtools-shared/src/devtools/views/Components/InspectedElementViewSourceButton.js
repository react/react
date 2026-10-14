/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

import ButtonIcon from '../ButtonIcon';
import Button from '../Button';

import type {ReactFunctionLocation} from 'shared/ReactTypes';
import type {SourceMappedLocation} from 'react-devtools-shared/src/symbolicateSource';

import useOpenResource from '../useOpenResource';

type Props = {
  elementID?: number | null,
  source: null | ReactFunctionLocation,
  symbolicatedSource: SourceMappedLocation | null,
};

function InspectedElementViewSourceButton({
  source,
  symbolicatedSource,
  elementID,
}: Props): React.Node {
  return (
    <React.Suspense
      fallback={
        <Button disabled={true} title="Loading source maps...">
          <ButtonIcon type="view-source" />
        </Button>
      }>
      <ActualSourceButton
        elementID={elementID}
        source={source}
        symbolicatedSource={symbolicatedSource}
      />
    </React.Suspense>
  );
}

type ActualSourceButtonProps = {
  elementID?: number | null,
  source: null | ReactFunctionLocation,
  symbolicatedSource: SourceMappedLocation | null,
};
function ActualSourceButton({
  source,
  symbolicatedSource,
  elementID,
}: ActualSourceButtonProps): React.Node {
  const [buttonIsEnabled, viewSource] = useOpenResource(
    source,
    symbolicatedSource == null ? null : symbolicatedSource.location,
    elementID,
  );
  return (
    <Button
      disabled={!buttonIsEnabled}
      onClick={viewSource}
      title="View source for this element">
      <ButtonIcon type="view-source" />
    </Button>
  );
}

export default InspectedElementViewSourceButton;
