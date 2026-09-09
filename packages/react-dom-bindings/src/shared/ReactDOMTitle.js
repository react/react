/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import hasOwnProperty from 'shared/hasOwnProperty';

export function validateProperties(type: string, props: Object) {
  if (type !== 'title') {
    return;
  }

  if (__DEV__) {
    if (hasOwnProperty.call(props, 'children')) {
      const children = props.children;

      const child = Array.isArray(children)
        ? children.length < 2
          ? children[0]
          : null
        : children;

      if (Array.isArray(children) && children.length > 1) {
        console.error(
          'React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an Array with length %s instead.' +
            ' Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert `children` of <title> tags to a single string value' +
            ' which is why Arrays of length greater than 1 are not supported. When using JSX it can be common to combine text nodes and value nodes.' +
            ' For example: <title>hello {nameOfUser}</title>. While not immediately apparent, `children` in this case is an Array with length 2. If your `children` prop' +
            ' is using this form try rewriting it using a template string: <title>{`hello ${nameOfUser}`}</title>.',
          children.length,
        );
      } else if (typeof child === 'function' || typeof child === 'symbol') {
        const childType =
          typeof child === 'function' ? 'a Function' : 'a Symbol';
        console.error(
          'React expect children of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found %s instead.' +
            ' Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title>' +
            ' tags to a single string value.',
          childType,
        );
        // $FlowFixMe[invalid-compare]
        // $FlowFixMe[constant-condition]
      } else if (child && child.toString === {}.toString) {
        if (child.$$typeof != null) {
          console.error(
            'React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that appears to be' +
              ' a React element which never implements a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to' +
              ' be able to convert children of <title> tags to a single string value which is why rendering React elements is not supported. If the `children` of <title> is' +
              ' a React Component try moving the <title> tag into that component. If the `children` of <title> is some HTML markup change it to be Text only to be valid HTML.',
          );
        } else {
          console.error(
            'React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that does not implement' +
              ' a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags' +
              ' to a single string value. Using the default `toString` method available on every object is almost certainly an error. Consider whether the `children` of this <title>' +
              ' is an object in error and change it to a string or number value if so. Otherwise implement a `toString` method that React can use to produce a valid <title>.',
          );
        }
      }
    }
  }
}
