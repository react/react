/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

let React;
let ReactNoop;
let Scheduler;
let act;
let Suspense;
let getCacheForType;
let caches;
let seededCache;
let ErrorBoundary;
let waitForAll;
let waitFor;
let assertLog;

// TODO: These tests don't pass in persistent mode yet. Need to implement.

describe('ReactSuspenseEffectsSemantics', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    Suspense = React.Suspense;

    getCacheForType = React.unstable_getCacheForType;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    assertLog = InternalTestUtils.assertLog;

    caches = [];
    seededCache = null;

    ErrorBoundary = class extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          Scheduler.log('ErrorBoundary render: catch');
          return this.props.fallback;
        }
        Scheduler.log('ErrorBoundary render: try');
        return this.props.children;
      }
    };
  });

  function createTextCache() {
    if (seededCache !== null) {
      // Trick to seed a cache before it exists.
      // TODO: Need a built-in API to seed data before the initial render (i.e.
      // not a refresh because nothing has mounted yet).
      const cache = seededCache;
      seededCache = null;
      return cache;
    }

    const data = new Map();
    const version = caches.length + 1;
    const cache = {
      version,
      data,
      resolve(text) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'resolved',
            value: text,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'resolved';
          record.value = text;
          thenable.pings.forEach(t => t());
        }
      },
      reject(text, error) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'rejected',
            value: error,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'rejected';
          record.value = error;
          thenable.pings.forEach(t => t());
        }
      },
    };
    caches.push(cache);
    return cache;
  }

  function readText(text) {
    const textCache = getCacheForType(createTextCache);
    const record = textCache.data.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          Scheduler.log(`Suspend:${text}`);
          throw record.value;
        case 'rejected':
          Scheduler.log(`Error:${text}`);
          throw record.value;
        case 'resolved':
          return textCache.version;
      }
    } else {
      Scheduler.log(`Suspend:${text}`);

      const thenable = {
        pings: [],
        then(resolve) {
          if (newRecord.status === 'pending') {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve(newRecord.value));
          }
        },
      };

      const newRecord = {
        status: 'pending',
        value: thenable,
      };
      textCache.data.set(text, newRecord);

      throw thenable;
    }
  }

  function Text({children = null, text}) {
    Scheduler.log(`Text:${text} render`);
    React.useInsertionEffect(() => {
      Scheduler.log(`Text:${text} create insertion`);
      return () => {
        Scheduler.log(`Text:${text} destroy insertion`);
      };
    }, []);

    React.useLayoutEffect(() => {
      Scheduler.log(`Text:${text} create layout`);
      return () => {
        Scheduler.log(`Text:${text} destroy layout`);
      };
    }, []);
    React.useEffect(() => {
      Scheduler.log(`Text:${text} create passive`);
      return () => {
        Scheduler.log(`Text:${text} destroy passive`);
      };
    }, []);
    return <span prop={text}>{children}</span>;
  }

  function AsyncText({children = null, text}) {
    readText(text);
    Scheduler.log(`AsyncText:${text} render`);
    React.useLayoutEffect(() => {
      Scheduler.log(`AsyncText:${text} create layout`);
      return () => {
        Scheduler.log(`AsyncText:${text} destroy layout`);
      };
    }, []);
    React.useEffect(() => {
      Scheduler.log(`AsyncText:${text} create passive`);
      return () => {
        Scheduler.log(`AsyncText:${text} destroy passive`);
      };
    }, []);
    return <span prop={text}>{children}</span>;
  }

  function resolveMostRecentTextCache(text) {
    if (caches.length === 0) {
      throw Error('Cache does not exist.');
    } else {
      // Resolve the most recently created cache. An older cache can by
      // resolved with `caches[index].resolve(text)`.
      caches[caches.length - 1].resolve(text);
    }
  }

  const resolveText = resolveMostRecentTextCache;

  function advanceTimers(ms) {
    // Note: This advances Jest's virtual time but not React's. Use
    // ReactNoop.expire for that.
    if (typeof ms !== 'number') {
      throw new Error('Must specify ms');
    }
    jest.advanceTimersByTime(ms);
    // Wait until the end of the current tick
    // We cannot use a timer since we're faking them
    return Promise.resolve().then(() => {});
  }

  describe('when a component suspends during initial mount', () => {
    // @gate enableLegacyCache
    it('should not change behavior in concurrent mode', async () => {
      class ClassText extends React.Component {
        componentDidMount() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentDidMount`);
        }
        componentDidUpdate() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentDidUpdate`);
        }
        componentWillUnmount() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentWillUnmount`);
        }
        render() {
          const {children, text} = this.props;
          Scheduler.log(`ClassText:${text} render`);
          return <span prop={text}>{children}</span>;
        }
      }

      function App({children = null}) {
        Scheduler.log('App render');
        React.useLayoutEffect(() => {
          Scheduler.log('App create layout');
          return () => {
            Scheduler.log('App destroy layout');
          };
        }, []);
        React.useEffect(() => {
          Scheduler.log('App create passive');
          return () => {
            Scheduler.log('App destroy passive');
          };
        }, []);
        return (
          <>
            <Suspense fallback={<Text text="Fallback" />}>
              <Text text="Inside:Before" />
              {children}
              <ClassText text="Inside:After" />
            </Suspense>
            <Text text="Outside" />
          </>
        );
      }

      // Mount and suspend.
      await act(() => {
        ReactNoop.render(
          <App>
            <AsyncText text="Async" />
          </App>,
        );
      });
      assertLog([
        'App render',
        'Text:Inside:Before render',
        'Suspend:Async',
        'Text:Fallback render',
        'Text:Outside render',
        'Text:Fallback create insertion',
        'Text:Outside create insertion',
        'Text:Fallback create layout',
        'Text:Outside create layout',
        'App create layout',
        'Text:Fallback create passive',
        'Text:Outside create passive',
        'App create passive',
        // pre-warming
        'Text:Inside:Before render',
        'Suspend:Async',
        'ClassText:Inside:After render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Fallback" />
          <span prop="Outside" />
        </>,
      );

      // Resolving the suspended resource should
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'Text:Inside:Before render',
        'AsyncText:Async render',
        'ClassText:Inside:After render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'Text:Inside:Before create insertion',
        'Text:Inside:Before create layout',
        'AsyncText:Async create layout',
        'ClassText:Inside:After componentDidMount',
        'Text:Fallback destroy passive',
        'Text:Inside:Before create passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" />
          <span prop="Async" />
          <span prop="Inside:After" />
          <span prop="Outside" />
        </>,
      );

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'App destroy layout',
        'Text:Inside:Before destroy insertion',
        'Text:Inside:Before destroy layout',
        'AsyncText:Async destroy layout',
        'ClassText:Inside:After componentWillUnmount',
        'Text:Outside destroy insertion',
        'Text:Outside destroy layout',
        'App destroy passive',
        'Text:Inside:Before destroy passive',
        'AsyncText:Async destroy passive',
        'Text:Outside destroy passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    // @gate enableLegacyCache && !disableLegacyMode
    it('should not change behavior in sync', async () => {
      class ClassText extends React.Component {
        componentDidMount() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentDidMount`);
        }
        componentDidUpdate() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentDidUpdate`);
        }
        componentWillUnmount() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentWillUnmount`);
        }
        render() {
          const {children, text} = this.props;
          Scheduler.log(`ClassText:${text} render`);
          return <span prop={text}>{children}</span>;
        }
      }

      function App({children = null}) {
        Scheduler.log('App render');
        React.useLayoutEffect(() => {
          Scheduler.log('App create layout');
          return () => {
            Scheduler.log('App destroy layout');
          };
        }, []);
        React.useEffect(() => {
          Scheduler.log('App create passive');
          return () => {
            Scheduler.log('App destroy passive');
          };
        }, []);
        return (
          <>
            <Suspense fallback={<Text text="Fallback" />}>
              <Text text="Inside:Before" />
              {children}
              <ClassText text="Inside:After" />
            </Suspense>
            <Text text="Outside" />
          </>
        );
      }

      // Mount and suspend.
      await act(() => {
        ReactNoop.renderLegacySyncRoot(
          <App>
            <AsyncText text="Async" />
          </App>,
        );
      });
      assertLog([
        'App render',
        'Text:Inside:Before render',
        'Suspend:Async',
        'ClassText:Inside:After render',
        'Text:Fallback render',
        'Text:Outside render',
        'Text:Inside:Before create insertion',
        'Text:Fallback create insertion',
        'Text:Outside create insertion',
        'Text:Inside:Before create layout',
        'ClassText:Inside:After componentDidMount',
        'Text:Fallback create layout',
        'Text:Outside create layout',
        'App create layout',
        'Text:Inside:Before create passive',
        'Text:Fallback create passive',
        'Text:Outside create passive',
        'App create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" hidden={true} />
          <span prop="Inside:After" hidden={true} />
          <span prop="Fallback" />
          <span prop="Outside" />
        </>,
      );

      // Resolving the suspended resource should
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'AsyncText:Async render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'AsyncText:Async create layout',
        'Text:Fallback destroy passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" />
          <span prop="Async" />
          <span prop="Inside:After" />
          <span prop="Outside" />
        </>,
      );

      await act(() => {
        ReactNoop.renderLegacySyncRoot(null);
      });
      assertLog([
        'App destroy layout',
        'Text:Inside:Before destroy insertion',
        'Text:Inside:Before destroy layout',
        'AsyncText:Async destroy layout',
        'ClassText:Inside:After componentWillUnmount',
        'Text:Outside destroy insertion',
        'Text:Outside destroy layout',
        'App destroy passive',
        'Text:Inside:Before destroy passive',
        'AsyncText:Async destroy passive',
        'Text:Outside destroy passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });
  });

  describe('effects within a tree that re-suspends in an update', () => {
    // @gate enableLegacyCache && !disableLegacyMode
    it('should not be destroyed or recreated in legacy roots', async () => {
      function App({children = null}) {
        Scheduler.log('App render');
        React.useLayoutEffect(() => {
          Scheduler.log('App create layout');
          return () => {
            Scheduler.log('App destroy layout');
          };
        }, []);
        React.useEffect(() => {
          Scheduler.log('App create passive');
          return () => {
            Scheduler.log('App destroy passive');
          };
        }, []);
        return (
          <>
            <Suspense fallback={<Text text="Fallback" />}>
              <Text text="Inside:Before" />
              {children}
              <Text text="Inside:After" />
            </Suspense>
            <Text text="Outside" />
          </>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.renderLegacySyncRoot(<App />);
      });
      assertLog([
        'App render',
        'Text:Inside:Before render',
        'Text:Inside:After render',
        'Text:Outside render',
        'Text:Inside:Before create insertion',
        'Text:Inside:After create insertion',
        'Text:Outside create insertion',
        'Text:Inside:Before create layout',
        'Text:Inside:After create layout',
        'Text:Outside create layout',
        'App create layout',
        'Text:Inside:Before create passive',
        'Text:Inside:After create passive',
        'Text:Outside create passive',
        'App create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" />
          <span prop="Inside:After" />
          <span prop="Outside" />
        </>,
      );

      // Schedule an update that causes React to suspend.
      await act(() => {
        ReactNoop.renderLegacySyncRoot(
          <App>
            <AsyncText text="Async" />
          </App>,
        );
      });
      assertLog([
        'App render',
        'Text:Inside:Before render',
        'Suspend:Async',
        'Text:Inside:After render',
        'Text:Fallback render',
        'Text:Outside render',
        'Text:Fallback create insertion',
        'Text:Fallback create layout',
        'Text:Fallback create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" hidden={true} />
          <span prop="Inside:After" hidden={true} />
          <span prop="Fallback" />
          <span prop="Outside" />
        </>,
      );

      await advanceTimers(1000);

      // Noop since sync root has already committed
      assertLog([]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" hidden={true} />
          <span prop="Inside:After" hidden={true} />
          <span prop="Fallback" />
          <span prop="Outside" />
        </>,
      );

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'AsyncText:Async render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'AsyncText:Async create layout',
        'Text:Fallback destroy passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" />
          <span prop="Async" />
          <span prop="Inside:After" />
          <span prop="Outside" />
        </>,
      );

      await act(() => {
        ReactNoop.renderLegacySyncRoot(null);
      });
      assertLog([
        'App destroy layout',
        'Text:Inside:Before destroy insertion',
        'Text:Inside:Before destroy layout',
        'AsyncText:Async destroy layout',
        'Text:Inside:After destroy insertion',
        'Text:Inside:After destroy layout',
        'Text:Outside destroy insertion',
        'Text:Outside destroy layout',
        'App destroy passive',
        'Text:Inside:Before destroy passive',
        'AsyncText:Async destroy passive',
        'Text:Inside:After destroy passive',
        'Text:Outside destroy passive',
      ]);
    });

    // @gate enableLegacyCache
    it('should be destroyed and recreated for function components', async () => {
      function App({children = null}) {
        Scheduler.log('App render');
        React.useLayoutEffect(() => {
          Scheduler.log('App create layout');
          return () => {
            Scheduler.log('App destroy layout');
          };
        }, []);
        React.useEffect(() => {
          Scheduler.log('App create passive');
          return () => {
            Scheduler.log('App destroy passive');
          };
        }, []);
        return (
          <>
            <Suspense fallback={<Text text="Fallback" />}>
              <Text text="Inside:Before" />
              {children}
              <Text text="Inside:After" />
            </Suspense>
            <Text text="Outside" />
          </>
        );
      }

      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'App render',
        'Text:Inside:Before render',
        'Text:Inside:After render',
        'Text:Outside render',
        'Text:Inside:Before create insertion',
        'Text:Inside:After create insertion',
        'Text:Outside create insertion',
        'Text:Inside:Before create layout',
        'Text:Inside:After create layout',
        'Text:Outside create layout',
        'App create layout',
        'Text:Inside:Before create passive',
        'Text:Inside:After create passive',
        'Text:Outside create passive',
        'App create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" />
          <span prop="Inside:After" />
          <span prop="Outside" />
        </>,
      );

      // Schedule an update that causes React to suspend.
      await act(async () => {
        ReactNoop.render(
          <App>
            <AsyncText text="Async" />
          </App>,
        );
        await waitFor([
          'App render',
          'Text:Inside:Before render',
          'Suspend:Async',
          'Text:Fallback render',
          'Text:Outside render',
          'Text:Inside:Before destroy layout',
          'Text:Inside:After destroy layout',
          'Text:Fallback create insertion',
          'Text:Fallback create layout',
        ]);
        await waitForAll([
          'Text:Fallback create passive',
          // pre-warming
          'Text:Inside:Before render',
          'Suspend:Async',
          'Text:Inside:After render',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Inside:Before" hidden={true} />
            <span prop="Inside:After" hidden={true} />
            <span prop="Fallback" />
            <span prop="Outside" />
          </>,
        );
      });

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'Text:Inside:Before render',
        'AsyncText:Async render',
        'Text:Inside:After render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'Text:Inside:Before create layout',
        'AsyncText:Async create layout',
        'Text:Inside:After create layout',
        'Text:Fallback destroy passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" />
          <span prop="Async" />
          <span prop="Inside:After" />
          <span prop="Outside" />
        </>,
      );

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'App destroy layout',
        'Text:Inside:Before destroy insertion',
        'Text:Inside:Before destroy layout',
        'AsyncText:Async destroy layout',
        'Text:Inside:After destroy insertion',
        'Text:Inside:After destroy layout',
        'Text:Outside destroy insertion',
        'Text:Outside destroy layout',
        'App destroy passive',
        'Text:Inside:Before destroy passive',
        'AsyncText:Async destroy passive',
        'Text:Inside:After destroy passive',
        'Text:Outside destroy passive',
      ]);
    });

    // @gate enableLegacyCache
    it('should be destroyed and recreated for class components', async () => {
      class ClassText extends React.Component {
        componentDidMount() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentDidMount`);
        }
        componentDidUpdate() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentDidUpdate`);
        }
        componentWillUnmount() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentWillUnmount`);
        }
        render() {
          const {children, text} = this.props;
          Scheduler.log(`ClassText:${text} render`);
          return <span prop={text}>{children}</span>;
        }
      }

      function App({children = null}) {
        Scheduler.log('App render');
        React.useLayoutEffect(() => {
          Scheduler.log('App create layout');
          return () => {
            Scheduler.log('App destroy layout');
          };
        }, []);
        React.useEffect(() => {
          Scheduler.log('App create passive');
          return () => {
            Scheduler.log('App destroy passive');
          };
        }, []);
        return (
          <>
            <Suspense fallback={<ClassText text="Fallback" />}>
              <ClassText text="Inside:Before" />
              {children}
              <ClassText text="Inside:After" />
            </Suspense>
            <ClassText text="Outside" />
          </>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'App render',
        'ClassText:Inside:Before render',
        'ClassText:Inside:After render',
        'ClassText:Outside render',
        'ClassText:Inside:Before componentDidMount',
        'ClassText:Inside:After componentDidMount',
        'ClassText:Outside componentDidMount',
        'App create layout',
        'App create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" />
          <span prop="Inside:After" />
          <span prop="Outside" />
        </>,
      );

      // Schedule an update that causes React to suspend.
      await act(async () => {
        ReactNoop.render(
          <App>
            <AsyncText text="Async" />
          </App>,
        );

        await waitFor([
          'App render',
          'ClassText:Inside:Before render',
          'Suspend:Async',
          'ClassText:Fallback render',
          'ClassText:Outside render',
          'ClassText:Inside:Before componentWillUnmount',
          'ClassText:Inside:After componentWillUnmount',
          'ClassText:Fallback componentDidMount',
          'ClassText:Outside componentDidUpdate',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Inside:Before" hidden={true} />
            <span prop="Inside:After" hidden={true} />
            <span prop="Fallback" />
            <span prop="Outside" />
          </>,
        );
      });
      // pre-warming
      assertLog([
        'ClassText:Inside:Before render',
        'Suspend:Async',
        'ClassText:Inside:After render',
      ]);

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'ClassText:Inside:Before render',
        'AsyncText:Async render',
        'ClassText:Inside:After render',
        'ClassText:Fallback componentWillUnmount',
        'ClassText:Inside:Before componentDidMount',
        'AsyncText:Async create layout',
        'ClassText:Inside:After componentDidMount',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside:Before" />
          <span prop="Async" />
          <span prop="Inside:After" />
          <span prop="Outside" />
        </>,
      );
      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'App destroy layout',
        'ClassText:Inside:Before componentWillUnmount',
        'AsyncText:Async destroy layout',
        'ClassText:Inside:After componentWillUnmount',
        'ClassText:Outside componentWillUnmount',
        'App destroy passive',
        'AsyncText:Async destroy passive',
      ]);
    });

    // @gate enableLegacyCache
    it('should be destroyed and recreated when nested below host components', async () => {
      function App({children = null}) {
        Scheduler.log('App render');
        React.useLayoutEffect(() => {
          Scheduler.log('App create layout');
          return () => {
            Scheduler.log('App destroy layout');
          };
        }, []);
        React.useEffect(() => {
          Scheduler.log('App create passive');
          return () => {
            Scheduler.log('App destroy passive');
          };
        }, []);
        return (
          <Suspense fallback={<Text text="Fallback" />}>
            {children}
            <Text text="Outer">
              <Text text="Inner" />
            </Text>
          </Suspense>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'App render',
        'Text:Outer render',
        'Text:Inner render',
        'Text:Inner create insertion',
        'Text:Outer create insertion',
        'Text:Inner create layout',
        'Text:Outer create layout',
        'App create layout',
        'Text:Inner create passive',
        'Text:Outer create passive',
        'App create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="Outer">
          <span prop="Inner" />
        </span>,
      );

      // Schedule an update that causes React to suspend.
      await act(async () => {
        ReactNoop.render(
          <App>
            <AsyncText text="Async" />
          </App>,
        );
        await waitFor([
          'App render',
          'Suspend:Async',
          'Text:Fallback render',
          'Text:Outer destroy layout',
          'Text:Inner destroy layout',
          'Text:Fallback create insertion',
          'Text:Fallback create layout',
        ]);
        await waitForAll([
          'Text:Fallback create passive',
          // pre-warming
          'Suspend:Async',
          'Text:Outer render',
          'Text:Inner render',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span hidden={true} prop="Outer">
              <span prop="Inner" />
            </span>
            <span prop="Fallback" />
          </>,
        );
      });

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'AsyncText:Async render',
        'Text:Outer render',
        'Text:Inner render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'AsyncText:Async create layout',
        'Text:Inner create layout',
        'Text:Outer create layout',
        'Text:Fallback destroy passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Async" />
          <span prop="Outer">
            <span prop="Inner" />
          </span>
        </>,
      );

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'App destroy layout',
        'AsyncText:Async destroy layout',
        'Text:Outer destroy insertion',
        'Text:Outer destroy layout',
        'Text:Inner destroy insertion',
        'Text:Inner destroy layout',
        'App destroy passive',
        'AsyncText:Async destroy passive',
        'Text:Outer destroy passive',
        'Text:Inner destroy passive',
      ]);
    });

    // @gate enableLegacyCache
    it('should be destroyed and recreated even if there is a bailout because of memoization', async () => {
      const MemoizedText = React.memo(Text, () => true);

      function App({children = null}) {
        Scheduler.log('App render');
        React.useLayoutEffect(() => {
          Scheduler.log('App create layout');
          return () => {
            Scheduler.log('App destroy layout');
          };
        }, []);
        React.useEffect(() => {
          Scheduler.log('App create passive');
          return () => {
            Scheduler.log('App destroy passive');
          };
        }, []);
        return (
          <Suspense fallback={<Text text="Fallback" />}>
            {children}
            <Text text="Outer">
              <MemoizedText text="MemoizedInner" />
            </Text>
          </Suspense>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'App render',
        'Text:Outer render',
        'Text:MemoizedInner render',
        'Text:MemoizedInner create insertion',
        'Text:Outer create insertion',
        'Text:MemoizedInner create layout',
        'Text:Outer create layout',
        'App create layout',
        'Text:MemoizedInner create passive',
        'Text:Outer create passive',
        'App create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="Outer">
          <span prop="MemoizedInner" />
        </span>,
      );

      // Schedule an update that causes React to suspend.
      await act(async () => {
        ReactNoop.render(
          <App>
            <AsyncText text="Async" />
          </App>,
        );
        await waitFor([
          'App render',
          'Suspend:Async',
          // Text:MemoizedInner is memoized
          'Text:Fallback render',
          'Text:Outer destroy layout',
          'Text:MemoizedInner destroy layout',
          'Text:Fallback create insertion',
          'Text:Fallback create layout',
        ]);
        await waitForAll([
          'Text:Fallback create passive',
          // pre-warming
          'Suspend:Async',
          'Text:Outer render',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span hidden={true} prop="Outer">
              <span prop="MemoizedInner" />
            </span>
            <span prop="Fallback" />
          </>,
        );
      });

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'AsyncText:Async render',
        'Text:Outer render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'AsyncText:Async create layout',
        'Text:MemoizedInner create layout',
        'Text:Outer create layout',
        'Text:Fallback destroy passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Async" />
          <span prop="Outer">
            <span prop="MemoizedInner" />
          </span>
        </>,
      );

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'App destroy layout',
        'AsyncText:Async destroy layout',
        'Text:Outer destroy insertion',
        'Text:Outer destroy layout',
        'Text:MemoizedInner destroy insertion',
        'Text:MemoizedInner destroy layout',
        'App destroy passive',
        'AsyncText:Async destroy passive',
        'Text:Outer destroy passive',
        'Text:MemoizedInner destroy passive',
      ]);
    });

    // @gate enableLegacyCache
    it('should respect nested suspense boundaries', async () => {
      function App({innerChildren = null, outerChildren = null}) {
        return (
          <Suspense fallback={<Text text="OuterFallback" />}>
            <Text text="Outer" />
            {outerChildren}
            <Suspense fallback={<Text text="InnerFallback" />}>
              <Text text="Inner" />
              {innerChildren}
            </Suspense>
          </Suspense>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'Text:Outer render',
        'Text:Inner render',
        'Text:Outer create insertion',
        'Text:Inner create insertion',
        'Text:Outer create layout',
        'Text:Inner create layout',
        'Text:Outer create passive',
        'Text:Inner create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" />
          <span prop="Inner" />
        </>,
      );

      // Suspend the inner Suspense subtree (only inner effects should be destroyed)
      await act(() => {
        ReactNoop.render(
          <App innerChildren={<AsyncText text="InnerAsync_1" />} />,
        );
      });
      assertLog([
        'Text:Outer render',
        'Text:Inner render',
        'Suspend:InnerAsync_1',
        'Text:InnerFallback render',
        'Text:Inner destroy layout',
        'Text:InnerFallback create insertion',
        'Text:InnerFallback create layout',
        'Text:InnerFallback create passive',
        // pre-warming
        'Text:Inner render',
        'Suspend:InnerAsync_1',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" />
          <span prop="Inner" hidden={true} />
          <span prop="InnerFallback" />
        </>,
      );

      // Suspend the outer Suspense subtree (outer effects and inner fallback effects should be destroyed)
      // (This check also ensures we don't destroy effects for mounted inner fallback.)
      await act(() => {
        ReactNoop.render(
          <App
            outerChildren={<AsyncText text="OuterAsync_1" />}
            innerChildren={<AsyncText text="InnerAsync_1" />}
          />,
        );
      });
      await advanceTimers(1000);
      assertLog([
        'Text:Outer render',
        'Suspend:OuterAsync_1',
        'Text:OuterFallback render',
        'Text:Outer destroy layout',
        'Text:InnerFallback destroy layout',
        'Text:OuterFallback create insertion',
        'Text:OuterFallback create layout',
        'Text:OuterFallback create passive',
        // pre-warming
        'Text:Outer render',
        'Suspend:OuterAsync_1',
        'Text:Inner render',
        'Suspend:InnerAsync_1',
        'Text:InnerFallback render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" hidden={true} />
          <span prop="Inner" hidden={true} />
          <span prop="InnerFallback" hidden={true} />
          <span prop="OuterFallback" />
        </>,
      );

      // Show the inner Suspense subtree (no effects should be recreated)
      await act(async () => {
        await resolveText('InnerAsync_1');
      });
      assertLog([
        'Text:Outer render',
        'Suspend:OuterAsync_1',
        // pre-warming
        'Text:Outer render',
        'Suspend:OuterAsync_1',
        'Text:Inner render',
        'AsyncText:InnerAsync_1 render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" hidden={true} />
          <span prop="Inner" hidden={true} />
          <span prop="InnerFallback" hidden={true} />
          <span prop="OuterFallback" />
        </>,
      );

      // Suspend the inner Suspense subtree (no effects should be destroyed)
      await act(() => {
        ReactNoop.render(
          <App
            outerChildren={<AsyncText text="OuterAsync_1" />}
            innerChildren={<AsyncText text="InnerAsync_2" />}
          />,
        );
      });
      await advanceTimers(1000);
      assertLog([
        'Text:Outer render',
        'Suspend:OuterAsync_1',
        'Text:OuterFallback render',
        // pre-warming
        'Text:Outer render',
        'Suspend:OuterAsync_1',
        'Text:Inner render',
        'Suspend:InnerAsync_2',
        'Text:InnerFallback render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" hidden={true} />
          <span prop="Inner" hidden={true} />
          <span prop="InnerFallback" hidden={true} />
          <span prop="OuterFallback" />
        </>,
      );

      // Show the outer Suspense subtree (only outer effects should be recreated)
      await act(async () => {
        await resolveText('OuterAsync_1');
      });
      assertLog([
        'Text:Outer render',
        'AsyncText:OuterAsync_1 render',
        'Text:Inner render',
        'Suspend:InnerAsync_2',
        'Text:InnerFallback render',
        'Text:OuterFallback destroy insertion',
        'Text:OuterFallback destroy layout',
        'Text:Outer create layout',
        'AsyncText:OuterAsync_1 create layout',
        'Text:InnerFallback create layout',
        'Text:OuterFallback destroy passive',
        'AsyncText:OuterAsync_1 create passive',
        // pre-warming
        'Text:Inner render',
        'Suspend:InnerAsync_2',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" />
          <span prop="OuterAsync_1" />
          <span prop="Inner" hidden={true} />
          <span prop="InnerFallback" />
        </>,
      );

      // Show the inner Suspense subtree (only inner effects should be recreated)
      await act(async () => {
        await resolveText('InnerAsync_2');
      });
      assertLog([
        'Text:Inner render',
        'AsyncText:InnerAsync_2 render',
        'Text:InnerFallback destroy insertion',
        'Text:InnerFallback destroy layout',
        'Text:Inner create layout',
        'AsyncText:InnerAsync_2 create layout',
        'Text:InnerFallback destroy passive',
        'AsyncText:InnerAsync_2 create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" />
          <span prop="OuterAsync_1" />
          <span prop="Inner" />
          <span prop="InnerAsync_2" />
        </>,
      );

      // Suspend the outer Suspense subtree (all effects should be destroyed)
      await act(() => {
        ReactNoop.render(
          <App
            outerChildren={<AsyncText text="OuterAsync_2" />}
            innerChildren={<AsyncText text="InnerAsync_2" />}
          />,
        );
      });
      assertLog([
        'Text:Outer render',
        'Suspend:OuterAsync_2',
        'Text:OuterFallback render',
        'Text:Outer destroy layout',
        'AsyncText:OuterAsync_1 destroy layout',
        'Text:Inner destroy layout',
        'AsyncText:InnerAsync_2 destroy layout',
        'Text:OuterFallback create insertion',
        'Text:OuterFallback create layout',
        'Text:OuterFallback create passive',
        // pre-warming
        'Text:Outer render',
        'Suspend:OuterAsync_2',
        'Text:Inner render',
        'AsyncText:InnerAsync_2 render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" hidden={true} />
          <span prop="OuterAsync_1" hidden={true} />
          <span prop="Inner" hidden={true} />
          <span prop="InnerAsync_2" hidden={true} />
          <span prop="OuterFallback" />
        </>,
      );

      // Show the outer Suspense subtree (all effects should be recreated)
      await act(async () => {
        await resolveText('OuterAsync_2');
      });
      assertLog([
        'Text:Outer render',
        'AsyncText:OuterAsync_2 render',
        'Text:Inner render',
        'AsyncText:InnerAsync_2 render',
        'Text:OuterFallback destroy insertion',
        'Text:OuterFallback destroy layout',
        'Text:Outer create layout',
        'AsyncText:OuterAsync_2 create layout',
        'Text:Inner create layout',
        'AsyncText:InnerAsync_2 create layout',
        'Text:OuterFallback destroy passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" />
          <span prop="OuterAsync_2" />
          <span prop="Inner" />
          <span prop="InnerAsync_2" />
        </>,
      );
    });

    // @gate enableLegacyCache
    it('should wait to reveal an inner child when inner one reveals first', async () => {
      function App({outerChildren, innerChildren}) {
        return (
          <Suspense fallback={<Text text="OuterFallback" />} name="Outer">
            <Suspense fallback={<Text text="InnerFallback" />} name="Inner">
              <div>{innerChildren}</div>
            </Suspense>
            {outerChildren}
          </Suspense>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([]);
      expect(ReactNoop).toMatchRenderedOutput(<div />);

      // Resuspend inner boundary
      await act(() => {
        ReactNoop.render(
          <App
            outerChildren={null}
            innerChildren={<AsyncText text="InnerAsync" />}
          />,
        );
      });
      assertLog([
        'Suspend:InnerAsync',
        'Text:InnerFallback render',
        'Text:InnerFallback create insertion',
        'Text:InnerFallback create layout',
        'Text:InnerFallback create passive',
        'Suspend:InnerAsync',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <div hidden={true} />
          <span prop="InnerFallback" />
        </>,
      );

      // Resuspend both boundaries
      await act(() => {
        ReactNoop.render(
          <App
            outerChildren={<AsyncText text="OuterAsync" />}
            innerChildren={<AsyncText text="InnerAsync" />}
          />,
        );
      });
      assertLog([
        'Suspend:InnerAsync',
        'Text:InnerFallback render',
        'Suspend:OuterAsync',
        'Text:OuterFallback render',
        'Text:InnerFallback destroy layout',
        'Text:OuterFallback create insertion',
        'Text:OuterFallback create layout',
        'Text:OuterFallback create passive',
        'Suspend:InnerAsync',
        'Text:InnerFallback render',
        'Suspend:OuterAsync',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <div hidden={true} />
          <span prop="InnerFallback" hidden={true} />
          <span prop="OuterFallback" />
        </>,
      );

      // Unsuspend the inner Suspense subtree only
      // Interestingly, this never commits because the tree is left suspended.
      // If it did commit, it would potentially cause the div to incorrectly reappear.
      await act(() => {
        ReactNoop.render(
          <App
            outerChildren={<AsyncText text="OuterAsync" />}
            innerChildren={null}
          />,
        );
      });
      assertLog([
        'Suspend:OuterAsync',
        'Text:OuterFallback render',
        'Suspend:OuterAsync',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <div hidden={true} />
          <span prop="InnerFallback" hidden={true} />
          <span prop="OuterFallback" />
        </>,
      );
    });

    // @gate enableLegacyCache
    it('should show nested host nodes if multiple boundaries resolve at the same time', async () => {
      function App({innerChildren = null, outerChildren = null}) {
        return (
          <Suspense fallback={<Text text="OuterFallback" />}>
            <Text text="Outer" />
            {outerChildren}
            <Suspense fallback={<Text text="InnerFallback" />}>
              <Text text="Inner" />
              {innerChildren}
            </Suspense>
          </Suspense>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'Text:Outer render',
        'Text:Inner render',
        'Text:Outer create insertion',
        'Text:Inner create insertion',
        'Text:Outer create layout',
        'Text:Inner create layout',
        'Text:Outer create passive',
        'Text:Inner create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" />
          <span prop="Inner" />
        </>,
      );

      // Suspend the inner Suspense subtree (only inner effects should be destroyed)
      await act(() => {
        ReactNoop.render(
          <App innerChildren={<AsyncText text="InnerAsync_1" />} />,
        );
      });
      assertLog([
        'Text:Outer render',
        'Text:Inner render',
        'Suspend:InnerAsync_1',
        'Text:InnerFallback render',
        'Text:Inner destroy layout',
        'Text:InnerFallback create insertion',
        'Text:InnerFallback create layout',
        'Text:InnerFallback create passive',
        // pre-warming
        'Text:Inner render',
        'Suspend:InnerAsync_1',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" />
          <span prop="Inner" hidden={true} />
          <span prop="InnerFallback" />
        </>,
      );

      // Suspend the outer Suspense subtree (outer effects and inner fallback effects should be destroyed)
      // (This check also ensures we don't destroy effects for mounted inner fallback.)
      await act(() => {
        ReactNoop.render(
          <App
            outerChildren={<AsyncText text="OuterAsync_1" />}
            innerChildren={<AsyncText text="InnerAsync_1" />}
          />,
        );
      });
      assertLog([
        'Text:Outer render',
        'Suspend:OuterAsync_1',
        'Text:OuterFallback render',
        'Text:Outer destroy layout',
        'Text:InnerFallback destroy layout',
        'Text:OuterFallback create insertion',
        'Text:OuterFallback create layout',
        'Text:OuterFallback create passive',
        // pre-warming
        'Text:Outer render',
        'Suspend:OuterAsync_1',
        'Text:Inner render',
        'Suspend:InnerAsync_1',
        'Text:InnerFallback render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" hidden={true} />
          <span prop="Inner" hidden={true} />
          <span prop="InnerFallback" hidden={true} />
          <span prop="OuterFallback" />
        </>,
      );

      // Resolve both suspended trees.
      await act(async () => {
        await resolveText('OuterAsync_1');
        await resolveText('InnerAsync_1');
      });
      assertLog([
        'Text:Outer render',
        'AsyncText:OuterAsync_1 render',
        'Text:Inner render',
        'AsyncText:InnerAsync_1 render',
        'Text:OuterFallback destroy insertion',
        'Text:OuterFallback destroy layout',
        'Text:InnerFallback destroy insertion',
        'Text:Outer create layout',
        'AsyncText:OuterAsync_1 create layout',
        'Text:Inner create layout',
        'AsyncText:InnerAsync_1 create layout',
        'Text:OuterFallback destroy passive',
        'Text:InnerFallback destroy passive',
        'AsyncText:OuterAsync_1 create passive',
        'AsyncText:InnerAsync_1 create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Outer" />
          <span prop="OuterAsync_1" />
          <span prop="Inner" />
          <span prop="InnerAsync_1" />
        </>,
      );
    });

    // @gate enableLegacyCache
    it('should be cleaned up inside of a fallback that suspends', async () => {
      function App({fallbackChildren = null, outerChildren = null}) {
        return (
          <>
            <Suspense
              fallback={
                <>
                  <Suspense fallback={<Text text="Fallback:Fallback" />}>
                    <Text text="Fallback:Inside" />
                    {fallbackChildren}
                  </Suspense>
                  <Text text="Fallback:Outside" />
                </>
              }>
              <Text text="Inside" />
              {outerChildren}
            </Suspense>
            <Text text="Outside" />
          </>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'Text:Inside render',
        'Text:Outside render',
        'Text:Inside create insertion',
        'Text:Outside create insertion',
        'Text:Inside create layout',
        'Text:Outside create layout',
        'Text:Inside create passive',
        'Text:Outside create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside" />
          <span prop="Outside" />
        </>,
      );

      // Suspend the outer shell
      await act(async () => {
        ReactNoop.render(
          <App outerChildren={<AsyncText text="OutsideAsync" />} />,
        );
        await waitFor([
          'Text:Inside render',
          'Suspend:OutsideAsync',
          'Text:Fallback:Inside render',
          'Text:Fallback:Outside render',
          'Text:Outside render',
          'Text:Inside destroy layout',
          'Text:Fallback:Inside create insertion',
          'Text:Fallback:Outside create insertion',
          'Text:Fallback:Inside create layout',
          'Text:Fallback:Outside create layout',
        ]);
        await waitForAll([
          'Text:Fallback:Inside create passive',
          'Text:Fallback:Outside create passive',
          // pre-warming
          'Text:Inside render',
          'Suspend:OutsideAsync',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Inside" hidden={true} />
            <span prop="Fallback:Inside" />
            <span prop="Fallback:Outside" />
            <span prop="Outside" />
          </>,
        );
      });

      // Suspend the fallback and verify that it's effects get cleaned up as well
      await act(async () => {
        ReactNoop.render(
          <App
            fallbackChildren={<AsyncText text="FallbackAsync" />}
            outerChildren={<AsyncText text="OutsideAsync" />}
          />,
        );
        await waitFor([
          'Text:Inside render',
          'Suspend:OutsideAsync',
          'Text:Fallback:Inside render',
          'Suspend:FallbackAsync',
          'Text:Fallback:Fallback render',
          'Text:Fallback:Outside render',
          'Text:Outside render',
          'Text:Fallback:Inside destroy layout',
          'Text:Fallback:Fallback create insertion',
          'Text:Fallback:Fallback create layout',
        ]);
        await waitForAll([
          'Text:Fallback:Fallback create passive',
          // pre-warming
          'Text:Inside render',
          'Suspend:OutsideAsync',
          'Text:Fallback:Inside render',
          'Suspend:FallbackAsync',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Inside" hidden={true} />
            <span prop="Fallback:Inside" hidden={true} />
            <span prop="Fallback:Fallback" />
            <span prop="Fallback:Outside" />
            <span prop="Outside" />
          </>,
        );
      });

      // Resolving both resources should cleanup fallback effects and recreate main effects
      await act(async () => {
        await resolveText('FallbackAsync');
        await resolveText('OutsideAsync');
      });
      assertLog([
        'Text:Inside render',
        'AsyncText:OutsideAsync render',
        'Text:Fallback:Inside destroy insertion',
        'Text:Fallback:Fallback destroy insertion',
        'Text:Fallback:Fallback destroy layout',
        'Text:Fallback:Outside destroy insertion',
        'Text:Fallback:Outside destroy layout',
        'Text:Inside create layout',
        'AsyncText:OutsideAsync create layout',
        'Text:Fallback:Inside destroy passive',
        'Text:Fallback:Fallback destroy passive',
        'Text:Fallback:Outside destroy passive',
        'AsyncText:OutsideAsync create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside" />
          <span prop="OutsideAsync" />
          <span prop="Outside" />
        </>,
      );
    });

    // @gate enableLegacyCache
    it('should be cleaned up inside of a fallback that suspends (alternate)', async () => {
      function App({fallbackChildren = null, outerChildren = null}) {
        return (
          <>
            <Suspense
              fallback={
                <>
                  <Suspense fallback={<Text text="Fallback:Fallback" />}>
                    <Text text="Fallback:Inside" />
                    {fallbackChildren}
                  </Suspense>
                  <Text text="Fallback:Outside" />
                </>
              }>
              <Text text="Inside" />
              {outerChildren}
            </Suspense>
            <Text text="Outside" />
          </>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'Text:Inside render',
        'Text:Outside render',
        'Text:Inside create insertion',
        'Text:Outside create insertion',
        'Text:Inside create layout',
        'Text:Outside create layout',
        'Text:Inside create passive',
        'Text:Outside create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside" />
          <span prop="Outside" />
        </>,
      );

      // Suspend both the outer boundary and the fallback
      await act(() => {
        ReactNoop.render(
          <App
            outerChildren={<AsyncText text="OutsideAsync" />}
            fallbackChildren={<AsyncText text="FallbackAsync" />}
          />,
        );
      });
      assertLog([
        'Text:Inside render',
        'Suspend:OutsideAsync',
        'Text:Fallback:Inside render',
        'Suspend:FallbackAsync',
        'Text:Fallback:Fallback render',
        'Text:Fallback:Outside render',
        'Text:Outside render',
        'Text:Inside destroy layout',
        'Text:Fallback:Fallback create insertion',
        'Text:Fallback:Outside create insertion',
        'Text:Fallback:Fallback create layout',
        'Text:Fallback:Outside create layout',
        'Text:Fallback:Fallback create passive',
        'Text:Fallback:Outside create passive',
        // pre-warming
        'Text:Inside render',
        'Suspend:OutsideAsync',
        'Text:Fallback:Inside render',
        'Suspend:FallbackAsync',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside" hidden={true} />
          <span prop="Fallback:Fallback" />
          <span prop="Fallback:Outside" />
          <span prop="Outside" />
        </>,
      );

      // Resolving the inside fallback
      await act(async () => {
        await resolveText('FallbackAsync');
      });
      assertLog([
        'Text:Fallback:Inside render',
        'AsyncText:FallbackAsync render',
        'Text:Fallback:Fallback destroy insertion',
        'Text:Fallback:Fallback destroy layout',
        'Text:Fallback:Inside create insertion',
        'Text:Fallback:Inside create layout',
        'AsyncText:FallbackAsync create layout',
        'Text:Fallback:Fallback destroy passive',
        'Text:Fallback:Inside create passive',
        'AsyncText:FallbackAsync create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside" hidden={true} />
          <span prop="Fallback:Inside" />
          <span prop="FallbackAsync" />
          <span prop="Fallback:Outside" />
          <span prop="Outside" />
        </>,
      );

      // Resolving the outer fallback only
      await act(async () => {
        await resolveText('OutsideAsync');
      });
      assertLog([
        'Text:Inside render',
        'AsyncText:OutsideAsync render',
        'Text:Fallback:Inside destroy insertion',
        'Text:Fallback:Inside destroy layout',
        'AsyncText:FallbackAsync destroy layout',
        'Text:Fallback:Outside destroy insertion',
        'Text:Fallback:Outside destroy layout',
        'Text:Inside create layout',
        'AsyncText:OutsideAsync create layout',
        'Text:Fallback:Inside destroy passive',
        'AsyncText:FallbackAsync destroy passive',
        'Text:Fallback:Outside destroy passive',
        'AsyncText:OutsideAsync create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside" />
          <span prop="OutsideAsync" />
          <span prop="Outside" />
        </>,
      );
    });

    // @gate enableLegacyCache
    it('should be cleaned up deeper inside of a subtree that suspends', async () => {
      function ConditionalSuspense({shouldSuspend}) {
        if (shouldSuspend) {
          readText('Suspend');
        }
        return <Text text="Inside" />;
      }

      function App({children = null, shouldSuspend}) {
        return (
          <>
            <Suspense fallback={<Text text="Fallback" />}>
              <ConditionalSuspense shouldSuspend={shouldSuspend} />
            </Suspense>
            <Text text="Outside" />
          </>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App shouldSuspend={false} />);
      });
      assertLog([
        'Text:Inside render',
        'Text:Outside render',
        'Text:Inside create insertion',
        'Text:Outside create insertion',
        'Text:Inside create layout',
        'Text:Outside create layout',
        'Text:Inside create passive',
        'Text:Outside create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside" />
          <span prop="Outside" />
        </>,
      );

      // Suspending a component in the middle of the tree
      // should still properly cleanup effects deeper in the tree
      await act(async () => {
        ReactNoop.render(<App shouldSuspend={true} />);
        await waitFor([
          'Suspend:Suspend',
          'Text:Fallback render',
          'Text:Outside render',
          'Text:Inside destroy layout',
          'Text:Fallback create insertion',
          'Text:Fallback create layout',
        ]);
        await waitForAll([
          'Text:Fallback create passive',
          // pre-warming
          'Suspend:Suspend',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Inside" hidden={true} />
            <span prop="Fallback" />
            <span prop="Outside" />
          </>,
        );
      });

      // Resolving should cleanup.
      await act(async () => {
        await resolveText('Suspend');
      });
      assertLog([
        'Text:Inside render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'Text:Inside create layout',
        'Text:Fallback destroy passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Inside" />
          <span prop="Outside" />
        </>,
      );
    });

    describe('that throw errors', () => {
      // @gate enableLegacyCache
      it('are properly handled for componentDidMount', async () => {
        let componentDidMountShouldThrow = false;

        class ThrowsInDidMount extends React.Component {
          componentWillUnmount() {
            Scheduler.log('ThrowsInDidMount componentWillUnmount');
          }
          componentDidMount() {
            Scheduler.log('ThrowsInDidMount componentDidMount');
            if (componentDidMountShouldThrow) {
              throw Error('expected');
            }
          }
          render() {
            Scheduler.log('ThrowsInDidMount render');
            return <span prop="ThrowsInDidMount" />;
          }
        }

        function App({children = null}) {
          Scheduler.log('App render');
          React.useLayoutEffect(() => {
            Scheduler.log('App create layout');
            return () => {
              Scheduler.log('App destroy layout');
            };
          }, []);
          return (
            <>
              <Suspense fallback={<Text text="Fallback" />}>
                {children}
                <ThrowsInDidMount />
                <Text text="Inside" />
              </Suspense>
              <Text text="Outside" />
            </>
          );
        }

        await act(() => {
          ReactNoop.render(
            <ErrorBoundary fallback={<Text text="Error" />}>
              <App />
            </ErrorBoundary>,
          );
        });
        assertLog([
          'ErrorBoundary render: try',
          'App render',
          'ThrowsInDidMount render',
          'Text:Inside render',
          'Text:Outside render',
          'Text:Inside create insertion',
          'Text:Outside create insertion',
          'ThrowsInDidMount componentDidMount',
          'Text:Inside create layout',
          'Text:Outside create layout',
          'App create layout',
          'Text:Inside create passive',
          'Text:Outside create passive',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="ThrowsInDidMount" />
            <span prop="Inside" />
            <span prop="Outside" />
          </>,
        );

        // Schedule an update that causes React to suspend.
        await act(() => {
          ReactNoop.render(
            <ErrorBoundary fallback={<Text text="Error" />}>
              <App>
                <AsyncText text="Async" />
              </App>
            </ErrorBoundary>,
          );
        });
        assertLog([
          'ErrorBoundary render: try',
          'App render',
          'Suspend:Async',
          'Text:Fallback render',
          'Text:Outside render',
          'ThrowsInDidMount componentWillUnmount',
          'Text:Inside destroy layout',
          'Text:Fallback create insertion',
          'Text:Fallback create layout',
          'Text:Fallback create passive',
          // pre-warming
          'Suspend:Async',
          'ThrowsInDidMount render',
          'Text:Inside render',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="ThrowsInDidMount" hidden={true} />
            <span prop="Inside" hidden={true} />
            <span prop="Fallback" />
            <span prop="Outside" />
          </>,
        );

        // Resolve the pending suspense and throw
        componentDidMountShouldThrow = true;
        await act(async () => {
          await resolveText('Async');
        });
        assertLog([
          'AsyncText:Async render',
          'ThrowsInDidMount render',
          'Text:Inside render',
          'Text:Fallback destroy insertion',
          'Text:Fallback destroy layout',
          'AsyncText:Async create layout',

          // Even though an error was thrown in componentDidMount,
          // subsequent layout effects should still be destroyed.
          'ThrowsInDidMount componentDidMount',
          'Text:Inside create layout',

          // Finish the in-progress commit
          'Text:Fallback destroy passive',
          'AsyncText:Async create passive',

          // Destroy insertion, layout, and passive effects in the errored tree.
          'App destroy layout',
          'AsyncText:Async destroy layout',
          'ThrowsInDidMount componentWillUnmount',
          'Text:Inside destroy insertion',
          'Text:Inside destroy layout',
          'Text:Outside destroy insertion',
          'Text:Outside destroy layout',
          'AsyncText:Async destroy passive',
          'Text:Inside destroy passive',
          'Text:Outside destroy passive',

          // Render fallback
          'ErrorBoundary render: catch',
          'Text:Error render',
          'Text:Error create insertion',
          'Text:Error create layout',
          'Text:Error create passive',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Error" />);
      });

      // @gate enableLegacyCache
      it('are properly handled for componentWillUnmount', async () => {
        class ThrowsInWillUnmount extends React.Component {
          componentDidMount() {
            Scheduler.log('ThrowsInWillUnmount componentDidMount');
          }
          componentWillUnmount() {
            Scheduler.log('ThrowsInWillUnmount componentWillUnmount');
            throw Error('expected');
          }
          render() {
            Scheduler.log('ThrowsInWillUnmount render');
            return <span prop="ThrowsInWillUnmount" />;
          }
        }

        function App({children = null}) {
          Scheduler.log('App render');
          React.useLayoutEffect(() => {
            Scheduler.log('App create layout');
            return () => {
              Scheduler.log('App destroy layout');
            };
          }, []);
          return (
            <>
              <Suspense fallback={<Text text="Fallback" />}>
                {children}
                <ThrowsInWillUnmount />
                <Text text="Inside" />
              </Suspense>
              <Text text="Outside" />
            </>
          );
        }

        await act(() => {
          ReactNoop.render(
            <ErrorBoundary fallback={<Text text="Error" />}>
              <App />
            </ErrorBoundary>,
          );
        });
        assertLog([
          'ErrorBoundary render: try',
          'App render',
          'ThrowsInWillUnmount render',
          'Text:Inside render',
          'Text:Outside render',
          'Text:Inside create insertion',
          'Text:Outside create insertion',
          'ThrowsInWillUnmount componentDidMount',
          'Text:Inside create layout',
          'Text:Outside create layout',
          'App create layout',
          'Text:Inside create passive',
          'Text:Outside create passive',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="ThrowsInWillUnmount" />
            <span prop="Inside" />
            <span prop="Outside" />
          </>,
        );

        // Schedule an update that suspends and triggers our error code.
        await act(() => {
          ReactNoop.render(
            <ErrorBoundary fallback={<Text text="Error" />}>
              <App>
                <AsyncText text="Async" />
              </App>
            </ErrorBoundary>,
          );
        });
        assertLog([
          'ErrorBoundary render: try',
          'App render',
          'Suspend:Async',
          'Text:Fallback render',
          'Text:Outside render',

          // Even though an error was thrown in componentWillUnmount,
          // subsequent layout effects should still be destroyed.
          'ThrowsInWillUnmount componentWillUnmount',
          'Text:Inside destroy layout',

          // Finish the in-progress commit
          'Text:Fallback create insertion',
          'Text:Fallback create layout',
          'Text:Fallback create passive',

          // Destroy layout and passive effects in the errored tree.
          'App destroy layout',
          'Text:Inside destroy insertion',
          'Text:Fallback destroy insertion',
          'Text:Fallback destroy layout',
          'Text:Outside destroy insertion',
          'Text:Outside destroy layout',
          'Text:Inside destroy passive',
          'Text:Fallback destroy passive',
          'Text:Outside destroy passive',

          // Render fallback
          'ErrorBoundary render: catch',
          'Text:Error render',
          'Text:Error create insertion',
          'Text:Error create layout',
          'Text:Error create passive',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Error" />);
      });

      // @gate enableLegacyCache
      it('are properly handled for layout effect creation', async () => {
        let useLayoutEffectShouldThrow = false;

        function ThrowsInLayoutEffect({unused}) {
          Scheduler.log('ThrowsInLayoutEffect render');
          React.useLayoutEffect(() => {
            Scheduler.log('ThrowsInLayoutEffect useLayoutEffect create');
            if (useLayoutEffectShouldThrow) {
              throw Error('expected');
            }
            return () => {
              Scheduler.log('ThrowsInLayoutEffect useLayoutEffect destroy');
            };
          }, []);
          return <span prop="ThrowsInLayoutEffect" />;
        }

        function App({children = null}) {
          Scheduler.log('App render');
          React.useLayoutEffect(() => {
            Scheduler.log('App create layout');
            return () => {
              Scheduler.log('App destroy layout');
            };
          }, []);
          return (
            <>
              <Suspense fallback={<Text text="Fallback" />}>
                {children}
                <ThrowsInLayoutEffect />
                <Text text="Inside" />
              </Suspense>
              <Text text="Outside" />
            </>
          );
        }

        await act(() => {
          ReactNoop.render(
            <ErrorBoundary fallback={<Text text="Error" />}>
              <App />
            </ErrorBoundary>,
          );
        });
        assertLog([
          'ErrorBoundary render: try',
          'App render',
          'ThrowsInLayoutEffect render',
          'Text:Inside render',
          'Text:Outside render',
          'Text:Inside create insertion',
          'Text:Outside create insertion',
          'ThrowsInLayoutEffect useLayoutEffect create',
          'Text:Inside create layout',
          'Text:Outside create layout',
          'App create layout',
          'Text:Inside create passive',
          'Text:Outside create passive',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="ThrowsInLayoutEffect" />
            <span prop="Inside" />
            <span prop="Outside" />
          </>,
        );

        // Schedule an update that causes React to suspend.
        await act(() => {
          ReactNoop.render(
            <ErrorBoundary fallback={<Text text="Error" />}>
              <App>
                <AsyncText text="Async" />
              </App>
            </ErrorBoundary>,
          );
        });
        assertLog([
          'ErrorBoundary render: try',
          'App render',
          'Suspend:Async',
          'Text:Fallback render',
          'Text:Outside render',
          'ThrowsInLayoutEffect useLayoutEffect destroy',
          'Text:Inside destroy layout',
          'Text:Fallback create insertion',
          'Text:Fallback create layout',
          'Text:Fallback create passive',
          // pre-warming
          'Suspend:Async',
          'ThrowsInLayoutEffect render',
          'Text:Inside render',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="ThrowsInLayoutEffect" hidden={true} />
            <span prop="Inside" hidden={true} />
            <span prop="Fallback" />
            <span prop="Outside" />
          </>,
        );

        // Resolve the pending suspense and throw
        useLayoutEffectShouldThrow = true;
        await act(async () => {
          await resolveText('Async');
        });
        assertLog([
          'AsyncText:Async render',
          'ThrowsInLayoutEffect render',
          'Text:Inside render',

          'Text:Fallback destroy insertion',
          'Text:Fallback destroy layout',

          // Even though an error was thrown in useLayoutEffect,
          // subsequent layout effects should still be created.
          'AsyncText:Async create layout',
          'ThrowsInLayoutEffect useLayoutEffect create',
          'Text:Inside create layout',

          // Finish the in-progress commit
          'Text:Fallback destroy passive',
          'AsyncText:Async create passive',

          // Destroy layout and passive effects in the errored tree.
          'App destroy layout',
          'AsyncText:Async destroy layout',
          'Text:Inside destroy insertion',
          'Text:Inside destroy layout',
          'Text:Outside destroy insertion',
          'Text:Outside destroy layout',
          'AsyncText:Async destroy passive',
          'Text:Inside destroy passive',
          'Text:Outside destroy passive',

          // Render fallback
          'ErrorBoundary render: catch',
          'Text:Error render',
          'Text:Error create insertion',
          'Text:Error create layout',
          'Text:Error create passive',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Error" />);
      });

      // @gate enableLegacyCache
      it('are properly handled for layout effect destruction', async () => {
        function ThrowsInLayoutEffectDestroy({unused}) {
          Scheduler.log('ThrowsInLayoutEffectDestroy render');
          React.useLayoutEffect(() => {
            Scheduler.log('ThrowsInLayoutEffectDestroy useLayoutEffect create');
            return () => {
              Scheduler.log(
                'ThrowsInLayoutEffectDestroy useLayoutEffect destroy',
              );
              throw Error('expected');
            };
          }, []);
          return <span prop="ThrowsInLayoutEffectDestroy" />;
        }

        function App({children = null}) {
          Scheduler.log('App render');
          React.useLayoutEffect(() => {
            Scheduler.log('App create layout');
            return () => {
              Scheduler.log('App destroy layout');
            };
          }, []);
          return (
            <>
              <Suspense fallback={<Text text="Fallback" />}>
                {children}
                <ThrowsInLayoutEffectDestroy />
                <Text text="Inside" />
              </Suspense>
              <Text text="Outside" />
            </>
          );
        }

        await act(() => {
          ReactNoop.render(
            <ErrorBoundary fallback={<Text text="Error" />}>
              <App />
            </ErrorBoundary>,
          );
        });
        assertLog([
          'ErrorBoundary render: try',
          'App render',
          'ThrowsInLayoutEffectDestroy render',
          'Text:Inside render',
          'Text:Outside render',
          'Text:Inside create insertion',
          'Text:Outside create insertion',
          'ThrowsInLayoutEffectDestroy useLayoutEffect create',
          'Text:Inside create layout',
          'Text:Outside create layout',
          'App create layout',
          'Text:Inside create passive',
          'Text:Outside create passive',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="ThrowsInLayoutEffectDestroy" />
            <span prop="Inside" />
            <span prop="Outside" />
          </>,
        );

        // Schedule an update that suspends and triggers our error code.
        await act(() => {
          ReactNoop.render(
            <ErrorBoundary fallback={<Text text="Error" />}>
              <App>
                <AsyncText text="Async" />
              </App>
            </ErrorBoundary>,
          );
        });
        assertLog([
          'ErrorBoundary render: try',
          'App render',
          'Suspend:Async',
          'Text:Fallback render',
          'Text:Outside render',

          // Even though an error was thrown in useLayoutEffect destroy,
          // subsequent layout effects should still be destroyed.
          'ThrowsInLayoutEffectDestroy useLayoutEffect destroy',
          'Text:Inside destroy layout',

          // Finish the in-progress commit
          'Text:Fallback create insertion',
          'Text:Fallback create layout',
          'Text:Fallback create passive',

          // Destroy layout and passive effects in the errored tree.
          'App destroy layout',
          'Text:Inside destroy insertion',
          'Text:Fallback destroy insertion',
          'Text:Fallback destroy layout',
          'Text:Outside destroy insertion',
          'Text:Outside destroy layout',
          'Text:Inside destroy passive',
          'Text:Fallback destroy passive',
          'Text:Outside destroy passive',

          // Render fallback
          'ErrorBoundary render: catch',
          'Text:Error render',
          'Text:Error create insertion',
          'Text:Error create layout',
          'Text:Error create passive',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Error" />);
      });
    });

    // @gate enableLegacyCache
    it('should be only destroy layout effects once if a tree suspends in multiple places', async () => {
      class ClassText extends React.Component {
        componentDidMount() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentDidMount`);
        }
        componentDidUpdate() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentDidUpdate`);
        }
        componentWillUnmount() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentWillUnmount`);
        }
        render() {
          const {children, text} = this.props;
          Scheduler.log(`ClassText:${text} render`);
          return <span prop={text}>{children}</span>;
        }
      }

      function App({children = null}) {
        return (
          <Suspense fallback={<ClassText text="Fallback" />}>
            <Text text="Function" />
            {children}
            <ClassText text="Class" />
          </Suspense>
        );
      }

      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'Text:Function render',
        'ClassText:Class render',
        'Text:Function create insertion',
        'Text:Function create layout',
        'ClassText:Class componentDidMount',
        'Text:Function create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Function" />
          <span prop="Class" />
        </>,
      );

      // Schedule an update that causes React to suspend.
      await act(async () => {
        ReactNoop.render(
          <App>
            <AsyncText text="Async_1" />
            <AsyncText text="Async_2" />
          </App>,
        );
        await waitFor([
          'Text:Function render',
          'Suspend:Async_1',
          'ClassText:Fallback render',
          'Text:Function destroy layout',
          'ClassText:Class componentWillUnmount',
          'ClassText:Fallback componentDidMount',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Function" hidden={true} />
            <span prop="Class" hidden={true} />
            <span prop="Fallback" />
          </>,
        );
      });

      // pre-warming
      assertLog([
        'Text:Function render',
        'Suspend:Async_1',
        'Suspend:Async_2',
        'ClassText:Class render',
      ]);

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async_1');
      });
      assertLog([
        'Text:Function render',
        'AsyncText:Async_1 render',
        'Suspend:Async_2',
        // pre-warming
        'Text:Function render',
        'AsyncText:Async_1 render',
        'Suspend:Async_2',
        'ClassText:Class render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Function" hidden={true} />
          <span prop="Class" hidden={true} />
          <span prop="Fallback" />
        </>,
      );

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async_2');
      });
      assertLog([
        'Text:Function render',
        'AsyncText:Async_1 render',
        'AsyncText:Async_2 render',
        'ClassText:Class render',
        'ClassText:Fallback componentWillUnmount',
        'Text:Function create layout',
        'AsyncText:Async_1 create layout',
        'AsyncText:Async_2 create layout',
        'ClassText:Class componentDidMount',
        'AsyncText:Async_1 create passive',
        'AsyncText:Async_2 create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Function" />
          <span prop="Async_1" />
          <span prop="Async_2" />
          <span prop="Class" />
        </>,
      );

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'Text:Function destroy insertion',
        'Text:Function destroy layout',
        'AsyncText:Async_1 destroy layout',
        'AsyncText:Async_2 destroy layout',
        'ClassText:Class componentWillUnmount',
        'Text:Function destroy passive',
        'AsyncText:Async_1 destroy passive',
        'AsyncText:Async_2 destroy passive',
      ]);
    });

    // @gate enableLegacyCache
    it('should be only destroy layout effects once if a component suspends multiple times', async () => {
      class ClassText extends React.Component {
        componentDidMount() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentDidMount`);
        }
        componentDidUpdate() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentDidUpdate`);
        }
        componentWillUnmount() {
          const {text} = this.props;
          Scheduler.log(`ClassText:${text} componentWillUnmount`);
        }
        render() {
          const {children, text} = this.props;
          Scheduler.log(`ClassText:${text} render`);
          return <span prop={text}>{children}</span>;
        }
      }

      let textToRead = null;

      function Suspender() {
        Scheduler.log(`Suspender "${textToRead}" render`);
        if (textToRead !== null) {
          readText(textToRead);
        }
        return <span prop="Suspender" />;
      }

      function App({children = null}) {
        return (
          <Suspense fallback={<ClassText text="Fallback" />}>
            <Text text="Function" />
            <Suspender />
            <ClassText text="Class" />
          </Suspense>
        );
      }

      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'Text:Function render',
        'Suspender "null" render',
        'ClassText:Class render',
        'Text:Function create insertion',
        'Text:Function create layout',
        'ClassText:Class componentDidMount',
        'Text:Function create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Function" />
          <span prop="Suspender" />
          <span prop="Class" />
        </>,
      );

      // Schedule an update that causes React to suspend.
      textToRead = 'A';
      await act(async () => {
        ReactNoop.render(<App />);
        await waitFor([
          'Text:Function render',
          'Suspender "A" render',
          'Suspend:A',
          'ClassText:Fallback render',
          'Text:Function destroy layout',
          'ClassText:Class componentWillUnmount',
          'ClassText:Fallback componentDidMount',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Function" hidden={true} />
            <span prop="Suspender" hidden={true} />
            <span prop="Class" hidden={true} />
            <span prop="Fallback" />
          </>,
        );
      });

      // pre-warming
      assertLog([
        'Text:Function render',
        'Suspender "A" render',
        'Suspend:A',
        'ClassText:Class render',
      ]);

      // Resolving the suspended resource should re-create inner layout effects.
      textToRead = 'B';
      await act(async () => {
        await resolveText('A');
      });
      assertLog([
        'Text:Function render',
        'Suspender "B" render',
        'Suspend:B',
        // pre-warming
        'Text:Function render',
        'Suspender "B" render',
        'Suspend:B',
        'ClassText:Class render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Function" hidden={true} />
          <span prop="Suspender" hidden={true} />
          <span prop="Class" hidden={true} />
          <span prop="Fallback" />
        </>,
      );

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('B');
      });
      assertLog([
        'Text:Function render',
        'Suspender "B" render',
        'ClassText:Class render',
        'ClassText:Fallback componentWillUnmount',
        'Text:Function create layout',
        'ClassText:Class componentDidMount',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Function" />
          <span prop="Suspender" />
          <span prop="Class" />
        </>,
      );

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'Text:Function destroy insertion',
        'Text:Function destroy layout',
        'ClassText:Class componentWillUnmount',
        'Text:Function destroy passive',
      ]);
    });
  });

  describe('refs within a tree that re-suspends in an update', () => {
    function RefCheckerOuter({Component}) {
      const refObject = React.useRef(null);

      const manualRef = React.useMemo(() => ({current: null}), []);
      const refCallback = React.useCallback(value => {
        Scheduler.log(`RefCheckerOuter refCallback value? ${value != null}`);
        manualRef.current = value;
      }, []);

      Scheduler.log(`RefCheckerOuter render`);

      React.useLayoutEffect(() => {
        Scheduler.log(
          `RefCheckerOuter create layout refObject? ${
            refObject.current != null
          } refCallback? ${manualRef.current != null}`,
        );
        return () => {
          Scheduler.log(
            `RefCheckerOuter destroy layout refObject? ${
              refObject.current != null
            } refCallback? ${manualRef.current != null}`,
          );
        };
      }, []);

      return (
        <>
          <Component ref={refObject} prop="refObject">
            <RefCheckerInner forwardedRef={refObject} text="refObject" />
          </Component>
          <Component ref={refCallback} prop="refCallback">
            <RefCheckerInner forwardedRef={manualRef} text="refCallback" />
          </Component>
        </>
      );
    }

    function RefCheckerInner({forwardedRef, text}) {
      Scheduler.log(`RefCheckerInner:${text} render`);
      React.useLayoutEffect(() => {
        Scheduler.log(
          `RefCheckerInner:${text} create layout ref? ${
            forwardedRef.current != null
          }`,
        );
        return () => {
          Scheduler.log(
            `RefCheckerInner:${text} destroy layout ref? ${
              forwardedRef.current != null
            }`,
          );
        };
      }, []);
      return null;
    }

    // @gate enableLegacyCache && !disableLegacyMode
    it('should not be cleared within legacy roots', async () => {
      class ClassComponent extends React.Component {
        render() {
          Scheduler.log(`ClassComponent:${this.props.prop} render`);
          return this.props.children;
        }
      }

      function App({children}) {
        Scheduler.log(`App render`);
        return (
          <Suspense fallback={<Text text="Fallback" />}>
            {children}
            <RefCheckerOuter Component={ClassComponent} />
          </Suspense>
        );
      }

      await act(() => {
        ReactNoop.renderLegacySyncRoot(<App />);
      });
      assertLog([
        'App render',
        'RefCheckerOuter render',
        'ClassComponent:refObject render',
        'RefCheckerInner:refObject render',
        'ClassComponent:refCallback render',
        'RefCheckerInner:refCallback render',
        'RefCheckerInner:refObject create layout ref? false',
        'RefCheckerInner:refCallback create layout ref? false',
        'RefCheckerOuter refCallback value? true',
        'RefCheckerOuter create layout refObject? true refCallback? true',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);

      // Suspend the inner Suspense subtree (only inner effects should be destroyed)
      await act(() => {
        ReactNoop.renderLegacySyncRoot(
          <App children={<AsyncText text="Async" />} />,
        );
      });
      await advanceTimers(1000);
      assertLog([
        'App render',
        'Suspend:Async',
        'RefCheckerOuter render',
        'ClassComponent:refObject render',
        'RefCheckerInner:refObject render',
        'ClassComponent:refCallback render',
        'RefCheckerInner:refCallback render',
        'Text:Fallback render',
        'Text:Fallback create insertion',
        'Text:Fallback create layout',
        'Text:Fallback create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Fallback" />);

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'AsyncText:Async render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'AsyncText:Async create layout',
        'Text:Fallback destroy passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Async" />);

      await act(() => {
        ReactNoop.renderLegacySyncRoot(null);
      });
      assertLog([
        'AsyncText:Async destroy layout',
        'RefCheckerOuter destroy layout refObject? true refCallback? true',
        'RefCheckerInner:refObject destroy layout ref? false',
        'RefCheckerOuter refCallback value? false',
        'RefCheckerInner:refCallback destroy layout ref? false',
        'AsyncText:Async destroy passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    // @gate enableLegacyCache
    it('should be cleared and reset for host components', async () => {
      function App({children}) {
        Scheduler.log(`App render`);
        return (
          <Suspense fallback={<Text text="Fallback" />}>
            {children}
            <RefCheckerOuter Component="span" />
          </Suspense>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'App render',
        'RefCheckerOuter render',
        'RefCheckerInner:refObject render',
        'RefCheckerInner:refCallback render',
        'RefCheckerInner:refObject create layout ref? false',
        'RefCheckerInner:refCallback create layout ref? false',
        'RefCheckerOuter refCallback value? true',
        'RefCheckerOuter create layout refObject? true refCallback? true',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="refObject" />
          <span prop="refCallback" />
        </>,
      );

      // Suspend the inner Suspense subtree (only inner effects should be destroyed)
      await act(() => {
        ReactNoop.render(<App children={<AsyncText text="Async" />} />);
      });
      await advanceTimers(1000);
      assertLog([
        'App render',
        'Suspend:Async',
        'Text:Fallback render',
        'RefCheckerOuter destroy layout refObject? true refCallback? true',
        'RefCheckerInner:refObject destroy layout ref? false',
        'RefCheckerOuter refCallback value? false',
        'RefCheckerInner:refCallback destroy layout ref? false',
        'Text:Fallback create insertion',
        'Text:Fallback create layout',
        'Text:Fallback create passive',
        // pre-warming
        'Suspend:Async',
        'RefCheckerOuter render',
        'RefCheckerInner:refObject render',
        'RefCheckerInner:refCallback render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="refObject" hidden={true} />
          <span prop="refCallback" hidden={true} />
          <span prop="Fallback" />
        </>,
      );

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'AsyncText:Async render',
        'RefCheckerOuter render',
        'RefCheckerInner:refObject render',
        'RefCheckerInner:refCallback render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'AsyncText:Async create layout',
        'RefCheckerInner:refObject create layout ref? false',
        'RefCheckerInner:refCallback create layout ref? false',
        'RefCheckerOuter refCallback value? true',
        'RefCheckerOuter create layout refObject? true refCallback? true',
        'Text:Fallback destroy passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Async" />
          <span prop="refObject" />
          <span prop="refCallback" />
        </>,
      );

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'AsyncText:Async destroy layout',
        'RefCheckerOuter destroy layout refObject? true refCallback? true',
        'RefCheckerInner:refObject destroy layout ref? false',
        'RefCheckerOuter refCallback value? false',
        'RefCheckerInner:refCallback destroy layout ref? false',
        'AsyncText:Async destroy passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    // @gate enableLegacyCache
    it('should be cleared and reset for class components', async () => {
      class ClassComponent extends React.Component {
        render() {
          Scheduler.log(`ClassComponent:${this.props.prop} render`);
          return this.props.children;
        }
      }

      function App({children}) {
        Scheduler.log(`App render`);
        return (
          <Suspense fallback={<Text text="Fallback" />}>
            {children}
            <RefCheckerOuter Component={ClassComponent} />
          </Suspense>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'App render',
        'RefCheckerOuter render',
        'ClassComponent:refObject render',
        'RefCheckerInner:refObject render',
        'ClassComponent:refCallback render',
        'RefCheckerInner:refCallback render',
        'RefCheckerInner:refObject create layout ref? false',
        'RefCheckerInner:refCallback create layout ref? false',
        'RefCheckerOuter refCallback value? true',
        'RefCheckerOuter create layout refObject? true refCallback? true',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);

      // Suspend the inner Suspense subtree (only inner effects should be destroyed)
      await act(() => {
        ReactNoop.render(<App children={<AsyncText text="Async" />} />);
      });
      await advanceTimers(1000);
      assertLog([
        'App render',
        'Suspend:Async',
        'Text:Fallback render',
        'RefCheckerOuter destroy layout refObject? true refCallback? true',
        'RefCheckerInner:refObject destroy layout ref? false',
        'RefCheckerOuter refCallback value? false',
        'RefCheckerInner:refCallback destroy layout ref? false',
        'Text:Fallback create insertion',
        'Text:Fallback create layout',
        'Text:Fallback create passive',
        // pre-warming
        'Suspend:Async',
        'RefCheckerOuter render',
        'ClassComponent:refObject render',
        'RefCheckerInner:refObject render',
        'ClassComponent:refCallback render',
        'RefCheckerInner:refCallback render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Fallback" />);

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'AsyncText:Async render',
        'RefCheckerOuter render',
        'ClassComponent:refObject render',
        'RefCheckerInner:refObject render',
        'ClassComponent:refCallback render',
        'RefCheckerInner:refCallback render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'AsyncText:Async create layout',
        'RefCheckerInner:refObject create layout ref? false',
        'RefCheckerInner:refCallback create layout ref? false',
        'RefCheckerOuter refCallback value? true',
        'RefCheckerOuter create layout refObject? true refCallback? true',
        'Text:Fallback destroy passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Async" />);

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'AsyncText:Async destroy layout',
        'RefCheckerOuter destroy layout refObject? true refCallback? true',
        'RefCheckerInner:refObject destroy layout ref? false',
        'RefCheckerOuter refCallback value? false',
        'RefCheckerInner:refCallback destroy layout ref? false',
        'AsyncText:Async destroy passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    // @gate enableLegacyCache
    it('should be cleared and reset for function components with useImperativeHandle', async () => {
      const FunctionComponent = React.forwardRef((props, ref) => {
        Scheduler.log('FunctionComponent render');
        React.useImperativeHandle(
          ref,
          () => ({
            // Noop
          }),
          [],
        );
        return props.children;
      });
      FunctionComponent.displayName = 'FunctionComponent';

      function App({children}) {
        Scheduler.log(`App render`);
        return (
          <Suspense fallback={<Text text="Fallback" />}>
            {children}
            <RefCheckerOuter Component={FunctionComponent} />
          </Suspense>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'App render',
        'RefCheckerOuter render',
        'FunctionComponent render',
        'RefCheckerInner:refObject render',
        'FunctionComponent render',
        'RefCheckerInner:refCallback render',
        'RefCheckerInner:refObject create layout ref? false',
        'RefCheckerInner:refCallback create layout ref? false',
        'RefCheckerOuter refCallback value? true',
        'RefCheckerOuter create layout refObject? true refCallback? true',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);

      // Suspend the inner Suspense subtree (only inner effects should be destroyed)
      await act(() => {
        ReactNoop.render(<App children={<AsyncText text="Async" />} />);
      });
      await advanceTimers(1000);
      assertLog([
        'App render',
        'Suspend:Async',
        'Text:Fallback render',
        'RefCheckerOuter destroy layout refObject? true refCallback? true',
        'RefCheckerInner:refObject destroy layout ref? false',
        'RefCheckerOuter refCallback value? false',
        'RefCheckerInner:refCallback destroy layout ref? false',
        'Text:Fallback create insertion',
        'Text:Fallback create layout',
        'Text:Fallback create passive',
        // pre-warming
        'Suspend:Async',
        'RefCheckerOuter render',
        'FunctionComponent render',
        'RefCheckerInner:refObject render',
        'FunctionComponent render',
        'RefCheckerInner:refCallback render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Fallback" />);

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'AsyncText:Async render',
        'RefCheckerOuter render',
        'FunctionComponent render',
        'RefCheckerInner:refObject render',
        'FunctionComponent render',
        'RefCheckerInner:refCallback render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'AsyncText:Async create layout',
        'RefCheckerInner:refObject create layout ref? false',
        'RefCheckerInner:refCallback create layout ref? false',
        'RefCheckerOuter refCallback value? true',
        'RefCheckerOuter create layout refObject? true refCallback? true',
        'Text:Fallback destroy passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Async" />);

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'AsyncText:Async destroy layout',
        'RefCheckerOuter destroy layout refObject? true refCallback? true',
        'RefCheckerInner:refObject destroy layout ref? false',
        'RefCheckerOuter refCallback value? false',
        'RefCheckerInner:refCallback destroy layout ref? false',
        'AsyncText:Async destroy passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    // @gate enableLegacyCache
    it('should not reset for user-managed values', async () => {
      function RefChecker({forwardedRef}) {
        Scheduler.log(`RefChecker render`);
        React.useLayoutEffect(() => {
          Scheduler.log(
            `RefChecker create layout ref? ${forwardedRef.current === 'test'}`,
          );
          return () => {
            Scheduler.log(
              `RefChecker destroy layout ref? ${
                forwardedRef.current === 'test'
              }`,
            );
          };
        }, []);
        return null;
      }

      function App({children = null}) {
        const ref = React.useRef('test');
        Scheduler.log(`App render`);
        React.useLayoutEffect(() => {
          Scheduler.log(`App create layout ref? ${ref.current === 'test'}`);
          return () => {
            Scheduler.log(`App destroy layout ref? ${ref.current === 'test'}`);
          };
        }, []);
        return (
          <Suspense fallback={<Text text="Fallback" />}>
            {children}
            <RefChecker forwardedRef={ref} />
          </Suspense>
        );
      }

      // Mount
      await act(() => {
        ReactNoop.render(<App />);
      });
      assertLog([
        'App render',
        'RefChecker render',
        'RefChecker create layout ref? true',
        'App create layout ref? true',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);

      // Suspend the inner Suspense subtree (only inner effects should be destroyed)
      await act(() => {
        ReactNoop.render(<App children={<AsyncText text="Async" />} />);
      });
      await advanceTimers(1000);
      assertLog([
        'App render',
        'Suspend:Async',
        'Text:Fallback render',
        'RefChecker destroy layout ref? true',
        'Text:Fallback create insertion',
        'Text:Fallback create layout',
        'Text:Fallback create passive',
        // pre-warming
        'Suspend:Async',
        'RefChecker render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Fallback" />);

      // Resolving the suspended resource should re-create inner layout effects.
      await act(async () => {
        await resolveText('Async');
      });
      assertLog([
        'AsyncText:Async render',
        'RefChecker render',
        'Text:Fallback destroy insertion',
        'Text:Fallback destroy layout',
        'AsyncText:Async create layout',
        'RefChecker create layout ref? true',
        'Text:Fallback destroy passive',
        'AsyncText:Async create passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Async" />);

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog([
        'App destroy layout ref? true',
        'AsyncText:Async destroy layout',
        'RefChecker destroy layout ref? true',
        'AsyncText:Async destroy passive',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    describe('that throw errors', () => {
      // @gate enableLegacyCache
      it('are properly handled in ref callbacks', async () => {
        let useRefCallbackShouldThrow = false;

        function ThrowsInRefCallback({unused}) {
          Scheduler.log('ThrowsInRefCallback render');
          const refCallback = React.useCallback(value => {
            Scheduler.log('ThrowsInRefCallback refCallback ref? ' + !!value);
            if (useRefCallbackShouldThrow) {
              throw Error('expected');
            }
          }, []);
          return <span ref={refCallback} prop="ThrowsInRefCallback" />;
        }

        function App({children = null}) {
          Scheduler.log('App render');
          React.useLayoutEffect(() => {
            Scheduler.log('App create layout');
            return () => {
              Scheduler.log('App destroy layout');
            };
          }, []);
          return (
            <>
              <Suspense fallback={<Text text="Fallback" />}>
                {children}
                <ThrowsInRefCallback />
                <Text text="Inside" />
              </Suspense>
              <Text text="Outside" />
            </>
          );
        }

        await act(() => {
          ReactNoop.render(
            <ErrorBoundary fallback={<Text text="Error" />}>
              <App />
            </ErrorBoundary>,
          );
        });
        assertLog([
          'ErrorBoundary render: try',
          'App render',
          'ThrowsInRefCallback render',
          'Text:Inside render',
          'Text:Outside render',
          'Text:Inside create insertion',
          'Text:Outside create insertion',
          'ThrowsInRefCallback refCallback ref? true',
          'Text:Inside create layout',
          'Text:Outside create layout',
          'App create layout',
          'Text:Inside create passive',
          'Text:Outside create passive',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="ThrowsInRefCallback" />
            <span prop="Inside" />
            <span prop="Outside" />
          </>,
        );

        // Schedule an update that causes React to suspend.
        await act(() => {
          ReactNoop.render(
            <ErrorBoundary fallback={<Text text="Error" />}>
              <App>
                <AsyncText text="Async" />
              </App>
            </ErrorBoundary>,
          );
        });
        assertLog([
          'ErrorBoundary render: try',
          'App render',
          'Suspend:Async',
          'Text:Fallback render',
          'Text:Outside render',
          'ThrowsInRefCallback refCallback ref? false',
          'Text:Inside destroy layout',
          'Text:Fallback create insertion',
          'Text:Fallback create layout',
          'Text:Fallback create passive',
          // pre-warming
          'Suspend:Async',
          'ThrowsInRefCallback render',
          'Text:Inside render',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="ThrowsInRefCallback" hidden={true} />
            <span prop="Inside" hidden={true} />
            <span prop="Fallback" />
            <span prop="Outside" />
          </>,
        );

        // Resolve the pending suspense and throw
        useRefCallbackShouldThrow = true;
        await act(async () => {
          await resolveText('Async');
        });
        assertLog([
          'AsyncText:Async render',
          'ThrowsInRefCallback render',
          'Text:Inside render',

          // Even though an error was thrown in refCallback,
          // subsequent layout effects should still be created.
          'Text:Fallback destroy insertion',
          'Text:Fallback destroy layout',
          'AsyncText:Async create layout',
          'ThrowsInRefCallback refCallback ref? true',
          'Text:Inside create layout',

          // Finish the in-progress commit
          'Text:Fallback destroy passive',
          'AsyncText:Async create passive',

          // Destroy insertion, layout, and passive effects in the errored tree.
          'App destroy layout',
          'AsyncText:Async destroy layout',
          'ThrowsInRefCallback refCallback ref? false',
          'Text:Inside destroy insertion',
          'Text:Inside destroy layout',
          'Text:Outside destroy insertion',
          'Text:Outside destroy layout',
          'AsyncText:Async destroy passive',
          'Text:Inside destroy passive',
          'Text:Outside destroy passive',

          // Render fallback
          'ErrorBoundary render: catch',
          'Text:Error render',
          'Text:Error create insertion',
          'Text:Error create layout',
          'Text:Error create passive',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Error" />);
      });
    });
  });
});
