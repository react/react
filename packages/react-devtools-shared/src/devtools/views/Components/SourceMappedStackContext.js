/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createContext} from 'react';
import type {ReactContext} from 'shared/ReactTypes';
import type {MappedSources} from './useSymbolicatedSources';

const SourceMappedStackContext: ReactContext<MappedSources | null> =
  createContext(null);
export default SourceMappedStackContext;
