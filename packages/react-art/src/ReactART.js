/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as React from 'react';
import ReactVersion from 'shared/ReactVersion';
import {LegacyRoot, ConcurrentRoot} from 'react-reconciler/src/ReactRootTags';
import {
  createContainer,
  updateContainerSync,
  injectIntoDevTools,
  flushSyncWork,
  defaultOnUncaughtError,
  defaultOnCaughtError,
  defaultOnRecoverableError,
} from 'react-reconciler/src/ReactFiberReconciler';

import Transform from 'art/core/transform';
import Mode from 'art/modes/current';
import FastNoSideEffects from 'art/modes/fast-noSideEffects';
import {disableLegacyMode} from 'shared/ReactFeatureFlags';

import {TYPES, childrenAsString} from './ReactARTInternals';

function defaultOnDefaultTransitionIndicator() {
  // Noop
}

Mode.setCurrent(
  // Change to 'art/modes/dom' for easier debugging via SVG
  FastNoSideEffects,
);

/** Declarative fill-type objects; API design not finalized */

const slice = Array.prototype.slice;

class LinearGradient {
  constructor(stops, x1, y1, x2, y2) {
    this._args = slice.call(arguments);
  }

  applyFill(node) {
    node.fillLinear.apply(node, this._args);
  }
}

class RadialGradient {
  constructor(stops, fx, fy, rx, ry, cx, cy) {
    this._args = slice.call(arguments);
  }

  applyFill(node) {
    node.fillRadial.apply(node, this._args);
  }
}

class Pattern {
  constructor(url, width, height, left, top) {
    this._args = slice.call(arguments);
  }

  applyFill(node) {
    node.fillImage.apply(node, this._args);
  }
}

/** React Components */

class Surface extends React.Component {
  componentDidMount() {
    const {height, width} = this.props;

    this._surface = Mode.Surface(+width, +height, this._tagRef);

    this._mountNode = createContainer(
      this._surface,
      disableLegacyMode ? ConcurrentRoot : LegacyRoot,
      null,
      false,
      false,
      '',
      defaultOnUncaughtError,
      defaultOnCaughtError,
      defaultOnRecoverableError,
      defaultOnDefaultTransitionIndicator,
      null,
    );
    // We synchronously flush updates coming from above so that they commit together
    // and so that refs resolve before the parent life cycles.
    updateContainerSync(this.props.children, this._mountNode, this);
    flushSyncWork();
  }

  componentDidUpdate(prevProps, prevState) {
    const props = this.props;

    if (props.height !== prevProps.height || props.width !== prevProps.width) {
      this._surface.resize(+props.width, +props.height);
    }

    // We synchronously flush updates coming from above so that they commit together
    // and so that refs resolve before the parent life cycles.
    updateContainerSync(this.props.children, this._mountNode, this);
    flushSyncWork();

    if (this._surface.render) {
      this._surface.render();
    }
  }

  componentWillUnmount() {
    // We synchronously flush updates coming from above so that they commit together
    // and so that refs resolve before the parent life cycles.
    updateContainerSync(null, this._mountNode, this);
    flushSyncWork();
  }

  render() {
    // This is going to be a placeholder because we don't know what it will
    // actually resolve to because ART may render canvas, vml or svg tags here.
    // We only allow a subset of properties since others might conflict with
    // ART's properties.
    const props = this.props;

    // TODO: ART's Canvas Mode overrides surface title and cursor
    const Tag = Mode.Surface.tagName;

    return (
      <Tag
        ref={ref => (this._tagRef = ref)}
        accessKey={props.accessKey}
        className={props.className}
        draggable={props.draggable}
        role={props.role}
        style={props.style}
        tabIndex={props.tabIndex}
        title={props.title}
      />
    );
  }
}

class Text extends React.Component {
  constructor(props) {
    super(props);
    // We allow reading these props. Ideally we could expose the Text node as
    // ref directly.
    ['height', 'width', 'x', 'y'].forEach(key => {
      Object.defineProperty(this, key, {
        get: function () {
          return this._text ? this._text[key] : undefined;
        },
      });
    });
  }
  render() {
    // This means you can't have children that render into strings...
    const T = TYPES.TEXT;
    return (
      <T {...this.props} ref={t => (this._text = t)}>
        {childrenAsString(this.props.children)}
      </T>
    );
  }
}

injectIntoDevTools();

/** API */

export const ClippingRectangle = TYPES.CLIPPING_RECTANGLE;
export const Group = TYPES.GROUP;
export const Shape = TYPES.SHAPE;
export const Path = Mode.Path;
export {LinearGradient, Pattern, RadialGradient, Surface, Text, Transform};

export {ReactVersion as version};
