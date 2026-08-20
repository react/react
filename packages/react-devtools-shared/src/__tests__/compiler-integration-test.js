/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getVersionedRenderImplementation} from './utils';

describe('CompilerIntegration', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  let React;
  let act;
  let useMemoCache;

  beforeEach(() => {
    React = require('react');
    require('react-dom');
    require('react-dom/client');
    useMemoCache = require('react/compiler-runtime').c;

    const utils = require('./utils');
    act = utils.act;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const {render} = getVersionedRenderImplementation();

  // @reactVersion >= 18.2
  it('By default, component display names should not have Forget prefix', () => {
    const hook = global.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const reactDOMFiberRendererInterface = hook.rendererInterfaces.get(1);
    expect(reactDOMFiberRendererInterface).not.toBeFalsy();

    const Foo = () => {
      // eslint-disable-next-line no-unused-vars
      const [val, setVal] = React.useState(null);

      return (
        <div>
          <Bar />
        </div>
      );
    };
    const Bar = () => <div>Hi!</div>;

    act(() => render(<Foo />));

    expect(
      reactDOMFiberRendererInterface
        .getDisplayNameForElementID(2)
        .indexOf('Forget'),
    ).toBe(-1);
    expect(
      reactDOMFiberRendererInterface
        .getDisplayNameForElementID(3)
        .indexOf('Forget'),
    ).toBe(-1);
  });

  // For React 18.2, this will install uMC polyfill from react-compiler-runtime available on npm.
  // @reactVersion >= 18.2
  it('If useMemoCache used, the corresponding displayName for a component should have Forget prefix', () => {
    const hook = global.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const reactDOMFiberRendererInterface = hook.rendererInterfaces.get(1);
    expect(reactDOMFiberRendererInterface).not.toBeFalsy();

    const Foo = () => {
      // eslint-disable-next-line no-unused-vars
      const $ = useMemoCache(1);
      // eslint-disable-next-line no-unused-vars
      const [val, setVal] = React.useState(null);

      return (
        <div>
          <Bar />
        </div>
      );
    };
    const Bar = () => <div>Hi!</div>;

    act(() => render(<Foo />));

    // useMemoCache is only used by Foo component
    expect(
      reactDOMFiberRendererInterface
        .getDisplayNameForElementID(2)
        .indexOf('Forget'),
    ).toBe(0);
    expect(
      reactDOMFiberRendererInterface
        .getDisplayNameForElementID(3)
        .indexOf('Forget'),
    ).toBe(-1);
  });
});
