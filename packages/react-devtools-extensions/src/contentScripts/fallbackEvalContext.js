/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {evalScripts} from '../evalScripts';

window.addEventListener('message', event => {
  if (event.data?.source === 'react-devtools-content-script-eval') {
    const {scriptId, args, requestId} = event.data.payload;
    const response = {result: null, error: null};
    try {
      if (!evalScripts[scriptId]) {
        throw new Error(`No eval script with id "${scriptId}" exists.`);
      }
      response.result = evalScripts[scriptId].fn.apply(null, args);
    } catch (err) {
      response.error = err.message;
    }
    window.postMessage(
      {
        source: 'react-devtools-content-script-eval-response',
        payload: {
          requestId,
          response,
        },
      },
      '*',
    );
  }
});
