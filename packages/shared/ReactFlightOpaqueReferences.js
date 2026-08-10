/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// An opaque reference is a stand-in for a value that lives in a different
// environment. It cannot be read where it is; it can only be passed back to
// the environment that owns the value. Reading any property throws, except
// for a small set of properties that React itself (or the JS runtime) probes
// when a value passes through it.
//
// There are two kinds: a Temporary Reference is a client value that is opaque
// on the server, and an object Server Reference is a server value that is
// opaque on the client. The two proxy implementations below are deliberately
// kept side by side instead of being merged: they special-case the same
// property names but differ in environment and error messages. If you change
// one, check whether the other needs the same change.

export const TEMPORARY_REFERENCE_TAG: symbol = Symbol.for(
  'react.temporary.reference',
);

const temporaryReferenceProxyHandlers: Proxy$traps<mixed> = {
  get: function (
    target: Function,
    name: string | symbol,
    receiver: Proxy<Function>,
  ) {
    switch (name) {
      // These names are read by the Flight runtime if you end up using the exports object.
      case '$$typeof':
        // These names are a little too common. We should probably have a way to
        // have the Flight runtime extract the inner target instead.
        return target.$$typeof;
      case 'name':
        return undefined;
      case 'displayName':
        return undefined;
      // We need to special case this because createElement reads it if we pass this
      // reference.
      case 'defaultProps':
        return undefined;
      // React looks for debugInfo on thenables.
      case '_debugInfo':
        return undefined;
      // Avoid this attempting to be serialized.
      case 'toJSON':
        return undefined;
      case Symbol.toPrimitive:
        // $FlowFixMe[prop-missing]
        return Object.prototype[Symbol.toPrimitive];
      case Symbol.toStringTag:
        // $FlowFixMe[prop-missing]
        return Object.prototype[Symbol.toStringTag];
      case 'Provider':
        // Context.Provider === Context in React, so return the same reference.
        // This allows server components to render <ClientContext.Provider>
        // which will be serialized and executed on the client.
        // TODO: This should only be forwarded if the referenced value is
        // actually a React context. But no type information about the value
        // crosses the wire, so refining here requires the client to encode a
        // hint at serialization time. Until then, reading .Provider on a
        // non-context reference silently returns the reference itself
        // instead of throwing like every other property.
        return receiver;
      case 'then':
        // Allow returning a temporary reference from an async function
        // Unlike regular Client References, a Promise would never have been serialized as
        // an opaque Temporary Reference, but instead would have been serialized as a
        // Promise on the server and so doesn't hit this path. So we can assume this wasn't
        // a Promise on the client.
        return undefined;
    }
    throw new Error(
      // eslint-disable-next-line react-internal/safe-string-coercion
      `Cannot access ${String(name)} on the server. ` +
        'You cannot dot into a temporary client reference from a server component. ' +
        'You can only pass the value through to the client.',
    );
  },
  set: function () {
    throw new Error(
      'Cannot assign to a temporary client reference from a server module.',
    );
  },
};

export function createOpaqueTemporaryReference(): mixed {
  const reference = Object.defineProperties(
    function () {
      throw new Error(
        `Attempted to call a temporary Client Reference from the server but it is on the client. ` +
          `It's not possible to invoke a client function from the server, it can ` +
          `only be rendered as a Component or passed to props of a Client Component.`,
      );
    } as any,
    {
      $$typeof: {value: TEMPORARY_REFERENCE_TAG},
    },
  );
  return new Proxy(reference, temporaryReferenceProxyHandlers);
}

const serverObjectReferenceProxyHandlers: Proxy$traps<mixed> = {
  get: function (target: Function, name: string | symbol) {
    switch (name) {
      // These names are read by the Flight runtime if you end up passing this
      // reference along.
      case '$$typeof':
        return target.$$typeof;
      case 'name':
        return undefined;
      case 'displayName':
        return undefined;
      // We need to special case this because createElement reads it if we pass this
      // reference.
      case 'defaultProps':
        return undefined;
      // React looks for debugInfo on thenables.
      case '_debugInfo':
        return undefined;
      // Avoid this attempting to be serialized.
      case 'toJSON':
        return undefined;
      case Symbol.toPrimitive:
        // $FlowFixMe[prop-missing]
        return Object.prototype[Symbol.toPrimitive];
      case Symbol.toStringTag:
        // $FlowFixMe[prop-missing]
        return Object.prototype[Symbol.toStringTag];
      case 'then':
        // Even if the referenced object is a Promise, it must not appear
        // thenable on the client or it would be awaited instead of passed
        // along by reference.
        return undefined;
    }
    throw new Error(
      // eslint-disable-next-line react-internal/safe-string-coercion
      `Cannot access ${String(name)} on the client. ` +
        'You cannot read a Server Reference to an object on the client. ' +
        'You can only pass it back to the server.',
    );
  },
  set: function () {
    throw new Error(
      'Cannot assign to a Server Reference to an object on the client.',
    );
  },
};

export function createOpaqueServerObjectReference(): mixed {
  const reference = function () {
    throw new Error(
      'Attempted to call a Server Reference to an object from the client, ' +
        'but it is not a function. You can only pass it back to the server.',
    );
  };
  return new Proxy(reference, serverObjectReferenceProxyHandlers);
}
