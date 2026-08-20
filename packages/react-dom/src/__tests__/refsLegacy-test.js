/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React = require('react');
let ReactDOM = require('react-dom');

describe('root level refs with legacy APIs', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
  });

  // @gate !disableLegacyMode
  it('attaches and detaches root refs', () => {
    let inst = null;

    // host node
    let ref = jest.fn(value => (inst = value));
    const container = document.createElement('div');
    let result = ReactDOM.render(<div ref={ref} />, container);
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    expect(result).toBe(ref.mock.calls[0][0]);
    ReactDOM.unmountComponentAtNode(container);
    expect(ref).toHaveBeenCalledTimes(2);
    expect(ref.mock.calls[1][0]).toBe(null);

    // composite
    class Comp extends React.Component {
      method() {
        return true;
      }
      render() {
        return <div>Comp</div>;
      }
    }

    inst = null;
    ref = jest.fn(value => (inst = value));
    result = ReactDOM.render(<Comp ref={ref} />, container);

    expect(ref).toHaveBeenCalledTimes(1);
    expect(inst).toBeInstanceOf(Comp);
    expect(result).toBe(inst);

    // ensure we have the correct instance
    expect(result.method()).toBe(true);
    expect(inst.method()).toBe(true);

    ReactDOM.unmountComponentAtNode(container);
    expect(ref).toHaveBeenCalledTimes(2);
    expect(ref.mock.calls[1][0]).toBe(null);

    // fragment
    inst = null;
    ref = jest.fn(value => (inst = value));
    let divInst = null;
    const ref2 = jest.fn(value => (divInst = value));
    result = ReactDOM.render(
      [
        <Comp ref={ref} key="a" />,
        5,
        <div ref={ref2} key="b">
          Hello
        </div>,
      ],
      container,
    );

    // first call should be `Comp`
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref.mock.calls[0][0]).toBeInstanceOf(Comp);
    expect(result).toBe(ref.mock.calls[0][0]);

    expect(ref2).toHaveBeenCalledTimes(1);
    expect(divInst).toBeInstanceOf(HTMLDivElement);
    expect(result).not.toBe(divInst);

    ReactDOM.unmountComponentAtNode(container);
    expect(ref).toHaveBeenCalledTimes(2);
    expect(ref.mock.calls[1][0]).toBe(null);
    expect(ref2).toHaveBeenCalledTimes(2);
    expect(ref2.mock.calls[1][0]).toBe(null);

    // null
    result = ReactDOM.render(null, container);
    expect(result).toBe(null);

    // primitives
    result = ReactDOM.render(5, container);
    expect(result).toBeInstanceOf(Text);
  });
});
