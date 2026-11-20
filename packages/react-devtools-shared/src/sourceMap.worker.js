/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as sourceMapWorker from './sourceMapWorker';

export const prepareSourceMap = sourceMapWorker.prepareSourceMap;
export const loadSourceMap = sourceMapWorker.loadSourceMap;
export const resolveSource = sourceMapWorker.resolveSource;
