/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  CrossOriginEnum,
  PreloadImplOptions,
  PreloadModuleImplOptions,
  PreinitStyleOptions,
  PreinitScriptOptions,
  PreinitModuleScriptOptions,
} from 'react-dom/src/shared/ReactDOMTypes';

import {
  emitHint,
  getHints,
  resolveRequest,
} from 'react-server/src/ReactFlightServer';

import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';

const previousDispatcher =
  ReactDOMSharedInternals.d; /* ReactDOMCurrentDispatcher */
ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */ = {
  f /* flushSyncWork */: previousDispatcher.f /* flushSyncWork */,
  r /* requestFormReset */: previousDispatcher.r /* requestFormReset */,
  D /* prefetchDNS */: prefetchDNS,
  C /* preconnect */: preconnect,
  L /* preload */: preload,
  m /* preloadModule */: preloadModule,
  X /* preinitScript */: preinitScript,
  S /* preinitStyle */: preinitStyle,
  M /* preinitModuleScript */: preinitModuleScript,
};

function prefetchDNS(href: string) {
  if (typeof href === 'string' && href) {
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = 'D|' + href;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      emitHint(request, 'D', href);
    } else {
      previousDispatcher.D(/* prefetchDNS */ href);
    }
  }
}

function preconnect(href: string, crossOrigin?: ?CrossOriginEnum) {
  if (typeof href === 'string') {
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);

      const key = `C|${crossOrigin == null ? 'null' : crossOrigin}|${href}`;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);
      if (typeof crossOrigin === 'string') {
        emitHint(request, 'C', [href, crossOrigin]);
      } else {
        emitHint(request, 'C', href);
      }
    } else {
      previousDispatcher.C(/* preconnect */ href, crossOrigin);
    }
  }
}

export function preload(
  href: string,
  as: string,
  options?: ?PreloadImplOptions,
) {
  if (typeof href === 'string') {
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      let key = 'L';
      if (as === 'image' && options) {
        key += getImagePreloadKey(
          href,
          options.imageSrcSet,
          options.imageSizes,
        );
      } else {
        key += `[${as}]${href}`;
      }
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);

      const trimmed = trimOptions(options);
      if (trimmed) {
        emitHint(request, 'L', [href, as, trimmed]);
      } else {
        emitHint(request, 'L', [href, as]);
      }
    } else {
      previousDispatcher.L(/* preload */ href, as, options);
    }
  }
}

export function preloadModule(
  href: string,
  options?: ?PreloadModuleImplOptions,
): void {
  if (typeof href === 'string') {
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = 'm|' + href;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);

      const trimmed = trimOptions(options);
      if (trimmed) {
        return emitHint(request, 'm', [href, trimmed]);
      } else {
        return emitHint(request, 'm', href);
      }
    } else {
      previousDispatcher.m(/* preloadModule */ href, options);
    }
  }
}

function preinitStyle(
  href: string,
  precedence: ?string,
  options?: ?PreinitStyleOptions,
) {
  if (typeof href === 'string') {
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = 'S|' + href;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);

      const trimmed = trimOptions(options);
      if (trimmed) {
        return emitHint(request, 'S', [
          href,
          typeof precedence === 'string' ? precedence : 0,
          trimmed,
        ]);
      } else if (typeof precedence === 'string') {
        return emitHint(request, 'S', [href, precedence]);
      } else {
        return emitHint(request, 'S', href);
      }
    } else {
      previousDispatcher.S(/* preinitStyle */ href, precedence, options);
    }
  }
}

function preinitScript(src: string, options?: ?PreinitScriptOptions) {
  if (typeof src === 'string') {
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = 'X|' + src;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);

      const trimmed = trimOptions(options);
      if (trimmed) {
        return emitHint(request, 'X', [src, trimmed]);
      } else {
        return emitHint(request, 'X', src);
      }
    } else {
      previousDispatcher.X(/* preinitScript */ src, options);
    }
  }
}

function preinitModuleScript(
  src: string,
  options?: ?PreinitModuleScriptOptions,
) {
  if (typeof src === 'string') {
    const request = resolveRequest();
    if (request) {
      const hints = getHints(request);
      const key = 'M|' + src;
      if (hints.has(key)) {
        // duplicate hint
        return;
      }
      hints.add(key);

      const trimmed = trimOptions(options);
      if (trimmed) {
        return emitHint(request, 'M', [src, trimmed]);
      } else {
        return emitHint(request, 'M', src);
      }
    } else {
      previousDispatcher.M(/* preinitModuleScript */ src, options);
    }
  }
}

// Flight normally encodes undefined as a special character however for directive option
// arguments we don't want to send unnecessary keys and bloat the payload so we create a
// trimmed object which omits any keys with null or undefined values.
// This is only typesafe because these option objects have entirely optional fields where
// null and undefined represent the same thing as no property.
function trimOptions<
  T:
    | PreloadImplOptions
    | PreloadModuleImplOptions
    | PreinitStyleOptions
    | PreinitScriptOptions
    | PreinitModuleScriptOptions,
>(options: ?T): ?T {
  if (options == null) return null;
  let hasProperties = false;
  const trimmed: T = {} as any;
  for (const key in options) {
    // $FlowFixMe[invalid-computed-prop]
    if (options[key] != null) {
      hasProperties = true;
      (trimmed as any)[key] = options[key];
    }
  }
  return hasProperties ? trimmed : null;
}

function getImagePreloadKey(
  href: string,
  imageSrcSet: ?string,
  imageSizes: ?string,
) {
  let uniquePart = '';
  if (typeof imageSrcSet === 'string' && imageSrcSet !== '') {
    uniquePart += '[' + imageSrcSet + ']';
    if (typeof imageSizes === 'string') {
      uniquePart += '[' + imageSizes + ']';
    }
  } else {
    uniquePart += '[][]' + href;
  }
  return `[image]${uniquePart}`;
}
