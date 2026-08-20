/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* This file is used to test the effect auto-deps configuration, which
 * allows you to specify functions that should have dependencies added to
 * callsites.
 */
import {useEffect} from 'react';

export default function useEffectWrapper(f: () => void | (() => void)): void {
  useEffect(() => {
    f();
  }, [f]);
}
