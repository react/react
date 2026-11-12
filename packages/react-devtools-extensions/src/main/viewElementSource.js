/* global chrome */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ViewElementSource} from 'react-devtools-shared/src/devtools/views/DevTools';
import {normalizeUrlIfValid} from 'react-devtools-shared/src/utils';
import {viewElementSource} from './sourceSelection';

export function createViewElementSource(
  getRendererIDForElement: (id: number) => number | null,
): ViewElementSource {
  return (source, symbolicatedSource, elementID = null) => {
    // Vite inline maps can resolve their relative source to the generated URL.
    // openResource selects the network file in this case, so mapped line/column
    // numbers would land in compiled code. inspect(function) lets Chrome resolve
    // the function's actual script location through its own source map project.
    const hasURLCollision =
      symbolicatedSource !== null &&
      normalizeUrlIfValid(symbolicatedSource[1]) ===
        normalizeUrlIfValid(source[1]);
    const openLocation = () => {
      const [, sourceURL, line, column] = hasURLCollision
        ? source
        : symbolicatedSource || source;
      chrome.devtools.panels.openResource(
        normalizeUrlIfValid(sourceURL),
        line - 1,
        column - 1,
      );
    };
    if (hasURLCollision && elementID !== null) {
      const rendererID = getRendererIDForElement(elementID);
      if (rendererID !== null) {
        viewElementSource(rendererID, elementID, didInspect => {
          if (!didInspect) openLocation();
        });
        return;
      }
    }
    // A stack frame has no component function identity. Keep its generated
    // coordinates together with its generated URL rather than mixing locations.
    openLocation();
  };
}
