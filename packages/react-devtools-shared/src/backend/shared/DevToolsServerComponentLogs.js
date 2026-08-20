/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// This keeps track of Server Component logs which may come from.
// This is in a shared module because Server Component logs don't come from a specific renderer
// but can become associated with a Virtual Instance of any renderer.

import type {ReactComponentInfo} from 'shared/ReactTypes';

type ComponentLogs = {
  errors: Map<string, number>,
  errorsCount: number,
  warnings: Map<string, number>,
  warningsCount: number,
};

// This keeps it around as long as the ComponentInfo is alive which
// lets the Fiber get reparented/remounted and still observe the previous errors/warnings.
// Unless we explicitly clear the logs from a Fiber.
export const componentInfoToComponentLogsMap: WeakMap<
  ReactComponentInfo,
  ComponentLogs,
> = new WeakMap();
