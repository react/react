/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

/*jslint evil: true */

'use strict';

const React = require('react');
const Scheduler = require('scheduler');

import * as ReactART from 'react-art';
import ARTSVGMode from 'art/modes/svg';
import ARTCurrentMode from 'art/modes/current';
// Since these are default exports, we need to import them using ESM.
// Since they must be on top, we need to import this before ReactDOM.
import Circle from 'react-art/Circle';
import Rectangle from 'react-art/Rectangle';
import Wedge from 'react-art/Wedge';

const {act} = require('internal-test-utils');

// Isolate DOM renderer.
jest.resetModules();
// share isomorphic
jest.mock('scheduler', () => Scheduler);
jest.mock('react', () => React);
const ReactDOMClient = require('react-dom/client');

let Group;
let Shape;
let Surface;
let TestComponent;

let groupRef;

const Missing = {};

function testDOMNodeStructure(domNode, expectedStructure) {
  expect(domNode).toBeDefined();
  expect(domNode.nodeName).toBe(expectedStructure.nodeName);
  for (const prop in expectedStructure) {
    if (!expectedStructure.hasOwnProperty(prop)) {
      continue;
    }
    if (prop !== 'nodeName' && prop !== 'children') {
      if (expectedStructure[prop] === Missing) {
        expect(domNode.hasAttribute(prop)).toBe(false);
      } else {
        expect(domNode.getAttribute(prop)).toBe(expectedStructure[prop]);
      }
    }
  }
  if (expectedStructure.children) {
    expectedStructure.children.forEach(function (subTree, index) {
      testDOMNodeStructure(domNode.childNodes[index], subTree);
    });
  }
}

describe('ReactART', () => {
  let container;

  beforeEach(() => {
    jest.resetModules();
    // share isomorphic
    jest.mock('scheduler', () => Scheduler);
    jest.mock('react', () => React);

    container = document.createElement('div');
    document.body.appendChild(container);

    ARTCurrentMode.setCurrent(ARTSVGMode);

    Group = ReactART.Group;
    Shape = ReactART.Shape;
    Surface = ReactART.Surface;

    groupRef = React.createRef();
    TestComponent = class extends React.Component {
      group = groupRef;

      render() {
        const a = (
          <Shape
            d="M0,0l50,0l0,50l-50,0z"
            fill={new ReactART.LinearGradient(['black', 'white'])}
            key="a"
            width={50}
            height={50}
            x={50}
            y={50}
            opacity={0.1}
          />
        );

        const b = (
          <Shape
            fill="#3C5A99"
            key="b"
            scale={0.5}
            x={50}
            y={50}
            title="This is an F"
            cursor="pointer">
            M64.564,38.583H54l0.008-5.834c0-3.035,0.293-4.666,4.657-4.666
            h5.833V16.429h-9.33c-11.213,0-15.159,5.654-15.159,15.16v6.994
            h-6.99v11.652h6.99v33.815H54V50.235h9.331L64.564,38.583z
          </Shape>
        );

        const c = <Group key="c" />;

        return (
          <Surface width={150} height={200}>
            <Group ref={this.group}>
              {this.props.flipped ? [b, a, c] : [a, b, c]}
            </Group>
          </Surface>
        );
      }
    };
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('should have the correct lifecycle state', async () => {
    const instance = <TestComponent />;
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(instance);
    });
    const group = groupRef.current;
    // Duck type test for an ART group
    expect(typeof group.indicate).toBe('function');
  });

  it('should render a reasonable SVG structure in SVG mode', async () => {
    const instance = <TestComponent />;
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(instance);
    });

    const expectedStructure = {
      nodeName: 'svg',
      width: '150',
      height: '200',
      children: [
        {nodeName: 'defs'},
        {
          nodeName: 'g',
          children: [
            {
              nodeName: 'defs',
              children: [{nodeName: 'linearGradient'}],
            },
            {nodeName: 'path'},
            {nodeName: 'path'},
            {nodeName: 'g'},
          ],
        },
      ],
    };

    const realNode = container.firstChild;
    testDOMNodeStructure(realNode, expectedStructure);
  });

  it('should be able to reorder components', async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<TestComponent flipped={false} />);
    });

    const expectedStructure = {
      nodeName: 'svg',
      children: [
        {nodeName: 'defs'},
        {
          nodeName: 'g',
          children: [
            {nodeName: 'defs'},
            {nodeName: 'path', opacity: '0.1'},
            {nodeName: 'path', opacity: Missing},
            {nodeName: 'g'},
          ],
        },
      ],
    };

    const realNode = container.firstChild;
    testDOMNodeStructure(realNode, expectedStructure);

    await act(() => {
      root.render(<TestComponent flipped={true} />);
    });

    const expectedNewStructure = {
      nodeName: 'svg',
      children: [
        {nodeName: 'defs'},
        {
          nodeName: 'g',
          children: [
            {nodeName: 'defs'},
            {nodeName: 'path', opacity: Missing},
            {nodeName: 'path', opacity: '0.1'},
            {nodeName: 'g'},
          ],
        },
      ],
    };

    testDOMNodeStructure(realNode, expectedNewStructure);
  });

  it('should be able to reorder many components', async () => {
    class Component extends React.Component {
      render() {
        const chars = this.props.chars.split('');
        return (
          <Surface>
            {chars.map(text => (
              <Shape key={text} title={text} />
            ))}
          </Surface>
        );
      }
    }

    // Mini multi-child stress test: lots of reorders, some adds, some removes.
    const before = 'abcdefghijklmnopqrst';
    const after = 'mxhpgwfralkeoivcstzy';

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component chars={before} />);
    });
    const realNode = container.firstChild;
    expect(realNode.textContent).toBe(before);

    await act(() => {
      root.render(<Component chars={after} />);
    });
    expect(realNode.textContent).toBe(after);
  });

  it('renders composite with lifecycle inside group', async () => {
    let mounted = false;

    class CustomShape extends React.Component {
      render() {
        return <Shape />;
      }

      componentDidMount() {
        mounted = true;
      }
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <Surface>
          <Group>
            <CustomShape />
          </Group>
        </Surface>,
      );
    });
    expect(mounted).toBe(true);
  });

  it('resolves refs before componentDidMount', async () => {
    class CustomShape extends React.Component {
      render() {
        return <Shape />;
      }
    }

    let ref = null;

    class Outer extends React.Component {
      test = React.createRef();

      componentDidMount() {
        ref = this.test.current;
      }

      render() {
        return (
          <Surface>
            <Group>
              <CustomShape ref={this.test} />
            </Group>
          </Surface>
        );
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Outer />);
    });
    expect(ref.constructor).toBe(CustomShape);
  });

  it('resolves refs before componentDidUpdate', async () => {
    class CustomShape extends React.Component {
      render() {
        return <Shape />;
      }
    }

    let ref = {};

    class Outer extends React.Component {
      test = React.createRef();

      componentDidMount() {
        ref = this.test.current;
      }

      componentDidUpdate() {
        ref = this.test.current;
      }

      render() {
        return (
          <Surface>
            <Group>
              {this.props.mountCustomShape && <CustomShape ref={this.test} />}
            </Group>
          </Surface>
        );
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Outer />);
    });
    expect(ref).toBe(null);

    await act(() => {
      root.render(<Outer mountCustomShape={true} />);
    });
    expect(ref.constructor).toBe(CustomShape);
  });

  it('adds and updates event handlers', async () => {
    const root = ReactDOMClient.createRoot(container);

    async function render(onClick) {
      await act(() => {
        root.render(
          <Surface>
            <Shape onClick={onClick} />
          </Surface>,
        );
      });
    }

    function doClick(instance) {
      const path = container.firstChild.querySelector('path');

      path.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
        }),
      );
    }

    const onClick1 = jest.fn();
    let instance = await render(onClick1);
    doClick(instance);
    expect(onClick1).toBeCalled();

    const onClick2 = jest.fn();
    instance = await render(onClick2);
    doClick(instance);
    expect(onClick2).toBeCalled();
  });
});

describe('ReactARTComponents', () => {
  let ReactTestRenderer;
  beforeEach(() => {
    jest.resetModules();
    // share isomorphic
    jest.mock('scheduler', () => Scheduler);
    jest.mock('react', () => React);
    // Isolate test renderer.
    ReactTestRenderer = require('react-test-renderer');
  });

  it('should generate a <Shape> with props for drawing the Circle', async () => {
    let circle;
    await act(() => {
      circle = ReactTestRenderer.create(
        <Circle radius={10} stroke="green" strokeWidth={3} fill="blue" />,
        {unstable_isConcurrent: true},
      );
    });
    expect(circle.toJSON()).toMatchSnapshot();
  });

  it('should generate a <Shape> with props for drawing the Rectangle', async () => {
    let rectangle;
    await act(() => {
      rectangle = ReactTestRenderer.create(
        <Rectangle width={50} height={50} stroke="green" fill="blue" />,
        {unstable_isConcurrent: true},
      );
    });
    expect(rectangle.toJSON()).toMatchSnapshot();
  });

  it('should generate a <Shape> with positive width when width prop is negative', async () => {
    let rectangle;
    await act(() => {
      rectangle = ReactTestRenderer.create(
        <Rectangle width={-50} height={50} />,
        {unstable_isConcurrent: true},
      );
    });
    expect(rectangle.toJSON()).toMatchSnapshot();
  });

  it('should generate a <Shape> with positive height when height prop is negative', async () => {
    let rectangle;
    await act(() => {
      rectangle = ReactTestRenderer.create(
        <Rectangle height={-50} width={50} />,
        {unstable_isConcurrent: true},
      );
    });
    expect(rectangle.toJSON()).toMatchSnapshot();
  });

  it('should generate a <Shape> with a radius property of 0 when top left radius prop is negative', async () => {
    let rectangle;
    await act(() => {
      rectangle = ReactTestRenderer.create(
        <Rectangle radiusTopLeft={-25} width={50} height={50} />,
        {unstable_isConcurrent: true},
      );
    });
    expect(rectangle.toJSON()).toMatchSnapshot();
  });

  it('should generate a <Shape> with a radius property of 0 when top right radius prop is negative', async () => {
    let rectangle;
    await act(() => {
      rectangle = ReactTestRenderer.create(
        <Rectangle radiusTopRight={-25} width={50} height={50} />,
        {unstable_isConcurrent: true},
      );
    });
    expect(rectangle.toJSON()).toMatchSnapshot();
  });

  it('should generate a <Shape> with a radius property of 0 when bottom right radius prop is negative', async () => {
    let rectangle;
    await act(() => {
      rectangle = ReactTestRenderer.create(
        <Rectangle radiusBottomRight={-30} width={50} height={50} />,
        {unstable_isConcurrent: true},
      );
    });
    expect(rectangle.toJSON()).toMatchSnapshot();
  });

  it('should generate a <Shape> with a radius property of 0 when bottom left radius prop is negative', async () => {
    let rectangle;
    await act(() => {
      rectangle = ReactTestRenderer.create(
        <Rectangle radiusBottomLeft={-25} width={50} height={50} />,
        {unstable_isConcurrent: true},
      );
    });
    expect(rectangle.toJSON()).toMatchSnapshot();
  });

  it('should generate a <Shape> where top radius is 0 if the sum of the top radius is greater than width', async () => {
    let rectangle;
    await act(() => {
      rectangle = ReactTestRenderer.create(
        <Rectangle
          radiusTopRight={25}
          radiusTopLeft={26}
          width={50}
          height={40}
        />,
        {unstable_isConcurrent: true},
      );
    });
    expect(rectangle.toJSON()).toMatchSnapshot();
  });

  it('should generate a <Shape> with props for drawing the Wedge', async () => {
    let wedge;
    await act(() => {
      wedge = ReactTestRenderer.create(
        <Wedge outerRadius={50} startAngle={0} endAngle={360} fill="blue" />,
        {unstable_isConcurrent: true},
      );
    });
    expect(wedge.toJSON()).toMatchSnapshot();
  });

  it('should return null if startAngle equals to endAngle on Wedge', async () => {
    let wedge;
    await act(() => {
      wedge = ReactTestRenderer.create(
        <Wedge outerRadius={50} startAngle={0} endAngle={0} fill="blue" />,
        {unstable_isConcurrent: true},
      );
    });
    expect(wedge.toJSON()).toBeNull();
  });
});
