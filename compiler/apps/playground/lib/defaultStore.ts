/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Store} from './stores';

const index = `\
export default function MyApp() {
  return <div>Hello World</div>;
}
`;

export const defaultConfig = `\
{
  //compilationMode: "all"
}`;

export const defaultStore: Store = {
  source: index,
  config: defaultConfig,
  showInternals: false,
};

export const emptyStore: Store = {
  source: '',
  config: '',
  showInternals: false,
};
