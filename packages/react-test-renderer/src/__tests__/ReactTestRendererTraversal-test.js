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

const React = require('react');
let ReactTestRenderer;
let Context;
let act;

const RCTView = 'RCTView';
const View = props => <RCTView {...props} />;

describe('ReactTestRendererTraversal', () => {
  beforeEach(() => {
    jest.resetModules();
    ReactTestRenderer = require('react-test-renderer');
    act = require('internal-test-utils').act;
    Context = React.createContext(null);
  });

  class Example extends React.Component {
    render() {
      return (
        <View>
          <View foo="foo">
            <View bar="bar" />
            <View bar="bar" baz="baz" itself="itself" />
            <View />
            <ExampleSpread bar="bar" />
            <ExampleFn bar="bar" bing="bing" />
            <ExampleNull bar="bar" />
            <ExampleNull null="null">
              <View void="void" />
              <View void="void" />
            </ExampleNull>
            <React.Profiler id="test" onRender={() => {}}>
              <ExampleForwardRef qux="qux" />
            </React.Profiler>
            <>
              <>
                <Context.Provider value={null}>
                  <Context.Consumer>
                    {() => <View nested={true} />}
                  </Context.Consumer>
                </Context.Provider>
              </>
              <View nested={true} />
              <View nested={true} />
            </>
          </View>
        </View>
      );
    }
  }
  class ExampleSpread extends React.Component {
    render = () => <View {...this.props} />;
  }
  const ExampleFn = props => <View baz="baz" />;
  const ExampleNull = props => null;

  const ExampleForwardRef = React.forwardRef((props, ref) => (
    <View {...props} ref={ref} />
  ));

  it('initializes', async () => {
    let render;
    await act(() => {
      render = ReactTestRenderer.create(<Example />);
    });
    const hasFooProp = node => node.props.hasOwnProperty('foo');

    // assert .props, .type and .parent attributes
    const foo = render.root.find(hasFooProp);
    expect(foo.props.children).toHaveLength(9);
    expect(foo.type).toBe(View);
    expect(render.root.parent).toBe(null);
    expect(foo.children[0].parent).toBe(foo);
  });

  it('searches via .find() / .findAll()', async () => {
    let render;
    await act(() => {
      render = ReactTestRenderer.create(<Example />);
    });

    const hasFooProp = node => node.props.hasOwnProperty('foo');
    const hasBarProp = node => node.props.hasOwnProperty('bar');
    const hasBazProp = node => node.props.hasOwnProperty('baz');
    const hasBingProp = node => node.props.hasOwnProperty('bing');
    const hasNullProp = node => node.props.hasOwnProperty('null');
    const hasVoidProp = node => node.props.hasOwnProperty('void');
    const hasItselfProp = node => node.props.hasOwnProperty('itself');
    const hasNestedProp = node => node.props.hasOwnProperty('nested');

    expect(() => render.root.find(hasFooProp)).not.toThrow(); // 1 match
    expect(() => render.root.find(hasBarProp)).toThrow(); // >1 matches
    expect(() => render.root.find(hasBazProp)).toThrow(); // >1 matches
    expect(() => render.root.find(hasBingProp)).not.toThrow(); // 1 match
    expect(() => render.root.find(hasNullProp)).not.toThrow(); // 1 match
    expect(() => render.root.find(hasVoidProp)).toThrow(); // 0 matches
    expect(() => render.root.find(hasNestedProp)).toThrow(); // >1 matches

    // same assertion as .find(), but confirm length
    expect(render.root.findAll(hasFooProp, {deep: false})).toHaveLength(1);
    expect(render.root.findAll(hasBarProp, {deep: false})).toHaveLength(5);
    expect(render.root.findAll(hasBazProp, {deep: false})).toHaveLength(2);
    expect(render.root.findAll(hasBingProp, {deep: false})).toHaveLength(1);
    expect(render.root.findAll(hasNullProp, {deep: false})).toHaveLength(1);
    expect(render.root.findAll(hasVoidProp, {deep: false})).toHaveLength(0);
    expect(render.root.findAll(hasNestedProp, {deep: false})).toHaveLength(3);

    // note: with {deep: true}, .findAll() will continue to
    //       search children, even after finding a match
    expect(render.root.findAll(hasFooProp)).toHaveLength(2);
    expect(render.root.findAll(hasBarProp)).toHaveLength(9);
    expect(render.root.findAll(hasBazProp)).toHaveLength(4);
    expect(render.root.findAll(hasBingProp)).toHaveLength(1); // no spread
    expect(render.root.findAll(hasNullProp)).toHaveLength(1); // no spread
    expect(render.root.findAll(hasVoidProp)).toHaveLength(0);
    expect(render.root.findAll(hasNestedProp, {deep: false})).toHaveLength(3);

    const bing = render.root.find(hasBingProp);
    expect(bing.find(hasBarProp)).toBe(bing);
    expect(bing.find(hasBingProp)).toBe(bing);
    expect(bing.findAll(hasBazProp, {deep: false})).toHaveLength(1);
    expect(bing.findAll(hasBazProp)).toHaveLength(2);

    const foo = render.root.find(hasFooProp);
    expect(foo.findAll(hasFooProp, {deep: false})).toHaveLength(1);
    expect(foo.findAll(hasFooProp)).toHaveLength(2);

    const itself = foo.find(hasItselfProp);
    expect(itself.find(hasBarProp)).toBe(itself);
    expect(itself.find(hasBazProp)).toBe(itself);
    expect(itself.findAll(hasBazProp, {deep: false})).toHaveLength(1);
    expect(itself.findAll(hasBazProp)).toHaveLength(2);
  });

  it('searches via .findByType() / .findAllByType()', async () => {
    let render;
    await act(() => {
      render = ReactTestRenderer.create(<Example />);
    });

    expect(() => render.root.findByType(ExampleFn)).not.toThrow(); // 1 match
    expect(() => render.root.findByType(View)).not.toThrow(); // 1 match
    expect(() => render.root.findByType(ExampleForwardRef)).not.toThrow(); // 1 match
    // note: there are clearly multiple <View /> in general, but there
    //       is only one being rendered at root node level
    expect(() => render.root.findByType(ExampleNull)).toThrow(); // 2 matches

    expect(render.root.findAllByType(ExampleFn)).toHaveLength(1);
    expect(render.root.findAllByType(View, {deep: false})).toHaveLength(1);
    expect(render.root.findAllByType(View)).toHaveLength(11);
    expect(render.root.findAllByType(ExampleNull)).toHaveLength(2);
    expect(render.root.findAllByType(ExampleForwardRef)).toHaveLength(1);

    const nulls = render.root.findAllByType(ExampleNull);
    expect(nulls[0].findAllByType(View)).toHaveLength(0);
    expect(nulls[1].findAllByType(View)).toHaveLength(0);

    const fn = render.root.findAllByType(ExampleFn);
    expect(fn[0].findAllByType(View)).toHaveLength(1);
  });

  it('searches via .findByProps() / .findAllByProps()', async () => {
    let render;
    await act(() => {
      render = ReactTestRenderer.create(<Example />);
    });
    const foo = 'foo';
    const bar = 'bar';
    const baz = 'baz';
    const qux = 'qux';

    expect(() => render.root.findByProps({foo})).not.toThrow(); // 1 match
    expect(() => render.root.findByProps({bar})).toThrow(); // >1 matches
    expect(() => render.root.findByProps({baz})).toThrow(); // >1 matches
    expect(() => render.root.findByProps({qux})).not.toThrow(); // 1 match

    expect(render.root.findAllByProps({foo}, {deep: false})).toHaveLength(1);
    expect(render.root.findAllByProps({bar}, {deep: false})).toHaveLength(5);
    expect(render.root.findAllByProps({baz}, {deep: false})).toHaveLength(2);
    expect(render.root.findAllByProps({qux}, {deep: false})).toHaveLength(1);

    expect(render.root.findAllByProps({foo})).toHaveLength(2);
    expect(render.root.findAllByProps({bar})).toHaveLength(9);
    expect(render.root.findAllByProps({baz})).toHaveLength(4);
    expect(render.root.findAllByProps({qux})).toHaveLength(3);
  });

  it('skips special nodes', async () => {
    let render;
    await act(() => {
      render = ReactTestRenderer.create(<Example />);
    });
    expect(render.root.findAllByType(React.Fragment)).toHaveLength(0);
    expect(render.root.findAllByType(Context.Consumer)).toHaveLength(0);
    expect(render.root.findAllByType(Context.Provider)).toHaveLength(0);

    const expectedParent = render.root.findByProps({foo: 'foo'}, {deep: false})
      .children[0];
    const nestedViews = render.root.findAllByProps(
      {nested: true},
      {deep: false},
    );
    expect(nestedViews.length).toBe(3);
    expect(nestedViews[0].parent).toBe(expectedParent);
    expect(nestedViews[1].parent).toBe(expectedParent);
    expect(nestedViews[2].parent).toBe(expectedParent);
  });

  it('can have special nodes as roots', async () => {
    const FR = React.forwardRef((props, ref) => <section {...props} />);

    let render1;
    await act(() => {
      render1 = ReactTestRenderer.create(
        <FR>
          <div />
          <div />
        </FR>,
      );
    });
    expect(render1.root.findAllByType('div').length).toBe(2);

    let render2;
    await act(() => {
      render2 = ReactTestRenderer.create(
        <>
          <div />
          <div />
        </>,
      );
    });
    expect(render2.root.findAllByType('div').length).toBe(2);

    let render3;
    await act(() => {
      render3 = ReactTestRenderer.create(
        <React.Fragment key="foo">
          <div />
          <div />
        </React.Fragment>,
      );
    });
    expect(render3.root.findAllByType('div').length).toBe(2);

    let render4;
    await act(() => {
      render4 = ReactTestRenderer.create(
        <React.StrictMode>
          <div />
          <div />
        </React.StrictMode>,
      );
    });
    expect(render4.root.findAllByType('div').length).toBe(2);

    let render5;
    await act(() => {
      render5 = ReactTestRenderer.create(
        <Context.Provider value={null}>
          <div />
          <div />
        </Context.Provider>,
      );
    });
    expect(render5.root.findAllByType('div').length).toBe(2);
  });
});
