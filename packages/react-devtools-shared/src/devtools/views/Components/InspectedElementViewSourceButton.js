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
  source: null | ReactFunctionLocation,
  symbolicatedSourcePromise: Promise<SourceMappedLocation | null> | null,
};

function InspectedElementViewSourceButton({
  source,
  symbolicatedSourcePromise,
}: Props): React.Node {
  return (
    <React.Suspense
      fallback={
        <Button disabled={true} title="Loading source maps...">
          <ButtonIcon type="view-source" />
        </Button>
      }>
      <ActualSourceButton
        source={source}
        symbolicatedSourcePromise={symbolicatedSourcePromise}
      />
    </React.Suspense>
  );
}

type ActualSourceButtonProps = {
  source: null | ReactFunctionLocation,
  symbolicatedSourcePromise: Promise<SourceMappedLocation | null> | null,
};
function ActualSourceButton({
  source,
  symbolicatedSourcePromise,
}: ActualSourceButtonProps): React.Node {
  const symbolicatedSource =
    symbolicatedSourcePromise == null
      ? null
      : React.use(symbolicatedSourcePromise);

  const [buttonIsEnabled, viewSource] = useOpenResource(
    source,
    symbolicatedSource == null ? null : symbolicatedSource.location,
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
