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
let createReactNativeComponentClass;
let act;
let View;
let Text;

describe('Fabric FragmentRefs', () => {
  beforeEach(() => {
    jest.resetModules();

    require('react-native/Libraries/ReactPrivate/InitializeNativeFabricUIManager');

    // This file runs under `@jest-environment node`, so unlike the DOM
    // FragmentRefs tests, there's no browser `Node` global providing these
    // constants.
    global.Node = {
      DOCUMENT_POSITION_DISCONNECTED: 1,
      DOCUMENT_POSITION_PRECEDING: 2,
      DOCUMENT_POSITION_FOLLOWING: 4,
      DOCUMENT_POSITION_CONTAINS: 8,
      DOCUMENT_POSITION_CONTAINED_BY: 16,
      DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32,
    };

    React = require('react');
    ReactFabric = require('react-native-renderer/fabric');
    createReactNativeComponentClass =
      require('react-native/react-private-interface')
        .ReactNativeViewConfigRegistry.register;
    ({act} = require('internal-test-utils'));
    View = createReactNativeComponentClass('RCTView', () => ({
      validAttributes: {nativeID: true},
      uiViewClassName: 'RCTView',
    }));
    Text = createReactNativeComponentClass('RCTText', () => ({
      validAttributes: {nativeID: true},
      uiViewClassName: 'RCTText',
    }));
  });

  // @gate enableFragmentRefs
  it('attaches a ref to Fragment', async () => {
    const fragmentRef = React.createRef();

    await act(() =>
      ReactFabric.render(
        <View>
          <React.Fragment ref={fragmentRef}>
            <View>
              <Text>Hi</Text>
            </View>
          </React.Fragment>
        </View>,
        11,
        null,
        true,
      ),
    );

    expect(fragmentRef.current).not.toBe(null);
  });

  // @gate enableFragmentRefs
  it('accepts a ref callback', async () => {
    let fragmentRef;

    await act(() => {
      ReactFabric.render(
        <React.Fragment ref={ref => (fragmentRef = ref)}>
          <View nativeID="child">
            <Text>Hi</Text>
          </View>
        </React.Fragment>,
        11,
        null,
        true,
      );
    });

    expect(fragmentRef && fragmentRef._fragmentFiber).toBeTruthy();
  });

  describe('observers', () => {
    // @gate enableFragmentRefs
    it('observes children, newly added children', async () => {
      let logs = [];
      const observer = {
        observe: entry => {
          // Here we reference internals because we don't need to mock the native observer
          // We only need to test that each child node is observed on insertion
          logs.push(entry.__internalInstanceHandle.pendingProps.nativeID);
        },
      };
      function Test({showB}) {
        const fragmentRef = React.useRef(null);
        React.useEffect(() => {
          fragmentRef.current.observeUsing(observer);
          const lastRefValue = fragmentRef.current;
          return () => {
            lastRefValue.unobserveUsing(observer);
          };
        }, []);
        return (
          <View nativeID="parent">
            <React.Fragment ref={fragmentRef}>
              <View nativeID="A" />
              {showB && <View nativeID="B" />}
            </React.Fragment>
          </View>
        );
      }

      await act(() => {
        ReactFabric.render(<Test showB={false} />, 11, null, true);
      });
      expect(logs).toEqual(['A']);
      logs = [];
      await act(() => {
        ReactFabric.render(<Test showB={true} />, 11, null, true);
      });
      expect(logs).toEqual(['B']);
    });
  });

  describe('compareDocumentPosition', () => {
    function expectPosition(position, spec) {
      expect({
        following: (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        preceding: (position & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
        contains: (position & Node.DOCUMENT_POSITION_CONTAINS) !== 0,
        containedBy: (position & Node.DOCUMENT_POSITION_CONTAINED_BY) !== 0,
        disconnected: (position & Node.DOCUMENT_POSITION_DISCONNECTED) !== 0,
        implementationSpecific:
          (position & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC) !== 0,
      }).toEqual(spec);
    }

    // @gate enableFragmentRefs
    it('returns the relationship between the fragment instance and a given node', async () => {
      const fragmentRef = React.createRef();
      const beforeRef = React.createRef();
      const afterRef = React.createRef();
      const firstChildRef = React.createRef();
      const middleChildRef = React.createRef();
      const lastChildRef = React.createRef();
      const containerRef = React.createRef();

      function Test() {
        return (
          <View nativeID="container" ref={containerRef}>
            <View nativeID="before" ref={beforeRef} />
            <React.Fragment ref={fragmentRef}>
              <View nativeID="first" ref={firstChildRef} />
              <View nativeID="middle" ref={middleChildRef} />
              <View nativeID="last" ref={lastChildRef} />
            </React.Fragment>
            <View nativeID="after" ref={afterRef} />
          </View>
        );
      }

      await act(() => {
        ReactFabric.render(<Test />, 11, null, true);
      });

      // beforeRef is preceding the fragment
      expectPosition(
        fragmentRef.current.compareDocumentPosition(beforeRef.current),
        {
          preceding: true,
          following: false,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      // afterRef is following the fragment
      expectPosition(
        fragmentRef.current.compareDocumentPosition(afterRef.current),
        {
          preceding: false,
          following: true,
          contains: false,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      // firstChildRef, middleChildRef, and lastChildRef are contained by the fragment
      [firstChildRef, middleChildRef, lastChildRef].forEach(ref => {
        expectPosition(fragmentRef.current.compareDocumentPosition(ref.current), {
          preceding: false,
          following: false,
          contains: false,
          containedBy: true,
          disconnected: false,
          implementationSpecific: false,
        });
      });

      // containerRef precedes and contains the fragment
      expectPosition(
        fragmentRef.current.compareDocumentPosition(containerRef.current),
        {
          preceding: true,
          following: false,
          contains: true,
          containedBy: false,
          disconnected: false,
          implementationSpecific: false,
        },
      );

      // A node from a disconnected tree is reported as disconnected. Per
      // spec, preceding/following is implementation-defined in this case,
      // so only assert the bits that are well-defined.
      const disconnectedInstance = {
        __nativeTag: -1,
        __internalInstanceHandle: null,
      };
      const disconnectedPosition = fragmentRef.current.compareDocumentPosition(
        disconnectedInstance,
      );
      expect(
        disconnectedPosition & Node.DOCUMENT_POSITION_DISCONNECTED,
      ).not.toBe(0);
      expect(
        disconnectedPosition & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC,
      ).not.toBe(0);
      expect(disconnectedPosition & Node.DOCUMENT_POSITION_CONTAINS).toBe(0);
      expect(
        disconnectedPosition & Node.DOCUMENT_POSITION_CONTAINED_BY,
      ).toBe(0);
    });

    // @gate enableFragmentRefs
    it('does not report a foreign native view spliced between the fragment children as contained', async () => {
      const fragmentRef = React.createRef();
      const containerRef = React.createRef();
      const firstChildRef = React.createRef();
      const lastChildRef = React.createRef();

      function Test() {
        return (
          <View nativeID="container" ref={containerRef}>
            <React.Fragment ref={fragmentRef}>
              <View nativeID="first" ref={firstChildRef} />
              <View nativeID="last" ref={lastChildRef} />
            </React.Fragment>
          </View>
        );
      }

      await act(() => {
        ReactFabric.render(<Test />, 11, null, true);
      });

      // Simulate a native view that was inserted directly into the host
      // tree without React's knowledge (e.g. by a native module), sitting
      // between the fragment's tracked first and last children.
      const foreignTag = 999999;
      const foreignNode = global.nativeFabricUIManager.createNode(
        foreignTag,
        'RCTView',
        11,
        {},
        null,
      );
      const containerNode = global.nativeFabricUIManager.findNodeForJestTestsOnly(
        containerRef.current.__nativeTag,
      );
      const firstIndex = containerNode.children.findIndex(
        child => child.reactTag === firstChildRef.current.__nativeTag,
      );
      containerNode.children.splice(firstIndex + 1, 0, foreignNode);

      const foreignPublicInstance = {
        __nativeTag: foreignTag,
        __internalInstanceHandle: null,
      };

      const position =
        fragmentRef.current.compareDocumentPosition(foreignPublicInstance);
      // It must not be misreported as contained by the fragment just
      // because it sits between the first and last children natively.
      expect(position & Node.DOCUMENT_POSITION_CONTAINED_BY).toBe(0);
      expect(
        position & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC,
      ).not.toBe(0);
    });
  });
});
