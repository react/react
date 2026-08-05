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
});
