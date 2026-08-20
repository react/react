/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @typechecks
 *
 * Example usage:
 * <Circle
 *   radius={10}
 *   stroke="green"
 *   strokeWidth={3}
 *   fill="blue"
 * />
 *
 */

'use strict';

var assign = Object.assign;
var React = require('react');
var ReactART = require('react-art');

var createReactClass = require('create-react-class');

var Path = ReactART.Path;
var Shape = ReactART.Shape;

/**
 * Circle is a React component for drawing circles. Like other ReactART
 * components, it must be used in a <Surface>.
 */
var Circle = createReactClass({
  displayName: 'Circle',

  render: function render() {
    var radius = this.props.radius;

    var path = Path()
      .moveTo(0, -radius)
      .arc(0, radius * 2, radius)
      .arc(0, radius * -2, radius)
      .close();
    return React.createElement(Shape, assign({}, this.props, {d: path}));
  },
});

module.exports = Circle;
