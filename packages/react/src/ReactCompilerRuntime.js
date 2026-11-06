/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {useMemoCache} from './ReactHooks';

export const c: (size: number) => Array<mixed> = useMemoCache;
