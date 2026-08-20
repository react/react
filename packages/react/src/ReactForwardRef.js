/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 */

import {REACT_FORWARD_REF_TYPE, REACT_MEMO_TYPE} from 'shared/ReactSymbols';

export function forwardRef<Props, ElementType: React$ElementType>(
  render: (
    props: Props,
    ref: React$RefSetter<React$ElementRef<ElementType>>,
  ) => React$Node,
) {
  if (__DEV__) {
    if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
      console.error(
        'forwardRef requires a render function but received a `memo` ' +
          'component. Instead of forwardRef(memo(...)), use ' +
          'memo(forwardRef(...)).',
      );
    } else if (typeof render !== 'function') {
      console.error(
        'forwardRef requires a render function but was given %s.',
        render === null ? 'null' : typeof render,
      );
    } else {
      if (render.length !== 0 && render.length !== 2) {
        console.error(
          'forwardRef render functions accept exactly two parameters: props and ref. %s',
          render.length === 1
            ? 'Did you forget to use the ref parameter?'
            : 'Any additional parameter will be undefined.',
        );
      }
    }

    if (render != null) {
      if (render.defaultProps != null) {
        console.error(
          'forwardRef render functions do not support defaultProps. ' +
            'Did you accidentally pass a React component?',
        );
      }
    }
  }

  const elementType = {
    $$typeof: REACT_FORWARD_REF_TYPE,
    render,
  };
  if (__DEV__) {
    let ownName;
    Object.defineProperty(elementType, 'displayName', {
      enumerable: false,
      configurable: true,
      get: function () {
        return ownName;
      },
      set: function (name) {
        ownName = name;

        // The inner component shouldn't inherit this display name in most cases,
        // because the component may be used elsewhere.
        // But it's nice for anonymous functions to inherit the name,
        // so that our component-stack generation logic will display their frames.
        // An anonymous function generally suggests a pattern like:
        //   React.forwardRef((props, ref) => {...});
        // This kind of inner function is not used elsewhere so the side effect is okay.
        if (!render.name && !render.displayName) {
          Object.defineProperty(render, 'name', {
            value: name,
          });
          render.displayName = name;
        }
      },
    });
  }
  return elementType;
}
