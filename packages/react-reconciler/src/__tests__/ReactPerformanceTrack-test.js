/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

let React;
let ReactNoop;
let Scheduler;
let act;
let useEffect;

describe('ReactPerformanceTracks', () => {
  const performanceMeasureCalls = [];

  beforeEach(() => {
    performanceMeasureCalls.length = 0;
    Object.defineProperty(performance, 'measure', {
      value: jest.fn((measureName, reusableOptions) => {
        performanceMeasureCalls.push([
          measureName,
          {
            // React will mutate the options it passes to performance.measure.
            ...reusableOptions,
          },
        ]);
      }),
      configurable: true,
    });
    console.timeStamp = () => {};
    jest.spyOn(console, 'timeStamp').mockImplementation(() => {});

    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    useEffect = React.useEffect;
  });

  function getConsoleTimestampEntries() {
    try {
      return console.timeStamp.mock.calls.filter(call => {
        const [, startTime, endTime] = call;

        const isRegisterTrackCall = startTime !== 0.003 && endTime !== 0.003;
        return isRegisterTrackCall;
      });
    } finally {
      console.timeStamp.mockClear();
    }
  }

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('shows a hint if an update is triggered by a deeply equal object', async () => {
    const App = function App({items}) {
      Scheduler.unstable_advanceTime(10);
      useEffect(() => {}, [items]);
    };

    Scheduler.unstable_advanceTime(1);
    const items = ['one', 'two'];
    await act(() => {
      ReactNoop.render(<App items={items} />);
    });

    expect(performanceMeasureCalls).toEqual([
      [
        'Mount',
        {
          detail: {
            devtools: {
              color: 'warning',
              properties: null,
              tooltipText: 'Mount',
              track: 'Components ⚛',
            },
          },
          end: 11,
          start: 1,
        },
      ],
    ]);
    performanceMeasureCalls.length = 0;

    Scheduler.unstable_advanceTime(10);
    await act(() => {
      ReactNoop.render(<App items={items.concat('4')} />);
    });

    expect(performanceMeasureCalls).toEqual([
      [
        '​App',
        {
          detail: {
            devtools: {
              color: 'primary-dark',
              properties: [
                ['Changed Props', ''],
                ['  items', 'Array'],
                ['+   2', '…'],
              ],
              tooltipText: 'App',
              track: 'Components ⚛',
            },
          },
          end: 31,
          start: 21,
        },
      ],
    ]);
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('bails out of diffing wide arrays', async () => {
    const App = function App({items}) {
      Scheduler.unstable_advanceTime(10);
      React.useEffect(() => {}, [items]);
    };

    Scheduler.unstable_advanceTime(1);
    const items = Array.from({length: 1000}, (_, i) => i);
    await act(() => {
      ReactNoop.render(<App items={items} />);
    });

    expect(performanceMeasureCalls).toEqual([
      [
        'Mount',
        {
          detail: {
            devtools: {
              color: 'warning',
              properties: null,
              tooltipText: 'Mount',
              track: 'Components ⚛',
            },
          },
          end: 11,
          start: 1,
        },
      ],
    ]);
    performanceMeasureCalls.length = 0;

    Scheduler.unstable_advanceTime(10);
    await act(() => {
      ReactNoop.render(<App items={items.concat('-1')} />);
    });

    expect(performanceMeasureCalls).toEqual([
      [
        '​App',
        {
          detail: {
            devtools: {
              color: 'primary-dark',
              properties: [
                ['Changed Props', ''],
                ['  items', 'Array'],
                [
                  'Previous object has more than 100 properties. React will not attempt to diff objects with too many properties.',
                  '',
                ],
                [
                  'Next object has more than 100 properties. React will not attempt to diff objects with too many properties.',
                  '',
                ],
              ],
              tooltipText: 'App',
              track: 'Components ⚛',
            },
          },
          end: 31,
          start: 21,
        },
      ],
    ]);
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('does not show all properties of wide objects', async () => {
    const App = function App({items}) {
      Scheduler.unstable_advanceTime(10);
      React.useEffect(() => {}, [items]);
    };

    Scheduler.unstable_advanceTime(1);
    await act(() => {
      ReactNoop.render(<App data={{buffer: null}} />);
    });

    expect(performanceMeasureCalls).toEqual([
      [
        'Mount',
        {
          detail: {
            devtools: {
              color: 'warning',
              properties: null,
              tooltipText: 'Mount',
              track: 'Components ⚛',
            },
          },
          end: 11,
          start: 1,
        },
      ],
    ]);
    performanceMeasureCalls.length = 0;

    Scheduler.unstable_advanceTime(10);

    const bigData = new Uint8Array(1000);
    await act(() => {
      ReactNoop.render(<App data={{buffer: bigData}} />);
    });

    expect(performanceMeasureCalls).toEqual([
      [
        '​App',
        {
          detail: {
            devtools: {
              color: 'primary-dark',
              properties: [
                ['Changed Props', ''],
                ['  data', ''],
                ['-   buffer', 'null'],
                ['+   buffer', 'Uint8Array(1000)'],
              ],
              tooltipText: 'App',
              track: 'Components ⚛',
            },
          },
          end: 31,
          start: 21,
        },
      ],
    ]);
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('shows the type and length of typed arrays instead of enumerating them', async () => {
    const App = function App({buffer}) {
      Scheduler.unstable_advanceTime(10);
      React.useEffect(() => {}, [buffer]);
    };

    Scheduler.unstable_advanceTime(1);
    await act(() => {
      ReactNoop.render(<App buffer={new Uint8Array(0)} />);
    });

    expect(performanceMeasureCalls).toEqual([
      [
        'Mount',
        {
          detail: {
            devtools: {
              color: 'warning',
              properties: null,
              tooltipText: 'Mount',
              track: 'Components ⚛',
            },
          },
          end: 11,
          start: 1,
        },
      ],
    ]);
    performanceMeasureCalls.length = 0;

    Scheduler.unstable_advanceTime(10);

    // A typed array can hold millions of elements. React must not enumerate
    // them element-by-element, which would freeze rendering (issue #36200).
    await act(() => {
      ReactNoop.render(<App buffer={new Float32Array(1000)} />);
    });

    expect(performanceMeasureCalls).toEqual([
      [
        '​App',
        {
          detail: {
            devtools: {
              color: 'primary-dark',
              properties: [
                ['Changed Props', ''],
                ['-\xa0buffer', 'Uint8Array(0)'],
                ['+\xa0buffer', 'Float32Array(1000)'],
              ],
              tooltipText: 'App',
              track: 'Components ⚛',
            },
          },
          end: 31,
          start: 21,
        },
      ],
    ]);
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('includes console.timeStamp spans for Components with no prop changes', async () => {
    function Left({value}) {
      Scheduler.unstable_advanceTime(5000);
    }
    function Right() {
      Scheduler.unstable_advanceTime(10000);
    }

    await act(() => {
      ReactNoop.render(
        <>
          <Left value={1} />
          <Right />
        </>,
      );
    });

    expect(performanceMeasureCalls).toEqual([
      [
        'Mount',
        {
          detail: {
            devtools: {
              color: 'warning',
              properties: null,
              tooltipText: 'Mount',
              track: 'Components ⚛',
            },
          },
          end: 5000,
          start: 0,
        },
      ],
      [
        'Mount',
        {
          detail: {
            devtools: {
              color: 'warning',
              properties: null,
              tooltipText: 'Mount',
              track: 'Components ⚛',
            },
          },
          end: 15000,
          start: 5000,
        },
      ],
    ]);
    performanceMeasureCalls.length = 0;
    getConsoleTimestampEntries();

    Scheduler.unstable_advanceTime(1000);

    await act(() => {
      ReactNoop.render(
        <>
          <Left value={2} />
          <Right />
        </>,
      );
    });

    expect(performanceMeasureCalls).toEqual([
      [
        '​Left',
        {
          detail: {
            devtools: {
              color: 'error',
              properties: [
                ['Changed Props', ''],
                ['- value', '1'],
                ['+ value', '2'],
              ],
              tooltipText: 'Left',
              track: 'Components ⚛',
            },
          },
          end: 21000,
          start: 16000,
        },
      ],
    ]);
    expect(getConsoleTimestampEntries()).toEqual([
      ['Render', 16000, 31000, 'Blocking', 'Scheduler ⚛', 'primary-dark'],
      ['Right', 21000, 31000, 'Components ⚛', undefined, 'error'],
    ]);
    performanceMeasureCalls.length = 0;
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('can handle bigint in arrays', async () => {
    const App = function App({numbers}) {
      Scheduler.unstable_advanceTime(10);
      React.useEffect(() => {}, [numbers]);
    };

    Scheduler.unstable_advanceTime(1);
    await act(() => {
      ReactNoop.render(
        <App
          data={{
            deeply: {
              nested: {
                numbers: [1n],
              },
            },
          }}
        />,
      );
    });

    expect(performanceMeasureCalls).toEqual([
      [
        'Mount',
        {
          detail: {
            devtools: {
              color: 'warning',
              properties: null,
              tooltipText: 'Mount',
              track: 'Components ⚛',
            },
          },
          end: 11,
          start: 1,
        },
      ],
    ]);
    performanceMeasureCalls.length = 0;

    Scheduler.unstable_advanceTime(10);

    await act(() => {
      ReactNoop.render(
        <App
          data={{
            deeply: {
              nested: {
                numbers: [2n],
              },
            },
          }}
        />,
      );
    });

    expect(performanceMeasureCalls).toEqual([
      [
        '​App',
        {
          detail: {
            devtools: {
              color: 'primary-dark',
              properties: [
                ['Changed Props', ''],
                ['  data', ''],
                ['    deeply', ''],
                ['      nested', ''],
                ['-       numbers', 'Array'],
                ['+       numbers', 'Array'],
              ],
              tooltipText: 'App',
              track: 'Components ⚛',
            },
          },
          end: 31,
          start: 21,
        },
      ],
    ]);
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('diffs HTML-like objects', async () => {
    const App = function App({container}) {
      Scheduler.unstable_advanceTime(10);
      React.useEffect(() => {}, [container]);
    };

    class Window {}
    const createOpaqueOriginWindow = () => {
      return new Proxy(new Window(), {
        get(target, prop) {
          if (prop === Symbol.toStringTag) {
            return target[Symbol.toStringTag];
          }
          // Some properties are allowed if JS itself is accessign those e.g.
          // Symbol.toStringTag.
          // Just make sure React isn't accessing arbitrary properties.
          throw new Error(
            `Failed to read named property '${String(prop)}' from Window`,
          );
        },
      });
    };

    class OpaqueOriginHTMLIFrameElement {
      constructor(textContent) {
        this.textContent = textContent;
      }
      contentWindow = createOpaqueOriginWindow();
      nodeType = 1;
      [Symbol.toStringTag] = 'HTMLIFrameElement';
    }

    Scheduler.unstable_advanceTime(1);
    await act(() => {
      ReactNoop.render(
        <App
          container={new OpaqueOriginHTMLIFrameElement('foo')}
          contentWindow={createOpaqueOriginWindow()}
        />,
      );
    });

    expect(performanceMeasureCalls).toEqual([
      [
        'Mount',
        {
          detail: {
            devtools: {
              color: 'warning',
              properties: null,
              tooltipText: 'Mount',
              track: 'Components ⚛',
            },
          },
          end: 11,
          start: 1,
        },
      ],
    ]);
    performanceMeasureCalls.length = 0;

    Scheduler.unstable_advanceTime(10);

    await act(() => {
      ReactNoop.render(
        <App
          container={new OpaqueOriginHTMLIFrameElement('bar')}
          contentWindow={createOpaqueOriginWindow()}
        />,
      );
    });

    expect(performanceMeasureCalls).toEqual([
      [
        '​App',
        {
          detail: {
            devtools: {
              color: 'primary-dark',
              properties: [
                ['Changed Props', ''],
                ['- container', 'HTMLIFrameElement'],
                ['-   contentWindow', 'Window'],
                ['-   nodeType', '1'],
                ['-   textContent', '"foo"'],
                ['+ container', 'HTMLIFrameElement'],
                ['+   contentWindow', 'Window'],
                ['+   nodeType', '1'],
                ['+   textContent', '"bar"'],
                [
                  '  contentWindow',
                  'Referentially unequal but deeply equal objects. Consider memoization.',
                ],
              ],
              tooltipText: 'App',
              track: 'Components ⚛',
            },
          },
          end: 31,
          start: 21,
        },
      ],
    ]);
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('does not throw SecurityError when a cross-origin Window is passed as a prop', async () => {
    // Simulate a cross-origin Window whose property enumeration throws SecurityError,
    // as happens in browsers when a component receives an iframe.contentWindow
    // from an iframe with a null/cross origin (e.g. srcdoc="").
    const createCrossOriginWindow = () => {
      return new Proxy(
        {},
        {
          ownKeys() {
            // In browsers, `for...in` on a cross-origin Window throws SecurityError.
            // We simulate that here so the test can run in JSDOM.
            throw new Error(
              "Failed to enumerate the properties of 'Window': " +
                'cross-origin access blocked.',
            );
          },
          getOwnPropertyDescriptor(target, prop) {
            throw new Error(
              `Failed to read a named property '${String(prop)}' from 'Window': ` +
                'cross-origin access blocked.',
            );
          },
          get(target, prop) {
            if (prop === Symbol.toStringTag) {
              return 'Window';
            }
            throw new Error(
              `Failed to read a named property '${String(prop)}' from 'Window': ` +
                'cross-origin access blocked.',
            );
          },
        },
      );
    };

    const crossOriginWin = createCrossOriginWindow();

    const App = function App({win}) {
      Scheduler.unstable_advanceTime(10);
      return null;
    };

    // This should not throw SecurityError and must not corrupt the fiber tree.
    await act(() => {
      ReactNoop.render(<App win={crossOriginWin} />);
    });

    // First render: mount measure should be recorded.
    expect(performanceMeasureCalls).toEqual([
      [
        'Mount',
        {
          detail: {
            devtools: {
              color: 'warning',
              properties: null,
              tooltipText: 'Mount',
              track: 'Components ⚛',
            },
          },
          end: 10,
          start: 0,
        },
      ],
    ]);
    performanceMeasureCalls.length = 0;

    // Verify the UI remains responsive by re-rendering with a new cross-origin
    // Window instance (different reference forces React to diff the win prop).
    const crossOriginWin2 = createCrossOriginWindow();
    Scheduler.unstable_advanceTime(10);
    await act(() => {
      ReactNoop.render(<App win={crossOriginWin2} />);
    });

    // Second render: App measure should be recorded. The cross-origin Window
    // props should appear as '[CrossOriginObject]' placeholders — not throw
    // SecurityError or corrupt the fiber tree.
    expect(performanceMeasureCalls).toHaveLength(1);
    const [measureName, measureOptions] = performanceMeasureCalls[0];
    // Component-update measures are prefixed with a zero-width space (\u200b).
    expect(measureName).toBe('\u200bApp');
    expect(measureOptions.detail.devtools.tooltipText).toBe('App');
    // The cross-origin Window must degrade to '[CrossOriginObject]', not throw.
    const properties = measureOptions.detail.devtools.properties;
    expect(properties).not.toBeNull();
    const hasCrossOriginPlaceholder = properties.some(([key]) =>
      key.includes('[CrossOriginObject]'),
    );
    expect(hasCrossOriginPlaceholder).toBe(true);
  });
});
