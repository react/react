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
                ['+   buffer', 'Uint8Array'],
                ['+     0', '0'],
                ['+     1', '0'],
                ['+     2', '0'],
                ['+     3', '0'],
                ['+     4', '0'],
                ['+     5', '0'],
                ['+     6', '0'],
                ['+     7', '0'],
                ['+     8', '0'],
                ['+     9', '0'],
                ['+     10', '0'],
                ['+     11', '0'],
                ['+     12', '0'],
                ['+     13', '0'],
                ['+     14', '0'],
                ['+     15', '0'],
                ['+     16', '0'],
                ['+     17', '0'],
                ['+     18', '0'],
                ['+     19', '0'],
                ['+     20', '0'],
                ['+     21', '0'],
                ['+     22', '0'],
                ['+     23', '0'],
                ['+     24', '0'],
                ['+     25', '0'],
                ['+     26', '0'],
                ['+     27', '0'],
                ['+     28', '0'],
                ['+     29', '0'],
                ['+     30', '0'],
                ['+     31', '0'],
                ['+     32', '0'],
                ['+     33', '0'],
                ['+     34', '0'],
                ['+     35', '0'],
                ['+     36', '0'],
                ['+     37', '0'],
                ['+     38', '0'],
                ['+     39', '0'],
                ['+     40', '0'],
                ['+     41', '0'],
                ['+     42', '0'],
                ['+     43', '0'],
                ['+     44', '0'],
                ['+     45', '0'],
                ['+     46', '0'],
                ['+     47', '0'],
                ['+     48', '0'],
                ['+     49', '0'],
                ['+     50', '0'],
                ['+     51', '0'],
                ['+     52', '0'],
                ['+     53', '0'],
                ['+     54', '0'],
                ['+     55', '0'],
                ['+     56', '0'],
                ['+     57', '0'],
                ['+     58', '0'],
                ['+     59', '0'],
                ['+     60', '0'],
                ['+     61', '0'],
                ['+     62', '0'],
                ['+     63', '0'],
                ['+     64', '0'],
                ['+     65', '0'],
                ['+     66', '0'],
                ['+     67', '0'],
                ['+     68', '0'],
                ['+     69', '0'],
                ['+     70', '0'],
                ['+     71', '0'],
                ['+     72', '0'],
                ['+     73', '0'],
                ['+     74', '0'],
                ['+     75', '0'],
                ['+     76', '0'],
                ['+     77', '0'],
                ['+     78', '0'],
                ['+     79', '0'],
                ['+     80', '0'],
                ['+     81', '0'],
                ['+     82', '0'],
                ['+     83', '0'],
                ['+     84', '0'],
                ['+     85', '0'],
                ['+     86', '0'],
                ['+     87', '0'],
                ['+     88', '0'],
                ['+     89', '0'],
                ['+     90', '0'],
                ['+     91', '0'],
                ['+     92', '0'],
                ['+     93', '0'],
                ['+     94', '0'],
                ['+     95', '0'],
                ['+     96', '0'],
                ['+     97', '0'],
                ['+     98', '0'],
                ['+     99', '0'],
                [
                  '+     Only 100 properties are shown. React will not log more properties of this object.',
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
  it('does not crash on prop objects whose getters throw', async () => {
    function makeThrowingProp() {
      const o = {};
      Object.defineProperty(o, 'boom', {
        enumerable: true,
        get() {
          throw new Error('do not read');
        },
      });
      return o;
    }

    const App = function App({data}) {
      Scheduler.unstable_advanceTime(10);
      React.useEffect(() => {}, [data]);
    };

    Scheduler.unstable_advanceTime(1);
    await act(() => {
      ReactNoop.render(<App data={makeThrowingProp()} />);
    });
    performanceMeasureCalls.length = 0;

    Scheduler.unstable_advanceTime(10);
    await act(() => {
      // New prop object so the diff path walks both sides and reads `boom`.
      ReactNoop.render(<App data={makeThrowingProp()} />);
    });

    // Should not throw. The throwing getter degrades to the omitted-value
    // ellipsis instead of propagating out of the commit phase.
    expect(performanceMeasureCalls).toHaveLength(1);
    const [, options] = performanceMeasureCalls[0];
    const props = options.detail.devtools.properties;
    expect(props).not.toBeNull();
    // The diff records the change but does not throw.
    expect(props.some(([k]) => k.includes('data'))).toBe(true);
  });
});
