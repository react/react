/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {
  PreconnectOptions,
  PreloadOptions,
  PreloadModuleOptions,
  PreinitOptions,
  PreinitModuleOptions,
  PreinitScriptOptions,
  PreinitDataAttributes,
} from './ReactDOMTypes';

import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';
import hasOwnProperty from 'shared/hasOwnProperty';
import isAttributeNameSafe from 'react-dom-bindings/src/shared/isAttributeNameSafe';

import {
  getCrossOriginString,
  getCrossOriginStringAs,
} from 'react-dom-bindings/src/shared/crossOriginStrings';

export function prefetchDNS(href: string) {
  if (__DEV__) {
    if (typeof href !== 'string' || !href) {
      console.error(
        'ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.',
        getValueDescriptorExpectingObjectForWarning(href),
      );
    } else if (arguments.length > 1) {
      const options = arguments[1];
      if (
        typeof options === 'object' &&
        options.hasOwnProperty('crossOrigin')
      ) {
        console.error(
          'ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.',
          getValueDescriptorExpectingEnumForWarning(options),
        );
      } else {
        console.error(
          'ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.',
          getValueDescriptorExpectingEnumForWarning(options),
        );
      }
    }
  }
  if (typeof href === 'string') {
    ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
      .D(/* prefetchDNS */ href);
  }
  // We don't error because preconnect needs to be resilient to being called in a variety of scopes
  // and the runtime may not be capable of responding. The function is optimistic and not critical
  // so we favor silent bailout over warning or erroring.
}

export function preconnect(href: string, options?: ?PreconnectOptions) {
  if (__DEV__) {
    if (typeof href !== 'string' || !href) {
      console.error(
        'ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.',
        getValueDescriptorExpectingObjectForWarning(href),
      );
    } else if (options != null && typeof options !== 'object') {
      console.error(
        'ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.',
        getValueDescriptorExpectingEnumForWarning(options),
      );
    } else if (options != null && typeof options.crossOrigin !== 'string') {
      console.error(
        'ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.',
        getValueDescriptorExpectingObjectForWarning(options.crossOrigin),
      );
    }
  }
  if (typeof href === 'string') {
    const crossOrigin = options
      ? getCrossOriginString(options.crossOrigin)
      : null;
    ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
      .C(/* preconnect */ href, crossOrigin);
  }
  // We don't error because preconnect needs to be resilient to being called in a variety of scopes
  // and the runtime may not be capable of responding. The function is optimistic and not critical
  // so we favor silent bailout over warning or erroring.
}

export function preload(href: string, options: PreloadOptions) {
  if (__DEV__) {
    let encountered = '';
    if (typeof href !== 'string' || !href) {
      encountered += ` The \`href\` argument encountered was ${getValueDescriptorExpectingObjectForWarning(
        href,
      )}.`;
    }
    if (options == null || typeof options !== 'object') {
      encountered += ` The \`options\` argument encountered was ${getValueDescriptorExpectingObjectForWarning(
        options,
      )}.`;
    } else if (typeof options.as !== 'string' || !options.as) {
      encountered += ` The \`as\` option encountered was ${getValueDescriptorExpectingObjectForWarning(
        options.as,
      )}.`;
    }
    if (encountered) {
      console.error(
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
        encountered,
      );
    }
  }
  if (
    typeof href === 'string' &&
    // We check existence because we cannot enforce this function is actually called with the stated type
    typeof options === 'object' &&
    // $FlowFixMe[invalid-compare]
    options !== null &&
    typeof options.as === 'string'
  ) {
    const as = options.as;
    const crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
    ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
      .L(/* preload */ href, as, {
        crossOrigin,
        integrity:
          typeof options.integrity === 'string' ? options.integrity : undefined,
        nonce: typeof options.nonce === 'string' ? options.nonce : undefined,
        type: typeof options.type === 'string' ? options.type : undefined,
        fetchPriority:
          typeof options.fetchPriority === 'string'
            ? options.fetchPriority
            : undefined,
        referrerPolicy:
          typeof options.referrerPolicy === 'string'
            ? options.referrerPolicy
            : undefined,
        imageSrcSet:
          typeof options.imageSrcSet === 'string'
            ? options.imageSrcSet
            : undefined,
        imageSizes:
          typeof options.imageSizes === 'string'
            ? options.imageSizes
            : undefined,
        media: typeof options.media === 'string' ? options.media : undefined,
      });
  }
  // We don't error because preload needs to be resilient to being called in a variety of scopes
  // and the runtime may not be capable of responding. The function is optimistic and not critical
  // so we favor silent bailout over warning or erroring.
}

export function preloadModule(href: string, options?: ?PreloadModuleOptions) {
  if (__DEV__) {
    let encountered = '';
    if (typeof href !== 'string' || !href) {
      encountered += ` The \`href\` argument encountered was ${getValueDescriptorExpectingObjectForWarning(
        href,
      )}.`;
    }
    if (options !== undefined && typeof options !== 'object') {
      encountered += ` The \`options\` argument encountered was ${getValueDescriptorExpectingObjectForWarning(
        options,
      )}.`;
    } else if (options && 'as' in options && typeof options.as !== 'string') {
      encountered += ` The \`as\` option encountered was ${getValueDescriptorExpectingObjectForWarning(
        options.as,
      )}.`;
    }
    if (encountered) {
      console.error(
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
        encountered,
      );
    }
  }
  if (typeof href === 'string') {
    if (options) {
      const crossOrigin = getCrossOriginStringAs(
        options.as,
        options.crossOrigin,
      );
      ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
        .m(/* preloadModule */ href, {
          as:
            typeof options.as === 'string' && options.as !== 'script'
              ? options.as
              : undefined,
          crossOrigin,
          integrity:
            typeof options.integrity === 'string'
              ? options.integrity
              : undefined,
          nonce: typeof options.nonce === 'string' ? options.nonce : undefined,
          fetchPriority:
            typeof options.fetchPriority === 'string'
              ? options.fetchPriority
              : undefined,
        });
    } else {
      ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
        .m(/* preloadModule */ href);
    }
  }
  // We don't error because preload needs to be resilient to being called in a variety of scopes
  // and the runtime may not be capable of responding. The function is optimistic and not critical
  // so we favor silent bailout over warning or erroring.
}

export function preinit(href: string, options: PreinitOptions) {
  if (__DEV__) {
    if (typeof href !== 'string' || !href) {
      console.error(
        'ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.',
        getValueDescriptorExpectingObjectForWarning(href),
      );
    } else if (options == null || typeof options !== 'object') {
      console.error(
        'ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.',
        getValueDescriptorExpectingEnumForWarning(options),
      );
    } else if (options.as !== 'style' && options.as !== 'script') {
      console.error(
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
        getValueDescriptorExpectingEnumForWarning(options.as),
      );
    } else if (
      options.as !== 'script' &&
      // The types disallow this but untyped callers can still pass it.
      'dataAttributes' in options &&
      options.dataAttributes != null
    ) {
      console.error(
        'ReactDOM.preinit(): The `dataAttributes` option is only supported when `as` is "script" but it was passed with `as` %s for `href` "%s". The `dataAttributes` option will be ignored.',
        getValueDescriptorExpectingEnumForWarning(options.as),
        href,
      );
    }
  }
  if (typeof href === 'string' && options && typeof options.as === 'string') {
    const as = options.as;
    const crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
    const integrity =
      typeof options.integrity === 'string' ? options.integrity : undefined;
    const fetchPriority =
      typeof options.fetchPriority === 'string'
        ? options.fetchPriority
        : undefined;
    if (as === 'style') {
      ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
        .S(
          /* preinitStyle */
          href,
          typeof options.precedence === 'string'
            ? options.precedence
            : undefined,
          {
            crossOrigin,
            integrity,
            fetchPriority,
          },
        );
    } else if (as === 'script') {
      const scriptOptions: Required<PreinitScriptOptions> = {
        crossOrigin,
        integrity,
        fetchPriority,
        nonce: typeof options.nonce === 'string' ? options.nonce : undefined,
      };
      if (options.dataAttributes != null) {
        assignDataAttributes(scriptOptions, href, options.dataAttributes);
      }
      ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
        .X(/* preinitScript */ href, scriptOptions);
    }
  }
  // We don't error because preinit needs to be resilient to being called in a variety of scopes
  // and the runtime may not be capable of responding. The function is optimistic and not critical
  // so we favor silent bailout over warning or erroring.
}

export function preinitModule(href: string, options?: ?PreinitModuleOptions) {
  if (__DEV__) {
    let encountered = '';
    if (typeof href !== 'string' || !href) {
      encountered += ` The \`href\` argument encountered was ${getValueDescriptorExpectingObjectForWarning(
        href,
      )}.`;
    }
    if (options !== undefined && typeof options !== 'object') {
      encountered += ` The \`options\` argument encountered was ${getValueDescriptorExpectingObjectForWarning(
        options,
      )}.`;
    } else if (options && 'as' in options && options.as !== 'script') {
      encountered += ` The \`as\` option encountered was ${getValueDescriptorExpectingEnumForWarning(
        options.as,
      )}.`;
    }
    if (encountered) {
      console.error(
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s',
        encountered,
      );
    } else {
      const as =
        options && typeof options.as === 'string' ? options.as : 'script';
      switch (as) {
        case 'script': {
          break;
        }

        // We have an invalid as type and need to warn
        default: {
          const typeOfAs = getValueDescriptorExpectingEnumForWarning(as);
          console.error(
            'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script"' +
              ' but received "%s" instead. This warning was generated for `href` "%s". In the future other' +
              ' module types will be supported, aligning with the import-attributes proposal. Learn more here:' +
              ' (https://github.com/tc39/proposal-import-attributes)',
            typeOfAs,
            href,
          );
        }
      }
    }
  }
  if (typeof href === 'string') {
    if (typeof options === 'object' && options !== null) {
      if (options.as == null || options.as === 'script') {
        const crossOrigin = getCrossOriginStringAs(
          options.as,
          options.crossOrigin,
        );
        ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
          .M(/* preinitModuleScript */ href, {
            crossOrigin,
            integrity:
              typeof options.integrity === 'string'
                ? options.integrity
                : undefined,
            nonce:
              typeof options.nonce === 'string' ? options.nonce : undefined,
            fetchPriority:
              typeof options.fetchPriority === 'string'
                ? options.fetchPriority
                : undefined,
          });
      }
    } else if (options == null) {
      ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
        .M(/* preinitModuleScript */ href);
    }
  }
  // We don't error because preinit needs to be resilient to being called in a variety of scopes
  // and the runtime may not be capable of responding. The function is optimistic and not critical
  // so we favor silent bailout over warning or erroring.
}

// Validates the `dataAttributes` option and copies each valid entry onto the
// options passed to the dispatcher. The `data-` prefix check runs in every
// build, not just DEV: it is what keeps these keys from ever colliding with a
// real option name such as `nonce`. Invalid entries are dropped, with a warning
// in DEV. Like the other preinit options the types are not trusted at runtime
// since untyped callers can pass anything.
function assignDataAttributes(
  target: PreinitScriptOptions,
  href: string,
  dataAttributes: PreinitDataAttributes,
): void {
  if (typeof dataAttributes !== 'object') {
    if (__DEV__) {
      console.error(
        'ReactDOM.preinit(): Expected the `dataAttributes` option to be an object mapping `data-*` attribute names to string values but encountered %s instead. This was passed for `href` "%s".',
        getValueDescriptorExpectingObjectForWarning(dataAttributes),
        href,
      );
    }
    return;
  }
  for (const name in dataAttributes) {
    if (!hasOwnProperty.call(dataAttributes, name)) {
      continue;
    }
    const value = dataAttributes[name];
    // A bare "data-" is not a valid data attribute name.
    if (name.length <= 5 || !name.startsWith('data-')) {
      if (__DEV__) {
        console.error(
          'ReactDOM.preinit(): Expected the keys of the `dataAttributes` option to be `data-*` attribute names but encountered "%s" instead for `href` "%s". This attribute will be omitted.',
          name,
          href,
        );
      }
      continue;
    }
    if (!isAttributeNameSafe(name)) {
      // isAttributeNameSafe warns in DEV.
      continue;
    }
    if (typeof value !== 'string') {
      if (__DEV__) {
        console.error(
          'ReactDOM.preinit(): Expected the `dataAttributes` option to map "%s" to a string but encountered %s instead for `href` "%s". This attribute will be omitted.',
          name,
          getValueDescriptorExpectingEnumForWarning(value),
          href,
        );
      }
      continue;
    }
    target[name] = value;
  }
}

function getValueDescriptorExpectingObjectForWarning(thing: any): string {
  return thing === null
    ? '`null`'
    : thing === undefined
      ? '`undefined`'
      : thing === ''
        ? 'an empty string'
        : `something with type "${typeof thing}"`;
}

function getValueDescriptorExpectingEnumForWarning(thing: any): string {
  return thing === null
    ? '`null`'
    : thing === undefined
      ? '`undefined`'
      : thing === ''
        ? 'an empty string'
        : typeof thing === 'string'
          ? JSON.stringify(thing)
          : typeof thing === 'number'
            ? '`' + thing + '`'
            : `something with type "${typeof thing}"`;
}
