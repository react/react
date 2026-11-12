/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// This client file is in the shared folder because it applies to both SSR and browser contexts.
// It is the configuration of the FlightClient behavior which can run in either environment.

import type {HintCode, HintModel} from '../server/ReactFlightServerConfigDOM';

import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';

import {getCrossOriginString} from './crossOriginStrings';

export function dispatchHint<Code: HintCode>(
  code: Code,
  model: HintModel<Code>,
): void {
  const dispatcher = ReactDOMSharedInternals.d; /* ReactDOMCurrentDispatcher */
  switch (code) {
    case 'D': {
      const refined = refineModel(code, model);
      const href = refined;
      dispatcher.D(/* prefetchDNS */ href);
      return;
    }
    case 'C': {
      const refined = refineModel(code, model);
      if (typeof refined === 'string') {
        const href = refined;
        dispatcher.C(/* preconnect */ href);
      } else {
        const href = refined[0];
        const crossOrigin = refined[1];
        dispatcher.C(/* preconnect */ href, crossOrigin);
      }
      return;
    }
    case 'L': {
      const refined = refineModel(code, model);
      const href = refined[0];
      const as = refined[1];
      if (refined.length === 3) {
        const options = refined[2];
        dispatcher.L(/* preload */ href, as, options);
      } else {
        dispatcher.L(/* preload */ href, as);
      }
      return;
    }
    case 'm': {
      const refined = refineModel(code, model);
      if (typeof refined === 'string') {
        const href = refined;
        dispatcher.m(/* preloadModule */ href);
      } else {
        const href = refined[0];
        const options = refined[1];
        dispatcher.m(/* preloadModule */ href, options);
      }
      return;
    }
    case 'X': {
      const refined = refineModel(code, model);
      if (typeof refined === 'string') {
        const href = refined;
        dispatcher.X(/* preinitScript */ href);
      } else {
        const href = refined[0];
        const options = refined[1];
        dispatcher.X(/* preinitScript */ href, options);
      }
      return;
    }
    case 'S': {
      const refined = refineModel(code, model);
      if (typeof refined === 'string') {
        const href = refined;
        dispatcher.S(/* preinitStyle */ href);
      } else {
        const href = refined[0];
        const precedence = refined[1] === 0 ? undefined : refined[1];
        const options = refined.length === 3 ? refined[2] : undefined;
        dispatcher.S(/* preinitStyle */ href, precedence, options);
      }
      return;
    }
    case 'M': {
      const refined = refineModel(code, model);
      if (typeof refined === 'string') {
        const href = refined;
        dispatcher.M(/* preinitModuleScript */ href);
      } else {
        const href = refined[0];
        const options = refined[1];
        dispatcher.M(/* preinitModuleScript */ href, options);
      }
      return;
    }
  }
}

// Flow is having trouble refining the HintModels so we help it a bit.
// This should be compiled out in the production build.
function refineModel<T>(code: T, model: HintModel<any>): HintModel<T> {
  return model;
}

export function preinitModuleForSSR(
  href: string,
  nonce: ?string,
  crossOrigin: ?string,
) {
  ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
    .M(/* preinitModuleScript */ href, {
      crossOrigin: getCrossOriginString(crossOrigin),
      integrity: undefined,
      nonce,
      fetchPriority: undefined,
    });
}

export function preinitScriptForSSR(
  href: string,
  nonce: ?string,
  crossOrigin: ?string,
) {
  ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
    .X(/* preinitScript */ href, {
      crossOrigin: getCrossOriginString(crossOrigin),
      integrity: undefined,
      fetchPriority: undefined,
      nonce,
    });
}
