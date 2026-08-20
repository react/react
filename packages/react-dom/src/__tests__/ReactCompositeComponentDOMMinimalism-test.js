/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// Requires
let React;
let ReactDOMClient;
let act;

// Test components
let LowerLevelComposite;
let MyCompositeComponent;

/**
 * Integration test, testing the combination of JSX with our unit of
 * abstraction, `ReactCompositeComponent` does not ever add superfluous DOM
 * nodes.
 */
describe('ReactCompositeComponentDOMMinimalism', () => {
  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    LowerLevelComposite = class extends React.Component {
      render() {
        return <div>{this.props.children}</div>;
      }
    };

    MyCompositeComponent = class extends React.Component {
      render() {
        return <LowerLevelComposite>{this.props.children}</LowerLevelComposite>;
      }
    };
  });

  it('should not render extra nodes for non-interpolated text', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<MyCompositeComponent>A string child</MyCompositeComponent>);
    });

    const instance = container.firstChild;
    expect(instance.tagName).toBe('DIV');
    expect(instance.children.length).toBe(0);
  });

  it('should not render extra nodes for interpolated text', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <MyCompositeComponent>
          {'Interpolated String Child'}
        </MyCompositeComponent>,
      );
    });

    const instance = container.firstChild;
    expect(instance.tagName).toBe('DIV');
    expect(instance.children.length).toBe(0);
  });

  it('should not render extra nodes for interpolated text children', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <MyCompositeComponent>
          <ul>This text causes no children in ul, just innerHTML</ul>
        </MyCompositeComponent>,
      );
    });

    const instance = container.firstChild;
    expect(instance.tagName).toBe('DIV');
    expect(instance.children.length).toBe(1);
    expect(instance.children[0].tagName).toBe('UL');
    expect(instance.children[0].children.length).toBe(0);
  });
});
