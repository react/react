/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let act;
let React;
let ReactDOMClient;
let assertConsoleErrorDev;

describe('ReactElementClone', () => {
  let ComponentClass;

  beforeEach(() => {
    jest.resetModules();

    ({act, assertConsoleErrorDev} = require('internal-test-utils'));

    React = require('react');
    ReactDOMClient = require('react-dom/client');

    // NOTE: We're explicitly not using JSX here. This is intended to test
    // classic JS without JSX.
    ComponentClass = class extends React.Component {
      render() {
        return React.createElement('div');
      }
    };
  });

  it('should clone a DOM component with new props', async () => {
    let div;
    class Grandparent extends React.Component {
      render() {
        return (
          <Parent
            child={<div ref={node => (div = node)} className="child" />}
          />
        );
      }
    }
    class Parent extends React.Component {
      render() {
        return (
          <div className="parent">
            {React.cloneElement(this.props.child, {className: 'xyz'})}
          </div>
        );
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Grandparent />);
    });
    expect(div.className).toBe('xyz');
  });

  it('should clone a composite component with new props', async () => {
    let div;
    class Child extends React.Component {
      render() {
        return (
          <div ref={node => (div = node)} className={this.props.className} />
        );
      }
    }
    class Grandparent extends React.Component {
      render() {
        return <Parent child={<Child className="child" />} />;
      }
    }
    class Parent extends React.Component {
      render() {
        return (
          <div className="parent">
            {React.cloneElement(this.props.child, {className: 'xyz'})}
          </div>
        );
      }
    }
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Grandparent />);
    });
    expect(div.className).toBe('xyz');
  });

  it('does not fail if config has no prototype', () => {
    const config = Object.create(null, {foo: {value: 1, enumerable: true}});
    React.cloneElement(<div />, config);
  });

  it('should keep the original ref if it is not overridden', async () => {
    let component;
    class Grandparent extends React.Component {
      yoloRef = React.createRef();

      componentDidMount() {
        component = this;
      }

      render() {
        return <Parent child={<div ref={this.yoloRef} />} />;
      }
    }

    class Parent extends React.Component {
      render() {
        return (
          <div>{React.cloneElement(this.props.child, {className: 'xyz'})}</div>
        );
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Grandparent />);
    });

    expect(component.yoloRef.current.tagName).toBe('DIV');
  });

  it('should transfer the key property', () => {
    class Component extends React.Component {
      render() {
        return null;
      }
    }
    const clone = React.cloneElement(<Component />, {key: 'xyz'});
    expect(clone.key).toBe('xyz');
  });

  it('should transfer children', async () => {
    class Component extends React.Component {
      render() {
        expect(this.props.children).toBe('xyz');
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(React.cloneElement(<Component />, {children: 'xyz'}));
    });
  });

  it('should shallow clone children', async () => {
    class Component extends React.Component {
      render() {
        expect(this.props.children).toBe('xyz');
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(React.cloneElement(<Component>xyz</Component>, {}));
    });
  });

  it('should accept children as rest arguments', () => {
    class Component extends React.Component {
      render() {
        return null;
      }
    }

    const clone = React.cloneElement(
      <Component>xyz</Component>,
      {children: <Component />},
      <div />,
      <span />,
    );

    expect(clone.props.children).toEqual([<div />, <span />]);
  });

  it('should override children if undefined is provided as an argument', () => {
    const element = React.createElement(
      ComponentClass,
      {
        children: 'text',
      },
      undefined,
    );
    expect(element.props.children).toBe(undefined);

    const element2 = React.cloneElement(
      React.createElement(ComponentClass, {
        children: 'text',
      }),
      {},
      undefined,
    );
    expect(element2.props.children).toBe(undefined);
  });

  it('should support keys and refs', async () => {
    let component;
    class Parent extends React.Component {
      xyzRef = React.createRef();

      render() {
        const clone = React.cloneElement(this.props.children, {
          key: 'xyz',
          ref: this.xyzRef,
        });
        expect(clone.key).toBe('xyz');
        expect(clone.props.ref).toBe(this.xyzRef);
        return <div>{clone}</div>;
      }
    }

    class Grandparent extends React.Component {
      parentRef = React.createRef();

      componentDidMount() {
        component = this;
      }

      render() {
        return (
          <Parent ref={this.parentRef}>
            <span key="abc" />
          </Parent>
        );
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => root.render(<Grandparent />));
    expect(component.parentRef.current.xyzRef.current.tagName).toBe('SPAN');
  });

  it('should steal the ref if a new ref is specified', async () => {
    let component;
    class Parent extends React.Component {
      xyzRef = React.createRef();

      render() {
        const clone = React.cloneElement(this.props.children, {
          ref: this.xyzRef,
        });
        return <div>{clone}</div>;
      }
    }

    class Grandparent extends React.Component {
      parentRef = React.createRef();
      childRef = React.createRef();

      componentDidMount() {
        component = this;
      }

      render() {
        return (
          <Parent ref={this.parentRef}>
            <span ref={this.childRef} />
          </Parent>
        );
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => root.render(<Grandparent />));
    expect(component.childRef).toEqual({current: null});
    expect(component.parentRef.current.xyzRef.current.tagName).toBe('SPAN');
  });

  it('should overwrite props', async () => {
    class Component extends React.Component {
      render() {
        expect(this.props.myprop).toBe('xyz');
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() =>
      root.render(
        React.cloneElement(<Component myprop="abc" />, {myprop: 'xyz'}),
      ),
    );
  });

  it('warns for keys for arrays of elements in rest args', async () => {
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(React.cloneElement(<div />, null, [<div />, <div />]));
    });
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n\n' +
        'Check the top-level render call using <div>. See https://react.dev/link/warning-keys for more information.\n' +
        '    in div (at **)',
    ]);
  });

  it('does not warns for arrays of elements with keys', async () => {
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(
        React.cloneElement(<div />, null, [<div key="#1" />, <div key="#2" />]),
      );
    });
  });

  it('does not warn when the element is directly in rest args', async () => {
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(React.cloneElement(<div />, null, <div />, <div />));
    });
  });

  it('does not warn when the array contains a non-element', () => {
    React.cloneElement(<div />, null, [{}, {}]);
  });

  it('should ignore key and ref warning getters', () => {
    const elementA = React.createElement('div');
    const elementB = React.cloneElement(elementA, elementA.props);
    expect(elementB.key).toBe(null);
    expect(elementB.ref).toBe(null);
  });

  it('should ignore undefined key and ref', () => {
    const element = React.createElement(ComponentClass, {
      key: '12',
      ref: '34',
      foo: '56',
    });
    const props = {
      key: undefined,
      ref: undefined,
      foo: 'ef',
    };
    const clone = React.cloneElement(element, props);
    expect(clone.type).toBe(ComponentClass);
    expect(clone.key).toBe('12');
    expect(clone.props.ref).toBe('34');
    expect(clone.ref).toBe('34');
    assertConsoleErrorDev([
      'Accessing element.ref was removed in React 19. ref is now a ' +
        'regular prop. It will be removed from the JSX Element ' +
        'type in a future release.',
    ]);
    expect(clone.props).toEqual({foo: 'ef', ref: '34'});
    if (__DEV__) {
      expect(Object.isFrozen(element)).toBe(true);
      expect(Object.isFrozen(element.props)).toBe(true);
    }
  });

  it('should extract null key and ref', () => {
    const element = React.createElement(ComponentClass, {
      key: '12',
      ref: '34',
      foo: '56',
    });
    const props = {
      key: null,
      ref: null,
      foo: 'ef',
    };
    const clone = React.cloneElement(element, props);
    expect(clone.type).toBe(ComponentClass);
    expect(clone.key).toBe('null');
    expect(clone.ref).toBe(null);
    expect(clone.props).toEqual({foo: 'ef', ref: null});
    if (__DEV__) {
      expect(Object.isFrozen(element)).toBe(true);
      expect(Object.isFrozen(element.props)).toBe(true);
    }
  });

  it('throws an error if passed null', () => {
    const element = null;
    expect(() => React.cloneElement(element)).toThrow(
      'The argument must be a React element, but you passed null.',
    );
  });

  it('throws an error if passed undefined', () => {
    let element;
    expect(() => React.cloneElement(element)).toThrow(
      'The argument must be a React element, but you passed undefined.',
    );
  });
});
