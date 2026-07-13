/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/************************************************************************
 * This file is forked between different DevTools implementations.
 * It should never be imported directly!
 * It should always be imported from "react-devtools-feature-flags".
 ************************************************************************/

export const enableActivitySlices: boolean = false;
export const enableLogger: boolean = true;
export const enableStyleXFeatures: boolean = true;
export const isInternalFacebookBuild: boolean = true;

/************************************************************************
 * Do not edit the code below.
 * It ensures this fork exports the same types as the default flags file.
 ************************************************************************/

import typeof * as FeatureFlagsType from './DevToolsFeatureFlags.default';
import typeof * as ExportsType from './DevToolsFeatureFlags.core-fb';

// Flow magic to verify the exports of this file match the original version.
null as any as ExportsType as FeatureFlagsType as ExportsType;
