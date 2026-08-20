/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';

import {createContext} from 'react';

export type FetchFileWithCaching = (url: string) => Promise<string>;
export type Context = FetchFileWithCaching | null;

const FetchFileWithCachingContext: ReactContext<Context> =
  createContext<Context>(null);
FetchFileWithCachingContext.displayName = 'FetchFileWithCachingContext';

export default FetchFileWithCachingContext;
