/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

let React;
let ReactNoopPersistent;
let act;

describe('ReactPersistentUpdatesMinimalism', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactNoopPersistent = require('react-noop-renderer/persistent');
    act = require('internal-test-utils').act;
  });

  it('should render a simple component', async () => {
    function Child() {
      return <div>Hello World</div>;
    }

    function Parent() {
      return <Child />;
    }

    ReactNoopPersistent.startTrackingHostCounters();
    await act(() => ReactNoopPersistent.render(<Parent />));
    expect(ReactNoopPersistent.stopTrackingHostCounters()).toEqual({
      hostCloneCounter: 0,
    });

    ReactNoopPersistent.startTrackingHostCounters();
    await act(() => ReactNoopPersistent.render(<Parent />));
    expect(ReactNoopPersistent.stopTrackingHostCounters()).toEqual({
      hostCloneCounter: 1,
    });
  });

  it('should not diff referentially equal host elements', async () => {
    function Leaf(props) {
      return (
        <span>
          hello
          <b />
          {props.name}
        </span>
      );
    }

    const constEl = (
      <div>
        <Leaf name="world" />
      </div>
    );

    function Child() {
      return constEl;
    }

    function Parent() {
      return <Child />;
    }

    ReactNoopPersistent.startTrackingHostCounters();
    await act(() => ReactNoopPersistent.render(<Parent />));
    expect(ReactNoopPersistent.stopTrackingHostCounters()).toEqual({
      hostCloneCounter: 0,
    });

    ReactNoopPersistent.startTrackingHostCounters();
    await act(() => ReactNoopPersistent.render(<Parent />));
    expect(ReactNoopPersistent.stopTrackingHostCounters()).toEqual({
      hostCloneCounter: 0,
    });
  });

  it('should not diff parents of setState targets', async () => {
    let childInst;

    function Leaf(props) {
      return (
        <span>
          hello
          <b />
          {props.name}
        </span>
      );
    }

    class Child extends React.Component {
      state = {name: 'Batman'};
      render() {
        childInst = this;
        return (
          <div>
            <Leaf name={this.state.name} />
          </div>
        );
      }
    }

    function Parent() {
      return (
        <section>
          <div>
            <Leaf name="world" />
            <Child />
            <hr />
            <Leaf name="world" />
          </div>
        </section>
      );
    }

    ReactNoopPersistent.startTrackingHostCounters();
    await act(() => ReactNoopPersistent.render(<Parent />));
    expect(ReactNoopPersistent.stopTrackingHostCounters()).toEqual({
      hostCloneCounter: 0,
    });

    ReactNoopPersistent.startTrackingHostCounters();
    await act(() => childInst.setState({name: 'Robin'}));
    expect(ReactNoopPersistent.stopTrackingHostCounters()).toEqual({
      // section
      // section > div
      // section > div > Child > div
      // section > div > Child > Leaf > span
      // section > div > Child > Leaf > span > b
      hostCloneCounter: 5,
    });

    ReactNoopPersistent.startTrackingHostCounters();
    await act(() => ReactNoopPersistent.render(<Parent />));
    expect(ReactNoopPersistent.stopTrackingHostCounters()).toEqual({
      // Parent > section
      // Parent > section > div
      // Parent > section > div > Leaf > span
      // Parent > section > div > Leaf > span > b
      // Parent > section > div > Child > div
      // Parent > section > div > Child > div > Leaf > span
      // Parent > section > div > Child > div > Leaf > span > b
      // Parent > section > div > hr
      // Parent > section > div > Leaf > span
      // Parent > section > div > Leaf > span > b
      hostCloneCounter: 10,
    });
  });
});
