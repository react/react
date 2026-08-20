/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {Children} from 'react';

let didWarnSelectedSetOnOption = false;
let didWarnInvalidChild = false;
let didWarnInvalidInnerHTML = false;

/**
 * Implements an <option> host component that warns when `selected` is set.
 */

export function validateOptionProps(element: Element, props: Object) {
  if (__DEV__) {
    // If a value is not provided, then the children must be simple.
    if (props.value == null) {
      if (typeof props.children === 'object' && props.children !== null) {
        Children.forEach(props.children, function (child) {
          if (child == null) {
            return;
          }
          if (
            typeof child === 'string' ||
            typeof child === 'number' ||
            typeof child === 'bigint'
          ) {
            return;
          }
          if (!didWarnInvalidChild) {
            didWarnInvalidChild = true;
            console.error(
              'Cannot infer the option value of complex children. ' +
                'Pass a `value` prop or use a plain string as children to <option>.',
            );
          }
        });
      } else if (props.dangerouslySetInnerHTML != null) {
        if (!didWarnInvalidInnerHTML) {
          didWarnInvalidInnerHTML = true;
          console.error(
            'Pass a `value` prop if you set dangerouslyInnerHTML so React knows ' +
              'which value should be selected.',
          );
        }
      }
    }

    // TODO: Remove support for `selected` in <option>.
    if (props.selected != null && !didWarnSelectedSetOnOption) {
      console.error(
        'Use the `defaultValue` or `value` props on <select> instead of ' +
          'setting `selected` on <option>.',
      );
      didWarnSelectedSetOnOption = true;
    }
  }
}
