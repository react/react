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
let ReactFabric;
let ReactNativePrivateInterface;
let createReactNativeComponentClass;
let StrictMode;
let act;
let assertConsoleErrorDev;

const DISPATCH_COMMAND_REQUIRES_HOST_COMPONENT =
  "dispatchCommand was called with a ref that isn't a " +
  'native component. Use React.forwardRef to get access to the underlying native component';

const SEND_ACCESSIBILITY_EVENT_REQUIRES_HOST_COMPONENT =
  "sendAccessibilityEvent was called with a ref that isn't a " +
  'native component. Use React.forwardRef to get access to the underlying native component';

describe('ReactFabric', () => {
  beforeEach(() => {
    jest.resetModules();

    require('react-native/Libraries/ReactPrivate/InitializeNativeFabricUIManager');

    React = require('react');
    StrictMode = React.StrictMode;
    ReactFabric = require('react-native-renderer/fabric');
    ReactNativePrivateInterface = require('react-native/Libraries/ReactPrivate/ReactNativePrivateInterface');
    createReactNativeComponentClass =
      require('react-native/Libraries/ReactPrivate/ReactNativePrivateInterface')
        .ReactNativeViewConfigRegistry.register;
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
  });

  it('should be able to create and render a native component', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    await act(() => {
      ReactFabric.render(<View foo="test" />, 1, null, true);
    });
    expect(nativeFabricUIManager.createNode).toBeCalled();
    expect(nativeFabricUIManager.appendChild).not.toBeCalled();
    expect(nativeFabricUIManager.completeRoot).toBeCalled();
  });

  it('should be able to create and update a native component', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    const firstNode = {};

    nativeFabricUIManager.createNode.mockReturnValue(firstNode);

    await act(() => {
      ReactFabric.render(<View foo="foo" />, 11, null, true);
    });

    expect(nativeFabricUIManager.createNode).toHaveBeenCalledTimes(1);

    await act(() => {
      ReactFabric.render(<View foo="bar" />, 11, null, true);
    });

    expect(nativeFabricUIManager.createNode).toHaveBeenCalledTimes(1);
    expect(nativeFabricUIManager.cloneNodeWithNewProps).toHaveBeenCalledTimes(
      1,
    );
    expect(nativeFabricUIManager.cloneNodeWithNewProps.mock.calls[0][0]).toBe(
      firstNode,
    );
    expect(
      nativeFabricUIManager.cloneNodeWithNewProps.mock.calls[0][1],
    ).toEqual({
      foo: 'bar',
    });
  });

  it('should not call FabricUIManager.cloneNode after render for properties that have not changed', async () => {
    const Text = createReactNativeComponentClass('RCTText', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTText',
    }));

    await act(() => {
      ReactFabric.render(<Text foo="a">1</Text>, 11, null, true);
    });
    expect(nativeFabricUIManager.cloneNode).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewProps).not.toBeCalled();
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps,
    ).not.toBeCalled();

    // If no properties have changed, we shouldn't call cloneNode.
    await act(() => {
      ReactFabric.render(<Text foo="a">1</Text>, 11, null, true);
    });
    expect(nativeFabricUIManager.cloneNode).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewProps).not.toBeCalled();
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps,
    ).not.toBeCalled();

    // Only call cloneNode for the changed property (and not for text).
    await act(() => {
      ReactFabric.render(<Text foo="b">1</Text>, 11, null, true);
    });
    expect(nativeFabricUIManager.cloneNode).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewProps).toHaveBeenCalledTimes(
      1,
    );
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps,
    ).not.toBeCalled();

    // Only call cloneNode for the changed text (and no other properties).
    await act(() => {
      ReactFabric.render(<Text foo="b">2</Text>, 11, null, true);
    });
    expect(nativeFabricUIManager.cloneNode).not.toBeCalled();
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildren,
    ).toHaveBeenCalledTimes(1);
    expect(nativeFabricUIManager.cloneNodeWithNewProps).toHaveBeenCalledTimes(
      1,
    );
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps,
    ).not.toBeCalled();

    // Call cloneNode for both changed text and properties.
    await act(() => {
      ReactFabric.render(<Text foo="c">3</Text>, 11, null, true);
    });
    expect(nativeFabricUIManager.cloneNode).not.toBeCalled();
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildren,
    ).toHaveBeenCalledTimes(1);
    expect(nativeFabricUIManager.cloneNodeWithNewProps).toHaveBeenCalledTimes(
      1,
    );
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps,
    ).toHaveBeenCalledTimes(1);
  });

  it('should only pass props diffs to FabricUIManager.cloneNode', async () => {
    const Text = createReactNativeComponentClass('RCTText', () => ({
      validAttributes: {foo: true, bar: true},
      uiViewClassName: 'RCTText',
    }));

    await act(() => {
      ReactFabric.render(
        <Text foo="a" bar="a">
          1
        </Text>,
        11,
        null,
        true,
      );
    });
    expect(nativeFabricUIManager.cloneNode).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewProps).not.toBeCalled();
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps,
    ).not.toBeCalled();

    jest
      .spyOn(ReactNativePrivateInterface, 'diffAttributePayloads')
      .mockReturnValue({bar: 'b'});

    await act(() => {
      ReactFabric.render(
        <Text foo="a" bar="b">
          1
        </Text>,
        11,
        null,
        true,
      );
    });
    expect(
      nativeFabricUIManager.cloneNodeWithNewProps.mock.calls[0][1],
    ).toEqual({
      bar: 'b',
    });
    expect(nativeFabricUIManager.__dumpHierarchyForJestTestsOnly()).toBe(`11
 RCTText {"foo":"a","bar":"b"}
   RCTRawText {"text":"1"}`);

    jest
      .spyOn(ReactNativePrivateInterface, 'diffAttributePayloads')
      .mockReturnValue({foo: 'b'});
    await act(() => {
      ReactFabric.render(
        <Text foo="b" bar="b">
          2
        </Text>,
        11,
        null,
        true,
      );
    });
    const argIndex = gate(flags => flags.passChildrenWhenCloningPersistedNodes)
      ? 2
      : 1;
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps.mock.calls[0][
        argIndex
      ],
    ).toEqual({
      foo: 'b',
    });
    expect(nativeFabricUIManager.__dumpHierarchyForJestTestsOnly()).toBe(`11
 RCTText {"foo":"b","bar":"b"}
   RCTRawText {"text":"2"}`);
  });

  it('should not clone nodes without children when updating props', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    const Component = ({foo}) => (
      <View>
        <View foo={foo} />
      </View>
    );

    await act(() =>
      ReactFabric.render(<Component foo={true} />, 11, null, true),
    );
    expect(nativeFabricUIManager.completeRoot).toBeCalled();
    jest.clearAllMocks();

    await act(() =>
      ReactFabric.render(<Component foo={false} />, 11, null, true),
    );
    expect(nativeFabricUIManager.cloneNode).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewProps).toHaveBeenCalledTimes(
      1,
    );
    expect(nativeFabricUIManager.cloneNodeWithNewProps).toHaveBeenCalledWith(
      expect.anything(),
      {foo: false},
    );

    expect(
      nativeFabricUIManager.cloneNodeWithNewChildren,
    ).toHaveBeenCalledTimes(1);
    if (gate(flags => flags.passChildrenWhenCloningPersistedNodes)) {
      expect(
        nativeFabricUIManager.cloneNodeWithNewChildren,
      ).toHaveBeenCalledWith(expect.anything(), [
        expect.objectContaining({props: {foo: false}}),
      ]);
      expect(nativeFabricUIManager.appendChild).not.toBeCalled();
    } else {
      expect(
        nativeFabricUIManager.cloneNodeWithNewChildren,
      ).toHaveBeenCalledWith(expect.anything());
      expect(nativeFabricUIManager.appendChild).toHaveBeenCalledTimes(1);
    }
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps,
    ).not.toBeCalled();
    expect(nativeFabricUIManager.completeRoot).toBeCalled();
  });

  it('should not clone nodes when layout effects are used', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    const ComponentWithEffect = () => {
      React.useLayoutEffect(() => {});
      return null;
    };

    await act(() =>
      ReactFabric.render(
        <View>
          <ComponentWithEffect />
        </View>,
        11,
        null,
        true,
      ),
    );
    expect(nativeFabricUIManager.completeRoot).toBeCalled();
    jest.clearAllMocks();

    await act(() =>
      ReactFabric.render(
        <View>
          <ComponentWithEffect />
        </View>,
        11,
        null,
        true,
      ),
    );
    expect(nativeFabricUIManager.cloneNode).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewProps).not.toBeCalled();
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps,
    ).not.toBeCalled();
    expect(nativeFabricUIManager.completeRoot).not.toBeCalled();
  });

  it('should not clone nodes when insertion effects are used', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    const ComponentWithRef = () => {
      React.useInsertionEffect(() => {});
      return null;
    };

    await act(() =>
      ReactFabric.render(
        <View>
          <ComponentWithRef />
        </View>,
        11,
        null,
        true,
      ),
    );
    expect(nativeFabricUIManager.completeRoot).toBeCalled();
    jest.clearAllMocks();

    await act(() =>
      ReactFabric.render(
        <View>
          <ComponentWithRef />
        </View>,
        11,
        null,
        true,
      ),
    );
    expect(nativeFabricUIManager.cloneNode).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewProps).not.toBeCalled();
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps,
    ).not.toBeCalled();
    expect(nativeFabricUIManager.completeRoot).not.toBeCalled();
  });

  it('should not clone nodes when useImperativeHandle is used', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    const ComponentWithImperativeHandle = props => {
      React.useImperativeHandle(props.ref, () => ({greet: () => 'hello'}));
      return null;
    };

    const ref = React.createRef();

    await act(() =>
      ReactFabric.render(
        <View>
          <ComponentWithImperativeHandle ref={ref} />
        </View>,
        11,
        null,
        true,
      ),
    );
    expect(nativeFabricUIManager.completeRoot).toBeCalled();
    expect(ref.current.greet()).toBe('hello');
    jest.clearAllMocks();

    await act(() =>
      ReactFabric.render(
        <View>
          <ComponentWithImperativeHandle ref={ref} />
        </View>,
        11,
        null,
        true,
      ),
    );
    expect(nativeFabricUIManager.cloneNode).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewChildren).not.toBeCalled();
    expect(nativeFabricUIManager.cloneNodeWithNewProps).not.toBeCalled();
    expect(
      nativeFabricUIManager.cloneNodeWithNewChildrenAndProps,
    ).not.toBeCalled();
    expect(nativeFabricUIManager.completeRoot).not.toBeCalled();
    expect(ref.current.greet()).toBe('hello');
  });

  it('should call dispatchCommand for native refs', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    nativeFabricUIManager.dispatchCommand.mockClear();

    let viewRef;
    await act(() => {
      ReactFabric.render(
        <View
          ref={ref => {
            viewRef = ref;
          }}
        />,
        11,
        null,
        true,
      );
    });

    expect(nativeFabricUIManager.dispatchCommand).not.toBeCalled();
    ReactFabric.dispatchCommand(viewRef, 'updateCommand', [10, 20]);
    expect(nativeFabricUIManager.dispatchCommand).toHaveBeenCalledTimes(1);
    expect(nativeFabricUIManager.dispatchCommand).toHaveBeenCalledWith(
      expect.any(Object),
      'updateCommand',
      [10, 20],
    );
  });

  it('should warn and no-op if calling dispatchCommand on non native refs', async () => {
    class BasicClass extends React.Component {
      render() {
        return <React.Fragment />;
      }
    }

    nativeFabricUIManager.dispatchCommand.mockReset();

    let viewRef;
    await act(() => {
      ReactFabric.render(
        <BasicClass
          ref={ref => {
            viewRef = ref;
          }}
        />,
        11,
        null,
        true,
      );
    });

    expect(nativeFabricUIManager.dispatchCommand).not.toBeCalled();
    ReactFabric.dispatchCommand(viewRef, 'updateCommand', [10, 20]);
    assertConsoleErrorDev([DISPATCH_COMMAND_REQUIRES_HOST_COMPONENT]);

    expect(nativeFabricUIManager.dispatchCommand).not.toBeCalled();
  });

  it('should call sendAccessibilityEvent for native refs', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    nativeFabricUIManager.sendAccessibilityEvent.mockClear();

    let viewRef;
    await act(() => {
      ReactFabric.render(
        <View
          ref={ref => {
            viewRef = ref;
          }}
        />,
        11,
        null,
        true,
      );
    });

    expect(nativeFabricUIManager.sendAccessibilityEvent).not.toBeCalled();
    ReactFabric.sendAccessibilityEvent(viewRef, 'focus');
    expect(nativeFabricUIManager.sendAccessibilityEvent).toHaveBeenCalledTimes(
      1,
    );
    expect(nativeFabricUIManager.sendAccessibilityEvent).toHaveBeenCalledWith(
      expect.any(Object),
      'focus',
    );
  });

  it('should warn and no-op if calling sendAccessibilityEvent on non native refs', async () => {
    class BasicClass extends React.Component {
      render() {
        return <React.Fragment />;
      }
    }

    nativeFabricUIManager.sendAccessibilityEvent.mockReset();

    let viewRef;
    await act(() => {
      ReactFabric.render(
        <BasicClass
          ref={ref => {
            viewRef = ref;
          }}
        />,
        11,
        null,
        true,
      );
    });

    expect(nativeFabricUIManager.sendAccessibilityEvent).not.toBeCalled();
    ReactFabric.sendAccessibilityEvent(viewRef, 'eventTypeName');
    assertConsoleErrorDev([SEND_ACCESSIBILITY_EVENT_REQUIRES_HOST_COMPONENT]);

    expect(nativeFabricUIManager.sendAccessibilityEvent).not.toBeCalled();
  });

  it('calls the callback with the correct instance and returns null', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    let a;
    let b;
    let c;
    await act(() => {
      c = ReactFabric.render(
        <View foo="foo" ref={v => (a = v)} />,
        11,
        function () {
          b = this;
        },
        true,
      );
    });

    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(c).toBe(null);
  });

  // @gate !disableLegacyMode
  it('returns the instance in legacy mode and calls the callback with it', () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    let a;
    let b;
    const c = ReactFabric.render(
      <View
        foo="foo"
        ref={v => {
          a = v;
        }}
      />,
      11,
      function () {
        b = this;
      },
    );

    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it('renders and reorders children', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {title: true},
      uiViewClassName: 'RCTView',
    }));

    class Component extends React.Component {
      render() {
        const chars = this.props.chars.split('');
        return (
          <View>
            {chars.map(text => (
              <View key={text} title={text} />
            ))}
          </View>
        );
      }
    }

    // Mini multi-child stress test: lots of reorders, some adds, some removes.
    const before = 'abcdefghijklmnopqrst';
    const after = 'mxhpgwfralkeoivcstzy';

    await act(() => {
      ReactFabric.render(<Component chars={before} />, 11, null, true);
    });
    expect(nativeFabricUIManager.__dumpHierarchyForJestTestsOnly()).toBe(`11
 RCTView {}
   RCTView {"title":"a"}
   RCTView {"title":"b"}
   RCTView {"title":"c"}
   RCTView {"title":"d"}
   RCTView {"title":"e"}
   RCTView {"title":"f"}
   RCTView {"title":"g"}
   RCTView {"title":"h"}
   RCTView {"title":"i"}
   RCTView {"title":"j"}
   RCTView {"title":"k"}
   RCTView {"title":"l"}
   RCTView {"title":"m"}
   RCTView {"title":"n"}
   RCTView {"title":"o"}
   RCTView {"title":"p"}
   RCTView {"title":"q"}
   RCTView {"title":"r"}
   RCTView {"title":"s"}
   RCTView {"title":"t"}`);

    await act(() => {
      ReactFabric.render(<Component chars={after} />, 11, null, true);
    });
    expect(nativeFabricUIManager.__dumpHierarchyForJestTestsOnly()).toBe(`11
 RCTView {}
   RCTView {"title":"m"}
   RCTView {"title":"x"}
   RCTView {"title":"h"}
   RCTView {"title":"p"}
   RCTView {"title":"g"}
   RCTView {"title":"w"}
   RCTView {"title":"f"}
   RCTView {"title":"r"}
   RCTView {"title":"a"}
   RCTView {"title":"l"}
   RCTView {"title":"k"}
   RCTView {"title":"e"}
   RCTView {"title":"o"}
   RCTView {"title":"i"}
   RCTView {"title":"v"}
   RCTView {"title":"c"}
   RCTView {"title":"s"}
   RCTView {"title":"t"}
   RCTView {"title":"z"}
   RCTView {"title":"y"}`);
  });

  it('recreates host parents even if only children changed', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {title: true},
      uiViewClassName: 'RCTView',
    }));

    const before = 'abcdefghijklmnopqrst';
    const after = 'mxhpgwfralkeoivcstzy';

    class Component extends React.Component {
      state = {
        chars: before,
      };
      render() {
        const chars = this.state.chars.split('');
        return (
          <View>
            {chars.map(text => (
              <View key={text} title={text} />
            ))}
          </View>
        );
      }
    }

    const ref = React.createRef();
    // Wrap in a host node.
    await act(() => {
      ReactFabric.render(
        <View>
          <Component ref={ref} />
        </View>,
        11,
        null,
        true,
      );
    });
    expect(nativeFabricUIManager.__dumpHierarchyForJestTestsOnly()).toBe(
      `11
 RCTView {}
   RCTView {}
     RCTView {"title":"a"}
     RCTView {"title":"b"}
     RCTView {"title":"c"}
     RCTView {"title":"d"}
     RCTView {"title":"e"}
     RCTView {"title":"f"}
     RCTView {"title":"g"}
     RCTView {"title":"h"}
     RCTView {"title":"i"}
     RCTView {"title":"j"}
     RCTView {"title":"k"}
     RCTView {"title":"l"}
     RCTView {"title":"m"}
     RCTView {"title":"n"}
     RCTView {"title":"o"}
     RCTView {"title":"p"}
     RCTView {"title":"q"}
     RCTView {"title":"r"}
     RCTView {"title":"s"}
     RCTView {"title":"t"}`,
    );

    // Call setState() so that we skip over the top-level host node.
    // It should still get recreated despite a bailout.
    await act(() => {
      ref.current.setState({
        chars: after,
      });
    });
    expect(nativeFabricUIManager.__dumpHierarchyForJestTestsOnly()).toBe(`11
 RCTView {}
   RCTView {}
     RCTView {"title":"m"}
     RCTView {"title":"x"}
     RCTView {"title":"h"}
     RCTView {"title":"p"}
     RCTView {"title":"g"}
     RCTView {"title":"w"}
     RCTView {"title":"f"}
     RCTView {"title":"r"}
     RCTView {"title":"a"}
     RCTView {"title":"l"}
     RCTView {"title":"k"}
     RCTView {"title":"e"}
     RCTView {"title":"o"}
     RCTView {"title":"i"}
     RCTView {"title":"v"}
     RCTView {"title":"c"}
     RCTView {"title":"s"}
     RCTView {"title":"t"}
     RCTView {"title":"z"}
     RCTView {"title":"y"}`);
  });

  it('calls setState with no arguments', async () => {
    let mockArgs;
    class Component extends React.Component {
      componentDidMount() {
        this.setState({}, (...args) => (mockArgs = args));
      }
      render() {
        return false;
      }
    }

    await act(() => {
      ReactFabric.render(<Component />, 11, null, true);
    });
    expect(mockArgs.length).toEqual(0);
  });

  it('should call complete after inserting children', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    const snapshots = [];
    nativeFabricUIManager.completeRoot.mockImplementation(
      function (rootTag, newChildSet) {
        snapshots.push(
          nativeFabricUIManager.__dumpChildSetForJestTestsOnly(newChildSet),
        );
      },
    );

    await act(() => {
      ReactFabric.render(
        <View foo="a">
          <View foo="b" />
        </View>,
        22,
        null,
        true,
      );
    });
    expect(snapshots).toEqual([
      `RCTView {"foo":"a"}
  RCTView {"foo":"b"}`,
    ]);
  });

  it('should not throw when <View> is used inside of a <Text> ancestor', async () => {
    const Image = createReactNativeComponentClass('RCTImage', () => ({
      validAttributes: {},
      uiViewClassName: 'RCTImage',
    }));
    const Text = createReactNativeComponentClass('RCTText', () => ({
      validAttributes: {},
      uiViewClassName: 'RCTText',
    }));
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {},
      uiViewClassName: 'RCTView',
    }));

    await act(() => {
      ReactFabric.render(
        <Text>
          <View />
        </Text>,
        11,
        null,
        true,
      );
    });

    await act(() => {
      ReactFabric.render(
        <Text>
          <Image />
        </Text>,
        11,
        null,
        true,
      );
    });
  });

  it('should console error for text not inside of a <Text> ancestor', async () => {
    const ScrollView = createReactNativeComponentClass('RCTScrollView', () => ({
      validAttributes: {},
      uiViewClassName: 'RCTScrollView',
    }));
    const Text = createReactNativeComponentClass('RCTText', () => ({
      validAttributes: {},
      uiViewClassName: 'RCTText',
    }));
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {},
      uiViewClassName: 'RCTView',
    }));

    await act(() => {
      ReactFabric.render(<View>this should warn</View>, 11, null, true);
    });
    assertConsoleErrorDev([
      'Text strings must be rendered within a <Text> component.\n' +
        '    in RCTView (at **)',
    ]);

    await act(() => {
      ReactFabric.render(
        <Text>
          <ScrollView>hi hello hi</ScrollView>
        </Text>,
        11,
        null,
        true,
      );
    });
    assertConsoleErrorDev([
      'Text strings must be rendered within a <Text> component.\n' +
        '    in RCTScrollView (at **)',
    ]);
  });

  it('should not throw for text inside of an indirect <Text> ancestor', async () => {
    const Text = createReactNativeComponentClass('RCTText', () => ({
      validAttributes: {},
      uiViewClassName: 'RCTText',
    }));

    const Indirection = () => 'Hi';

    await act(() => {
      ReactFabric.render(
        <Text>
          <Indirection />
        </Text>,
        11,
        null,
        true,
      );
    });
  });

  it('dispatches events to the last committed props', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {},
      uiViewClassName: 'RCTView',
      directEventTypes: {
        topTouchStart: {
          registrationName: 'onTouchStart',
        },
      },
    }));

    const touchStart = jest.fn();
    const touchStart2 = jest.fn();

    await act(() => {
      ReactFabric.render(<View onTouchStart={touchStart} />, 11, null, true);
    });

    expect(nativeFabricUIManager.createNode.mock.calls.length).toBe(1);
    expect(nativeFabricUIManager.registerEventHandler.mock.calls.length).toBe(
      1,
    );

    const [, , , , instanceHandle] =
      nativeFabricUIManager.createNode.mock.calls[0];
    const [dispatchEvent] =
      nativeFabricUIManager.registerEventHandler.mock.calls[0];

    const touchEvent = {
      touches: [],
      changedTouches: [],
    };

    expect(touchStart).not.toBeCalled();

    dispatchEvent(instanceHandle, 'topTouchStart', touchEvent);

    expect(touchStart).toBeCalled();
    expect(touchStart2).not.toBeCalled();

    await act(() => {
      ReactFabric.render(<View onTouchStart={touchStart2} />, 11, null, true);
    });

    // Intentionally dispatch to the same instanceHandle again.
    dispatchEvent(instanceHandle, 'topTouchStart', touchEvent);

    // The current semantics dictate that we always dispatch to the last committed
    // props even though the actual scheduling of the event could have happened earlier.
    // This could change in the future.
    expect(touchStart2).toBeCalled();
  });

  describe('skipBubbling', () => {
    it('should skip bubbling to ancestor if specified', async () => {
      const View = createReactNativeComponentClass('RCTView', () => ({
        validAttributes: {},
        uiViewClassName: 'RCTView',
        bubblingEventTypes: {
          topDefaultBubblingEvent: {
            phasedRegistrationNames: {
              captured: 'onDefaultBubblingEventCapture',
              bubbled: 'onDefaultBubblingEvent',
            },
          },
          topBubblingEvent: {
            phasedRegistrationNames: {
              captured: 'onBubblingEventCapture',
              bubbled: 'onBubblingEvent',
              skipBubbling: false,
            },
          },
          topSkipBubblingEvent: {
            phasedRegistrationNames: {
              captured: 'onSkippedBubblingEventCapture',
              bubbled: 'onSkippedBubblingEvent',
              skipBubbling: true,
            },
          },
        },
      }));
      const ancestorBubble = jest.fn();
      const ancestorCapture = jest.fn();
      const targetBubble = jest.fn();
      const targetCapture = jest.fn();

      const event = {};

      await act(() => {
        ReactFabric.render(
          <View
            onSkippedBubblingEventCapture={ancestorCapture}
            onDefaultBubblingEventCapture={ancestorCapture}
            onBubblingEventCapture={ancestorCapture}
            onSkippedBubblingEvent={ancestorBubble}
            onDefaultBubblingEvent={ancestorBubble}
            onBubblingEvent={ancestorBubble}>
            <View
              onSkippedBubblingEventCapture={targetCapture}
              onDefaultBubblingEventCapture={targetCapture}
              onBubblingEventCapture={targetCapture}
              onSkippedBubblingEvent={targetBubble}
              onDefaultBubblingEvent={targetBubble}
              onBubblingEvent={targetBubble}
            />
          </View>,
          11,
          null,
          true,
        );
      });

      expect(nativeFabricUIManager.createNode.mock.calls.length).toBe(2);
      expect(nativeFabricUIManager.registerEventHandler.mock.calls.length).toBe(
        1,
      );
      const [, , , , childInstance] =
        nativeFabricUIManager.createNode.mock.calls[0];
      const [dispatchEvent] =
        nativeFabricUIManager.registerEventHandler.mock.calls[0];

      dispatchEvent(childInstance, 'topDefaultBubblingEvent', event);
      expect(targetBubble).toHaveBeenCalledTimes(1);
      expect(targetCapture).toHaveBeenCalledTimes(1);
      expect(ancestorCapture).toHaveBeenCalledTimes(1);
      expect(ancestorBubble).toHaveBeenCalledTimes(1);
      ancestorBubble.mockReset();
      ancestorCapture.mockReset();
      targetBubble.mockReset();
      targetCapture.mockReset();

      dispatchEvent(childInstance, 'topBubblingEvent', event);
      expect(targetBubble).toHaveBeenCalledTimes(1);
      expect(targetCapture).toHaveBeenCalledTimes(1);
      expect(ancestorCapture).toHaveBeenCalledTimes(1);
      expect(ancestorBubble).toHaveBeenCalledTimes(1);
      ancestorBubble.mockReset();
      ancestorCapture.mockReset();
      targetBubble.mockReset();
      targetCapture.mockReset();

      dispatchEvent(childInstance, 'topSkipBubblingEvent', event);
      expect(targetBubble).toHaveBeenCalledTimes(1);
      expect(targetCapture).toHaveBeenCalledTimes(1);
      expect(ancestorCapture).toHaveBeenCalledTimes(1);
      expect(ancestorBubble).not.toBeCalled();
    });
  });

  it('dispatches event with target as instance', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {
        id: true,
      },
      uiViewClassName: 'RCTView',
      directEventTypes: {
        topTouchStart: {
          registrationName: 'onTouchStart',
        },
        topTouchEnd: {
          registrationName: 'onTouchEnd',
        },
      },
    }));

    function getViewById(id) {
      const [reactTag, , , , instanceHandle] =
        nativeFabricUIManager.createNode.mock.calls.find(
          args => args[3] && args[3].id === id,
        );

      return {reactTag, instanceHandle};
    }

    const ref1 = React.createRef();
    const ref2 = React.createRef();

    await act(() => {
      ReactFabric.render(
        <View id="parent">
          <View
            ref={ref1}
            id="one"
            onResponderStart={event => {
              expect(ref1.current).not.toBeNull();
              // Check for referential equality
              expect(ref1.current).toBe(event.target);
              expect(ref1.current).toBe(event.currentTarget);

              expect(global.event).toBe(event);
            }}
            onStartShouldSetResponder={() => true}
          />
          <View
            ref={ref2}
            id="two"
            onResponderStart={event => {
              expect(ref2.current).not.toBeNull();
              // Check for referential equality
              expect(ref2.current).toBe(event.target);
              expect(ref2.current).toBe(event.currentTarget);

              expect(global.event).toBe(event);
            }}
            onStartShouldSetResponder={() => true}
          />
        </View>,
        1,
        null,
        true,
      );
    });

    const [dispatchEvent] =
      nativeFabricUIManager.registerEventHandler.mock.calls[0];

    const preexistingEvent = {};
    global.event = preexistingEvent;

    dispatchEvent(getViewById('one').instanceHandle, 'topTouchStart', {
      target: getViewById('one').reactTag,
      identifier: 17,
      touches: [],
      changedTouches: [],
    });
    dispatchEvent(getViewById('one').instanceHandle, 'topTouchEnd', {
      target: getViewById('one').reactTag,
      identifier: 17,
      touches: [],
      changedTouches: [],
    });

    dispatchEvent(getViewById('two').instanceHandle, 'topTouchStart', {
      target: getViewById('two').reactTag,
      identifier: 17,
      touches: [],
      changedTouches: [],
    });

    dispatchEvent(getViewById('two').instanceHandle, 'topTouchEnd', {
      target: getViewById('two').reactTag,
      identifier: 17,
      touches: [],
      changedTouches: [],
    });

    expect(global.event).toBe(preexistingEvent);

    expect.assertions(9);
  });

  it('propagates timeStamps from native events and sets defaults', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {
        id: true,
      },
      uiViewClassName: 'RCTView',
      directEventTypes: {
        topTouchStart: {
          registrationName: 'onTouchStart',
        },
        topTouchEnd: {
          registrationName: 'onTouchEnd',
        },
      },
    }));

    function getViewById(id) {
      const [reactTag, , , , instanceHandle] =
        nativeFabricUIManager.createNode.mock.calls.find(
          args => args[3] && args[3].id === id,
        );

      return {reactTag, instanceHandle};
    }

    const ref1 = React.createRef();
    const ref2 = React.createRef();

    const explicitTimeStampCamelCase = 'explicit-timestamp-camelcase';
    const explicitTimeStampLowerCase = 'explicit-timestamp-lowercase';
    const performanceNowValue = 'performance-now-timestamp';

    jest.spyOn(performance, 'now').mockReturnValue(performanceNowValue);

    await act(() => {
      ReactFabric.render(
        <>
          <View
            ref={ref1}
            id="default"
            onTouchEnd={event => {
              expect(event.timeStamp).toBe(performanceNowValue);
            }}
          />
          <View
            ref={ref2}
            id="explicitTimeStampCamelCase"
            onTouchEnd={event => {
              expect(event.timeStamp).toBe(explicitTimeStampCamelCase);
            }}
          />
          <View
            ref={ref2}
            id="explicitTimeStampLowerCase"
            onTouchEnd={event => {
              expect(event.timeStamp).toBe(explicitTimeStampLowerCase);
            }}
          />
        </>,
        1,
        null,
        true,
      );
    });

    const [dispatchEvent] =
      nativeFabricUIManager.registerEventHandler.mock.calls[0];

    dispatchEvent(getViewById('default').instanceHandle, 'topTouchStart', {
      target: getViewById('default').reactTag,
      identifier: 17,
      touches: [],
      changedTouches: [],
    });
    dispatchEvent(getViewById('default').instanceHandle, 'topTouchEnd', {
      target: getViewById('default').reactTag,
      identifier: 17,
      touches: [],
      changedTouches: [],
      // No timeStamp property
    });

    dispatchEvent(
      getViewById('explicitTimeStampCamelCase').instanceHandle,
      'topTouchStart',
      {
        target: getViewById('explicitTimeStampCamelCase').reactTag,
        identifier: 17,
        touches: [],
        changedTouches: [],
      },
    );

    dispatchEvent(
      getViewById('explicitTimeStampCamelCase').instanceHandle,
      'topTouchEnd',
      {
        target: getViewById('explicitTimeStampCamelCase').reactTag,
        identifier: 17,
        touches: [],
        changedTouches: [],
        timeStamp: explicitTimeStampCamelCase,
      },
    );

    dispatchEvent(
      getViewById('explicitTimeStampLowerCase').instanceHandle,
      'topTouchStart',
      {
        target: getViewById('explicitTimeStampLowerCase').reactTag,
        identifier: 17,
        touches: [],
        changedTouches: [],
      },
    );

    dispatchEvent(
      getViewById('explicitTimeStampLowerCase').instanceHandle,
      'topTouchEnd',
      {
        target: getViewById('explicitTimeStampLowerCase').reactTag,
        identifier: 17,
        touches: [],
        changedTouches: [],
        timestamp: explicitTimeStampLowerCase,
      },
    );

    expect.assertions(3);
  });

  it('findHostInstance_DEPRECATED should warn if used to find a host component inside StrictMode', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    let parent = undefined;
    let child = undefined;

    class ContainsStrictModeChild extends React.Component {
      render() {
        return (
          <StrictMode>
            <View ref={n => (child = n)} />
          </StrictMode>
        );
      }
    }

    await act(() => {
      ReactFabric.render(
        <ContainsStrictModeChild ref={n => (parent = n)} />,
        11,
        null,
        true,
      );
    });

    const match = ReactFabric.findHostInstance_DEPRECATED(parent);
    assertConsoleErrorDev([
      'findHostInstance_DEPRECATED is deprecated in StrictMode. ' +
        'findHostInstance_DEPRECATED was passed an instance of ContainsStrictModeChild which renders StrictMode children. ' +
        'Instead, add a ref directly to the element you want to reference. ' +
        'Learn more about using refs safely here: ' +
        'https://react.dev/link/strict-mode-find-node' +
        '\n    in RCTView (at **)' +
        '\n    in ContainsStrictModeChild (at **)',
    ]);
    expect(match).toBe(child);
  });

  it('findHostInstance_DEPRECATED should warn if passed a component that is inside StrictMode', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    let parent = undefined;
    let child = undefined;

    class IsInStrictMode extends React.Component {
      render() {
        return <View ref={n => (child = n)} />;
      }
    }

    await act(() => {
      ReactFabric.render(
        <StrictMode>
          <IsInStrictMode ref={n => (parent = n)} />
        </StrictMode>,
        11,
        null,
        true,
      );
    });

    const match = ReactFabric.findHostInstance_DEPRECATED(parent);
    assertConsoleErrorDev([
      'findHostInstance_DEPRECATED is deprecated in StrictMode. ' +
        'findHostInstance_DEPRECATED was passed an instance of IsInStrictMode which is inside StrictMode. ' +
        'Instead, add a ref directly to the element you want to reference. ' +
        'Learn more about using refs safely here: ' +
        'https://react.dev/link/strict-mode-find-node' +
        '\n    in RCTView (at **)' +
        '\n    in IsInStrictMode (at **)',
    ]);
    expect(match).toBe(child);
  });

  it('findNodeHandle should warn if used to find a host component inside StrictMode', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    let parent = undefined;
    let child = undefined;

    class ContainsStrictModeChild extends React.Component {
      render() {
        return (
          <StrictMode>
            <View ref={n => (child = n)} />
          </StrictMode>
        );
      }
    }

    await act(() => {
      ReactFabric.render(
        <ContainsStrictModeChild ref={n => (parent = n)} />,
        11,
        null,
        true,
      );
    });

    const match = ReactFabric.findNodeHandle(parent);
    assertConsoleErrorDev([
      'findNodeHandle is deprecated in StrictMode. ' +
        'findNodeHandle was passed an instance of ContainsStrictModeChild which renders StrictMode children. ' +
        'Instead, add a ref directly to the element you want to reference. ' +
        'Learn more about using refs safely here: ' +
        'https://react.dev/link/strict-mode-find-node' +
        '\n    in RCTView (at **)' +
        '\n    in ContainsStrictModeChild (at **)',
    ]);
    expect(match).toBe(
      ReactNativePrivateInterface.getNativeTagFromPublicInstance(child),
    );
  });

  it('findNodeHandle should warn if passed a component that is inside StrictMode', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    let parent = undefined;
    let child = undefined;

    class IsInStrictMode extends React.Component {
      render() {
        return <View ref={n => (child = n)} />;
      }
    }

    await act(() => {
      ReactFabric.render(
        <StrictMode>
          <IsInStrictMode ref={n => (parent = n)} />
        </StrictMode>,
        11,
        null,
        true,
      );
    });

    const match = ReactFabric.findNodeHandle(parent);
    assertConsoleErrorDev([
      'findNodeHandle is deprecated in StrictMode. ' +
        'findNodeHandle was passed an instance of IsInStrictMode which is inside StrictMode. ' +
        'Instead, add a ref directly to the element you want to reference. ' +
        'Learn more about using refs safely here: ' +
        'https://react.dev/link/strict-mode-find-node' +
        '\n    in RCTView (at **)' +
        '\n    in IsInStrictMode (at **)',
    ]);
    expect(match).toBe(
      ReactNativePrivateInterface.getNativeTagFromPublicInstance(child),
    );
  });

  it('findNodeHandle errors when called from render', async () => {
    class TestComponent extends React.Component {
      render() {
        ReactFabric.findNodeHandle(this);
        return null;
      }
    }
    await act(() => {
      ReactFabric.render(<TestComponent />, 11, null, true);
    });
    assertConsoleErrorDev([
      'TestComponent is accessing findNodeHandle inside its render(). ' +
        'render() should be a pure function of props and state. It should ' +
        'never access something that requires stale data from the previous ' +
        'render, such as refs. Move this logic to componentDidMount and ' +
        'componentDidUpdate instead.\n' +
        '    in TestComponent (at **)',
    ]);
  });

  it("findNodeHandle doesn't error when called outside render", async () => {
    class TestComponent extends React.Component {
      render() {
        return null;
      }
      componentDidMount() {
        ReactFabric.findNodeHandle(this);
      }
    }
    await act(() => {
      ReactFabric.render(<TestComponent />, 11, null, true);
    });
  });

  it('should no-op if calling sendAccessibilityEvent on unmounted refs', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    nativeFabricUIManager.sendAccessibilityEvent.mockReset();

    let viewRef;
    await act(() => {
      ReactFabric.render(
        <View
          ref={ref => {
            viewRef = ref;
          }}
        />,
        11,
        null,
        true,
      );
    });
    const dangerouslyRetainedViewRef = viewRef;
    await act(() => {
      ReactFabric.stopSurface(11);
    });

    ReactFabric.sendAccessibilityEvent(
      dangerouslyRetainedViewRef,
      'eventTypeName',
    );
    assertConsoleErrorDev([
      "sendAccessibilityEvent was called with a ref that isn't a " +
        'native component. Use React.forwardRef to get access to the underlying native component',
    ]);

    expect(nativeFabricUIManager.sendAccessibilityEvent).not.toBeCalled();
  });

  it('getNodeFromInternalInstanceHandle should return the correct shadow node', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    await act(() => {
      ReactFabric.render(<View foo="test" />, 1, null, true);
    });

    const internalInstanceHandle =
      nativeFabricUIManager.createNode.mock.calls[0][4];
    expect(internalInstanceHandle).toEqual(expect.any(Object));

    const expectedShadowNode =
      nativeFabricUIManager.createNode.mock.results[0].value;
    expect(expectedShadowNode).toEqual(expect.any(Object));

    const node = ReactFabric.getNodeFromInternalInstanceHandle(
      internalInstanceHandle,
    );
    expect(node).toBe(expectedShadowNode);
  });

  it('getPublicInstanceFromInternalInstanceHandle should provide public instances for HostComponent', async () => {
    const View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {foo: true},
      uiViewClassName: 'RCTView',
    }));

    let viewRef;
    await act(() => {
      ReactFabric.render(
        <View
          foo="test"
          ref={ref => {
            viewRef = ref;
          }}
        />,
        1,
        null,
        true,
      );
    });

    const internalInstanceHandle =
      nativeFabricUIManager.createNode.mock.calls[0][4];
    expect(internalInstanceHandle).toEqual(expect.any(Object));

    const publicInstance =
      ReactFabric.getPublicInstanceFromInternalInstanceHandle(
        internalInstanceHandle,
      );
    expect(publicInstance).toBe(viewRef);

    await act(() => {
      ReactFabric.render(null, 1, null, true);
    });

    const publicInstanceAfterUnmount =
      ReactFabric.getPublicInstanceFromInternalInstanceHandle(
        internalInstanceHandle,
      );
    expect(publicInstanceAfterUnmount).toBe(null);
  });

  it('getPublicInstanceFromInternalInstanceHandle should provide public instances for HostText', async () => {
    jest.spyOn(ReactNativePrivateInterface, 'createPublicTextInstance');

    const RCTText = createReactNativeComponentClass('RCTText', () => ({
      validAttributes: {},
      uiViewClassName: 'RCTText',
    }));

    await act(() => {
      ReactFabric.render(<RCTText>Text content</RCTText>, 1, null, true);
    });

    // Access the internal instance handle used to create the text node.
    const internalInstanceHandle =
      nativeFabricUIManager.createNode.mock.calls[0][4];
    expect(internalInstanceHandle).toEqual(expect.any(Object));

    // Text public instances should be created lazily.
    expect(
      ReactNativePrivateInterface.createPublicTextInstance,
    ).not.toHaveBeenCalled();

    const publicInstance =
      ReactFabric.getPublicInstanceFromInternalInstanceHandle(
        internalInstanceHandle,
      );

    // We just requested the text public instance, so it should have been created at this point.
    expect(
      ReactNativePrivateInterface.createPublicTextInstance,
    ).toHaveBeenCalledTimes(1);
    expect(
      ReactNativePrivateInterface.createPublicTextInstance,
    ).toHaveBeenCalledWith(internalInstanceHandle);

    const expectedPublicInstance =
      ReactNativePrivateInterface.createPublicTextInstance.mock.results[0]
        .value;
    expect(publicInstance).toBe(expectedPublicInstance);

    await act(() => {
      ReactFabric.render(null, 1, null, true);
    });

    const publicInstanceAfterUnmount =
      ReactFabric.getPublicInstanceFromInternalInstanceHandle(
        internalInstanceHandle,
      );

    expect(publicInstanceAfterUnmount).toBe(null);
  });
});
