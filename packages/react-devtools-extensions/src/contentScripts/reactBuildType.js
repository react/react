/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {ReactBuildType} from 'react-devtools-shared/src/backend/types';

function reduceReactBuild(
  currentReactBuildType: null | ReactBuildType,
  nextReactBuildType: ReactBuildType,
): ReactBuildType {
  if (
    currentReactBuildType === null ||
    currentReactBuildType === 'production'
  ) {
    return nextReactBuildType;
  }

  // We only display the "worst" build type, so if we've already detected a non-production build,
  // we ignore any future production builds. This way if a page has multiple renderers,
  // and at least one of them is a non-production build, we'll display that instead of "production".
  return nextReactBuildType === 'production'
    ? currentReactBuildType
    : nextReactBuildType;
}

export function createReactRendererListener(target: {
  postMessage: Function,
  ...
}): ({reactBuildType: ReactBuildType}) => void {
  let displayedReactBuild: null | ReactBuildType = null;

  return function ({reactBuildType}) {
    displayedReactBuild = reduceReactBuild(displayedReactBuild, reactBuildType);

    target.postMessage(
      {
        source: 'react-devtools-hook',
        payload: {
          type: 'react-renderer-attached',
          reactBuildType: displayedReactBuild,
        },
      },
      '*',
    );
  };
}
