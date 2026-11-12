/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type Store from 'react-devtools-shared/src/devtools/store';

describe('InspectedElementContext', () => {
  let React;
  let ReactDOM;
  let bridge: FrontendBridge;
  let store: Store;

  let backendAPI;

  const act = (callback: Function) => {
    callback();

    jest.runAllTimers(); // Flush Bridge operations
  };

  async function read(
    id: number,
    path: Array<string | number> = null,
  ): Promise<Object> {
    const rendererID = ((store.getRendererIDForElement(id): any): number);
    const promise = backendAPI
      .inspectElement(bridge, false, id, path, rendererID)
      .then(data =>
        backendAPI.convertInspectedElementBackendToFrontend(data.value),
      );

    jest.runOnlyPendingTimers();

    return promise;
  }

  beforeEach(() => {
    bridge = global.bridge;
    store = global.store;

    backendAPI = require('react-devtools-shared/src/backendAPI');

    // Redirect all React/ReactDOM requires to the v15 UMD.
    // We use the UMD because Jest doesn't enable us to mock deep imports (e.g. "react/lib/Something").
    jest.mock('react', () => jest.requireActual('react-15/dist/react.js'));
    jest.mock('react-dom', () =>
      jest.requireActual('react-dom-15/dist/react-dom.js'),
    );

    React = require('react');
    ReactDOM = require('react-dom');
  });

  // @reactVersion >= 16.0
  it('should inspect the currently selected element', async () => {
    const Example = () => null;

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {a: 1, b: 'abc'}),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const inspectedElement = await read(id);

    expect(inspectedElement).toMatchInlineSnapshot(`
      {
        "context": {},
        "events": undefined,
        "hooks": null,
        "id": 2,
        "owners": null,
        "props": {
          "a": 1,
          "b": "abc",
        },
        "rootType": null,
        "state": null,
      }
    `);
  });

  // @reactVersion >= 16.0
  it('should support simple data types', async () => {
    const Example = () => null;

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {
          boolean_false: false,
          boolean_true: true,
          infinity: Infinity,
          minus_infinity: -Infinity,
          integer_zero: 0,
          integer_one: 1,
          float: 1.23,
          string: 'abc',
          string_empty: '',
          nan: NaN,
          value_null: null,
          value_undefined: undefined,
        }),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const inspectedElement = await read(id);

    expect(inspectedElement).toMatchInlineSnapshot(`
      {
        "context": {},
        "events": undefined,
        "hooks": null,
        "id": 2,
        "owners": null,
        "props": {
          "boolean_false": false,
          "boolean_true": true,
          "float": 1.23,
          "infinity": Infinity,
          "integer_one": 1,
          "integer_zero": 0,
          "minus_infinity": -Infinity,
          "nan": NaN,
          "string": "abc",
          "string_empty": "",
          "value_null": null,
          "value_undefined": undefined,
        },
        "rootType": null,
        "state": null,
      }
    `);
  });

  // @reactVersion >= 16.0
  it('should support complex data types', async () => {
    const Immutable = require('immutable');

    const Example = () => null;

    const arrayOfArrays = [[['abc', 123, true], []]];
    const div = document.createElement('div');
    const exampleFunction = () => {};
    const setShallow = new Set(['abc', 123]);
    const mapShallow = new Map([
      ['name', 'Brian'],
      ['food', 'sushi'],
    ]);
    const setOfSets = new Set([new Set(['a', 'b', 'c']), new Set([1, 2, 3])]);
    const mapOfMaps = new Map([
      ['first', mapShallow],
      ['second', mapShallow],
    ]);
    const objectOfObjects = {
      inner: {string: 'abc', number: 123, boolean: true},
    };
    const typedArray = Int8Array.from([100, -100, 0]);
    const arrayBuffer = typedArray.buffer;
    const dataView = new DataView(arrayBuffer);
    const immutableMap = Immutable.fromJS({
      a: [{hello: 'there'}, 'fixed', true],
      b: 123,
      c: {
        '1': 'xyz',
        xyz: 1,
      },
    });

    class Class {
      anonymousFunction = () => {};
    }
    const instance = new Class();

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {
          anonymous_fn: instance.anonymousFunction,
          array_buffer: arrayBuffer,
          array_of_arrays: arrayOfArrays,
          big_int: BigInt(123),
          bound_fn: exampleFunction.bind(this),
          data_view: dataView,
          date: new Date(123),
          fn: exampleFunction,
          html_element: div,
          immutable: immutableMap,
          map: mapShallow,
          map_of_maps: mapOfMaps,
          object_of_objects: objectOfObjects,
          react_element: React.createElement('span'),
          regexp: /abc/giu,
          set: setShallow,
          set_of_sets: setOfSets,
          symbol: Symbol('symbol'),
          typed_array: typedArray,
        }),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const inspectedElement = await read(id);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      {
        "anonymous_fn": Dehydrated {
          "preview_short": () => {},
          "preview_long": () => {},
        },
        "array_buffer": Dehydrated {
          "preview_short": ArrayBuffer(3),
          "preview_long": ArrayBuffer(3),
        },
        "array_of_arrays": [
          Dehydrated {
            "preview_short": Array(2),
            "preview_long": [Array(3), Array(0)],
          },
        ],
        "big_int": Dehydrated {
          "preview_short": 123n,
          "preview_long": 123n,
        },
        "bound_fn": Dehydrated {
          "preview_short": bound exampleFunction() {},
          "preview_long": bound exampleFunction() {},
        },
        "data_view": Dehydrated {
          "preview_short": DataView(3),
          "preview_long": DataView(3),
        },
        "date": Dehydrated {
          "preview_short": Thu Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time),
          "preview_long": Thu Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time),
        },
        "fn": Dehydrated {
          "preview_short": exampleFunction() {},
          "preview_long": exampleFunction() {},
        },
        "html_element": Dehydrated {
          "preview_short": <div />,
          "preview_long": <div />,
        },
        "immutable": {
          "0": Dehydrated {
            "preview_short": Array(2),
            "preview_long": ["a", List(3)],
          },
          "1": Dehydrated {
            "preview_short": Array(2),
            "preview_long": ["b", 123],
          },
          "2": Dehydrated {
            "preview_short": Array(2),
            "preview_long": ["c", Map(2)],
          },
        },
        "map": {
          "0": Dehydrated {
            "preview_short": Array(2),
            "preview_long": ["name", "Brian"],
          },
          "1": Dehydrated {
            "preview_short": Array(2),
            "preview_long": ["food", "sushi"],
          },
        },
        "map_of_maps": {
          "0": Dehydrated {
            "preview_short": Array(2),
            "preview_long": ["first", Map(2)],
          },
          "1": Dehydrated {
            "preview_short": Array(2),
            "preview_long": ["second", Map(2)],
          },
        },
        "object_of_objects": {
          "inner": Dehydrated {
            "preview_short": {…},
            "preview_long": {boolean: true, number: 123, string: "abc"},
          },
        },
        "react_element": {
          "key": null,
          "props": Dehydrated {
            "preview_short": {…},
            "preview_long": {},
          },
          "ref": null,
        },
        "regexp": Dehydrated {
          "preview_short": /abc/giu,
          "preview_long": /abc/giu,
        },
        "set": {
          "0": "abc",
          "1": 123,
        },
        "set_of_sets": {
          "0": Dehydrated {
            "preview_short": Set(3),
            "preview_long": Set(3) {"a", "b", "c"},
          },
          "1": Dehydrated {
            "preview_short": Set(3),
            "preview_long": Set(3) {1, 2, 3},
          },
        },
        "symbol": Dehydrated {
          "preview_short": Symbol(symbol),
          "preview_long": Symbol(symbol),
        },
        "typed_array": {
          "0": 100,
          "1": -100,
          "2": 0,
        },
      }
    `);
  });

  // @reactVersion >= 16.0
  it('should support objects with no prototype', async () => {
    const Example = () => null;

    const object = Object.create(null);
    object.string = 'abc';
    object.number = 123;
    object.boolean = true;

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {object}),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const inspectedElement = await read(id);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      {
        "object": {
          "boolean": true,
          "number": 123,
          "string": "abc",
        },
      }
    `);
  });

  // @reactVersion >= 16.0
  it('should support objects with overridden hasOwnProperty', async () => {
    const Example = () => null;

    const object = {
      name: 'blah',
      hasOwnProperty: true,
    };

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {object}),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const inspectedElement = await read(id);

    // TRICKY: Don't use toMatchInlineSnapshot() for this test!
    // Our snapshot serializer relies on hasOwnProperty() for feature detection.
    expect(inspectedElement.props.object.name).toBe('blah');
    expect(inspectedElement.props.object.hasOwnProperty).toBe(true);
  });

  // @reactVersion >= 16.0
  it('should not consume iterables while inspecting', async () => {
    const Example = () => null;

    function* generator() {
      yield 1;
      yield 2;
    }

    const iteratable = generator();

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {iteratable}),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const inspectedElement = await read(id);

    expect(inspectedElement).toMatchInlineSnapshot(`
      {
        "context": {},
        "events": undefined,
        "hooks": null,
        "id": 2,
        "owners": null,
        "props": {
          "iteratable": Dehydrated {
            "preview_short": Generator,
            "preview_long": Generator,
          },
        },
        "rootType": null,
        "state": null,
      }
    `);

    // Inspecting should not consume the iterable.
    expect(iteratable.next().value).toEqual(1);
    expect(iteratable.next().value).toEqual(2);
    expect(iteratable.next().value).toBeUndefined();
  });

  // @reactVersion >= 16.0
  it('should support custom objects with enumerable properties and getters', async () => {
    class CustomData {
      _number = 42;
      get number() {
        return this._number;
      }
      set number(value) {
        this._number = value;
      }
    }

    const descriptor = ((Object.getOwnPropertyDescriptor(
      CustomData.prototype,
      'number',
    ): any): PropertyDescriptor<number>);
    descriptor.enumerable = true;
    Object.defineProperty(CustomData.prototype, 'number', descriptor);

    const Example = ({data}) => null;

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {data: new CustomData()}),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const inspectedElement = await read(id);

    expect(inspectedElement).toMatchInlineSnapshot(`
      {
        "context": {},
        "events": undefined,
        "hooks": null,
        "id": 2,
        "owners": null,
        "props": {
          "data": {
            "_number": 42,
            "number": 42,
          },
        },
        "rootType": null,
        "state": null,
      }
    `);
  });

  // @reactVersion >= 16.0
  it('should support objects with inherited keys', async () => {
    const Example = () => null;

    const base = Object.create(Object.prototype, {
      enumerableStringBase: {
        value: 1,
        writable: true,
        enumerable: true,
        configurable: true,
      },
      [Symbol('enumerableSymbolBase')]: {
        value: 1,
        writable: true,
        enumerable: true,
        configurable: true,
      },
      nonEnumerableStringBase: {
        value: 1,
        writable: true,
        enumerable: false,
        configurable: true,
      },
      [Symbol('nonEnumerableSymbolBase')]: {
        value: 1,
        writable: true,
        enumerable: false,
        configurable: true,
      },
    });

    const object = Object.create(base, {
      enumerableString: {
        value: 2,
        writable: true,
        enumerable: true,
        configurable: true,
      },
      nonEnumerableString: {
        value: 3,
        writable: true,
        enumerable: false,
        configurable: true,
      },
      123: {
        value: 3,
        writable: true,
        enumerable: true,
        configurable: true,
      },
      [Symbol('nonEnumerableSymbol')]: {
        value: 2,
        writable: true,
        enumerable: false,
        configurable: true,
      },
      [Symbol('enumerableSymbol')]: {
        value: 3,
        writable: true,
        enumerable: true,
        configurable: true,
      },
    });

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {data: object}),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const inspectedElement = await read(id);

    expect(inspectedElement).toMatchInlineSnapshot(`
      {
        "context": {},
        "events": undefined,
        "hooks": null,
        "id": 2,
        "owners": null,
        "props": {
          "data": {
            "123": 3,
            "Symbol(enumerableSymbol)": 3,
            "Symbol(enumerableSymbolBase)": 1,
            "enumerableString": 2,
            "enumerableStringBase": 1,
          },
        },
        "rootType": null,
        "state": null,
      }
    `);
  });

  // @reactVersion >= 16.0
  it('should allow component prop value and value`s prototype has same name params.', async () => {
    const testData = Object.create(
      {
        a: undefined,
        b: Infinity,
        c: NaN,
        d: 'normal',
      },
      {
        a: {
          value: undefined,
          writable: true,
          enumerable: true,
          configurable: true,
        },
        b: {
          value: Infinity,
          writable: true,
          enumerable: true,
          configurable: true,
        },
        c: {
          value: NaN,
          writable: true,
          enumerable: true,
          configurable: true,
        },
        d: {
          value: 'normal',
          writable: true,
          enumerable: true,
          configurable: true,
        },
      },
    );

    const Example = ({data}) => null;
    act(() =>
      ReactDOM.render(
        React.createElement(Example, {data: testData}),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const inspectedElement = await read(id);

    expect(inspectedElement.props).toMatchInlineSnapshot(`
      {
        "data": {
          "a": undefined,
          "b": Infinity,
          "c": NaN,
          "d": "normal",
        },
      }
    `);
  });

  // @reactVersion >= 16.0
  it('should not dehydrate nested values until explicitly requested', async () => {
    const Example = () => null;

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {
          nestedObject: {
            a: {
              b: {
                c: [
                  {
                    d: {
                      e: {},
                    },
                  },
                ],
              },
            },
          },
        }),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);

    let inspectedElement = await read(id);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      {
        "nestedObject": {
          "a": Dehydrated {
            "preview_short": {…},
            "preview_long": {b: {…}},
          },
        },
      }
    `);

    inspectedElement = await read(id, ['props', 'nestedObject', 'a']);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      {
        "nestedObject": {
          "a": {
            "b": {
              "c": Dehydrated {
                "preview_short": Array(1),
                "preview_long": [{…}],
              },
            },
          },
        },
      }
    `);

    inspectedElement = await read(id, ['props', 'nestedObject', 'a', 'b', 'c']);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      {
        "nestedObject": {
          "a": {
            "b": {
              "c": [
                {
                  "d": Dehydrated {
                    "preview_short": {…},
                    "preview_long": {e: {…}},
                  },
                },
              ],
            },
          },
        },
      }
    `);

    inspectedElement = await read(id, [
      'props',
      'nestedObject',
      'a',
      'b',
      'c',
      0,
      'd',
    ]);
    expect(inspectedElement.props).toMatchInlineSnapshot(`
      {
        "nestedObject": {
          "a": {
            "b": {
              "c": [
                {
                  "d": {
                    "e": {},
                  },
                },
              ],
            },
          },
        },
      }
    `);
  });

  // @reactVersion >= 16.0
  it('should enable inspected values to be stored as global variables', () => {
    const Example = () => null;

    const nestedObject = {
      a: {
        value: 1,
        b: {
          value: 1,
          c: {
            value: 1,
          },
        },
      },
    };

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {nestedObject}),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const rendererID = ((store.getRendererIDForElement(id): any): number);

    const logSpy = jest.fn();
    jest.spyOn(console, 'log').mockImplementation(logSpy);

    // Should store the whole value (not just the hydrated parts)
    backendAPI.storeAsGlobal({
      bridge,
      id,
      path: ['props', 'nestedObject'],
      rendererID,
    });

    jest.runOnlyPendingTimers();
    expect(logSpy).toHaveBeenCalledWith('$reactTemp0');
    expect(global.$reactTemp0).toBe(nestedObject);

    logSpy.mockReset();

    // Should store the nested property specified (not just the outer value)
    backendAPI.storeAsGlobal({
      bridge,
      id,
      path: ['props', 'nestedObject', 'a', 'b'],
      rendererID,
    });

    jest.runOnlyPendingTimers();
    expect(logSpy).toHaveBeenCalledWith('$reactTemp1');
    expect(global.$reactTemp1).toBe(nestedObject.a.b);
  });

  // @reactVersion >= 16.0
  it('should enable inspected values to be copied to the clipboard', () => {
    const Example = () => null;

    const nestedObject = {
      a: {
        value: 1,
        b: {
          value: 1,
          c: {
            value: 1,
          },
        },
      },
    };

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {nestedObject}),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const rendererID = ((store.getRendererIDForElement(id): any): number);

    // Should copy the whole value (not just the hydrated parts)
    backendAPI.copyInspectedElementPath({
      bridge,
      id,
      path: ['props', 'nestedObject'],
      rendererID,
    });

    jest.runOnlyPendingTimers();
    expect(global.mockClipboardCopy).toHaveBeenCalledTimes(1);
    expect(global.mockClipboardCopy).toHaveBeenCalledWith(
      JSON.stringify(nestedObject, undefined, 2),
    );

    global.mockClipboardCopy.mockReset();

    // Should copy the nested property specified (not just the outer value)
    backendAPI.copyInspectedElementPath({
      bridge,
      id,
      path: ['props', 'nestedObject', 'a', 'b'],
      rendererID,
    });

    jest.runOnlyPendingTimers();
    expect(global.mockClipboardCopy).toHaveBeenCalledTimes(1);
    expect(global.mockClipboardCopy).toHaveBeenCalledWith(
      JSON.stringify(nestedObject.a.b, undefined, 2),
    );
  });

  // @reactVersion >= 16.0
  it('should enable complex values to be copied to the clipboard', () => {
    const Immutable = require('immutable');

    const Example = () => null;

    const set = new Set(['abc', 123]);
    const map = new Map([
      ['name', 'Brian'],
      ['food', 'sushi'],
    ]);
    const setOfSets = new Set([new Set(['a', 'b', 'c']), new Set([1, 2, 3])]);
    const mapOfMaps = new Map([
      ['first', map],
      ['second', map],
    ]);
    const typedArray = Int8Array.from([100, -100, 0]);
    const arrayBuffer = typedArray.buffer;
    const dataView = new DataView(arrayBuffer);
    const immutable = Immutable.fromJS({
      a: [{hello: 'there'}, 'fixed', true],
      b: 123,
      c: {
        '1': 'xyz',
        xyz: 1,
      },
    });
    const bigInt = BigInt(123);

    act(() =>
      ReactDOM.render(
        React.createElement(Example, {
          arrayBuffer: arrayBuffer,
          dataView: dataView,
          map: map,
          set: set,
          mapOfMaps: mapOfMaps,
          setOfSets: setOfSets,
          typedArray: typedArray,
          immutable: immutable,
          bigInt: bigInt,
        }),
        document.createElement('div'),
      ),
    );

    const id = ((store.getElementIDAtIndex(0): any): number);
    const rendererID = ((store.getRendererIDForElement(id): any): number);

    // Should copy the whole value (not just the hydrated parts)
    backendAPI.copyInspectedElementPath({
      bridge,
      id,
      path: ['props'],
      rendererID,
    });
    jest.runOnlyPendingTimers();
    // Should not error despite lots of unserialized values.

    global.mockClipboardCopy.mockReset();

    // Should copy the nested property specified (not just the outer value)
    backendAPI.copyInspectedElementPath({
      bridge,
      id,
      path: ['props', 'bigInt'],
      rendererID,
    });
    jest.runOnlyPendingTimers();
    expect(global.mockClipboardCopy).toHaveBeenCalledTimes(1);
    expect(global.mockClipboardCopy).toHaveBeenCalledWith(
      JSON.stringify('123n'),
    );

    global.mockClipboardCopy.mockReset();

    // Should copy the nested property specified (not just the outer value)
    backendAPI.copyInspectedElementPath({
      bridge,
      id,
      path: ['props', 'typedArray'],
      rendererID,
    });
    jest.runOnlyPendingTimers();
    expect(global.mockClipboardCopy).toHaveBeenCalledTimes(1);
    expect(global.mockClipboardCopy).toHaveBeenCalledWith(
      JSON.stringify({0: 100, 1: -100, 2: 0}, undefined, 2),
    );
  });
});
