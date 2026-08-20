/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactDOMClient;
let ReactFreshRuntime;
let Scheduler;
let act;
let assertLog;

const babel = require('@babel/core');
const freshPlugin = require('react-refresh/babel');
const ts = require('typescript');

describe('ReactFreshIntegration', () => {
  let container;
  let root;
  let exportsObj;

  beforeEach(() => {
    if (__DEV__) {
      jest.resetModules();
      React = require('react');
      ReactFreshRuntime = require('react-refresh/runtime');
      ReactFreshRuntime.injectIntoGlobalHook(global);
      ReactDOMClient = require('react-dom/client');
      Scheduler = require('scheduler/unstable_mock');
      ({act, assertLog} = require('internal-test-utils'));
      container = document.createElement('div');
      document.body.appendChild(container);
      root = ReactDOMClient.createRoot(container);
      exportsObj = undefined;
    }
  });

  afterEach(() => {
    if (__DEV__) {
      root.unmount();
      // Ensure we don't leak memory by holding onto dead roots.
      expect(ReactFreshRuntime._getMountedRootCount()).toBe(0);
      document.body.removeChild(container);
    }
  });

  function executeJavaScript(source, compileDestructuring) {
    const compiled = babel.transform(source, {
      babelrc: false,
      presets: ['@babel/react'],
      plugins: [
        [freshPlugin, {skipEnvCheck: true}],
        '@babel/plugin-transform-modules-commonjs',
        compileDestructuring && '@babel/plugin-transform-destructuring',
      ].filter(Boolean),
    }).code;
    return executeCompiled(compiled);
  }

  function executeTypescript(source) {
    const typescriptSource = babel.transform(source, {
      babelrc: false,
      configFile: false,
      presets: ['@babel/react'],
      plugins: [
        [freshPlugin, {skipEnvCheck: true}],
        ['@babel/plugin-syntax-typescript', {isTSX: true}],
      ],
    }).code;
    const compiled = ts.transpileModule(typescriptSource, {
      module: ts.ModuleKind.CommonJS,
    }).outputText;
    return executeCompiled(compiled);
  }

  function executeCompiled(compiled) {
    exportsObj = {};
    // eslint-disable-next-line no-new-func
    new Function(
      'global',
      'require',
      'React',
      'Scheduler',
      'exports',
      '$RefreshReg$',
      '$RefreshSig$',
      compiled,
    )(
      global,
      require,
      React,
      Scheduler,
      exportsObj,
      $RefreshReg$,
      $RefreshSig$,
    );
    // Module systems will register exports as a fallback.
    // This is useful for cases when e.g. a class is exported,
    // and we don't want to propagate the update beyond this module.
    $RefreshReg$(exportsObj.default, 'exports.default');
    return exportsObj.default;
  }

  function $RefreshReg$(type, id) {
    ReactFreshRuntime.register(type, id);
  }

  function $RefreshSig$() {
    return ReactFreshRuntime.createSignatureFunctionForTransform();
  }

  describe.each([
    [
      'JavaScript syntax with destructuring enabled',
      source => executeJavaScript(source, true),
      testJavaScript,
    ],
    [
      'JavaScript syntax with destructuring disabled',
      source => executeJavaScript(source, false),
      testJavaScript,
    ],
    ['TypeScript syntax', executeTypescript, testTypeScript],
  ])('%s', (language, execute, runTest) => {
    async function render(source) {
      const Component = execute(source);
      await act(() => {
        root.render(<Component />);
      });
      // Module initialization shouldn't be counted as a hot update.
      expect(ReactFreshRuntime.performReactRefresh()).toBe(null);
    }

    async function patch(source) {
      const prevExports = exportsObj;
      execute(source);
      const nextExports = exportsObj;

      // Check if exported families have changed.
      // (In a real module system we'd do this for *all* exports.)
      // For example, this can happen if you convert a class to a function.
      // Or if you wrap something in a HOC.
      const didExportsChange =
        ReactFreshRuntime.getFamilyByType(prevExports.default) !==
        ReactFreshRuntime.getFamilyByType(nextExports.default);
      if (didExportsChange) {
        // In a real module system, we would propagate such updates upwards,
        // and re-execute modules that imported this one. (Just like if we edited them.)
        // This makes adding/removing/renaming exports re-render references to them.
        // Here, we'll just force a re-render using the newer type to emulate this.
        const NextComponent = nextExports.default;
        await act(() => {
          root.render(<NextComponent />);
        });
      }
      await act(() => {
        const result = ReactFreshRuntime.performReactRefresh();
        if (!didExportsChange) {
          // Normally we expect that some components got updated in our tests.
          expect(result).not.toBe(null);
        } else {
          // However, we have tests where we convert functions to classes,
          // and in those cases it's expected nothing would get updated.
          // (Instead, the export change branch above would take care of it.)
        }
      });
      expect(ReactFreshRuntime._getMountedRootCount()).toBe(1);
    }

    runTest(render, patch);
  });

  function testJavaScript(render, patch) {
    it('reloads function declarations', async () => {
      if (__DEV__) {
        await render(`
          function Parent() {
            return <Child prop="A" />;
          };

          function Child({prop}) {
            return <h1>{prop}1</h1>;
          };

          export default Parent;
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          function Parent() {
            return <Child prop="B" />;
          };

          function Child({prop}) {
            return <h1>{prop}2</h1>;
          };

          export default Parent;
        `);
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B2');
      }
    });

    it('reloads arrow functions', async () => {
      if (__DEV__) {
        await render(`
          const Parent = () => {
            return <Child prop="A" />;
          };

          const Child = ({prop}) => {
            return <h1>{prop}1</h1>;
          };

          export default Parent;
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          const Parent = () => {
            return <Child prop="B" />;
          };

          const Child = ({prop}) => {
            return <h1>{prop}2</h1>;
          };

          export default Parent;
        `);
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B2');
      }
    });

    it('reloads a combination of memo and forwardRef', async () => {
      if (__DEV__) {
        await render(`
          const {memo} = React;

          const Parent = memo(React.forwardRef(function (props, ref) {
            return <Child prop="A" ref={ref} />;
          }));

          const Child = React.memo(({prop}) => {
            return <h1>{prop}1</h1>;
          });

          export default React.memo(Parent);
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          const {memo} = React;

          const Parent = memo(React.forwardRef(function (props, ref) {
            return <Child prop="B" ref={ref} />;
          }));

          const Child = React.memo(({prop}) => {
            return <h1>{prop}2</h1>;
          });

          export default React.memo(Parent);
        `);
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B2');
      }
    });

    it('reloads default export with named memo', async () => {
      if (__DEV__) {
        await render(`
          const {memo} = React;

          const Child = React.memo(({prop}) => {
            return <h1>{prop}1</h1>;
          });

          export default memo(React.forwardRef(function Parent(props, ref) {
            return <Child prop="A" ref={ref} />;
          }));
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          const {memo} = React;

          const Child = React.memo(({prop}) => {
            return <h1>{prop}2</h1>;
          });

          export default memo(React.forwardRef(function Parent(props, ref) {
            return <Child prop="B" ref={ref} />;
          }));
        `);
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B2');
      }
    });

    // @gate __DEV__
    it('ignores ref for class component in hidden subtree', async () => {
      const code = `
        import {Activity} from 'react';

        // Avoid creating a new class on Fast Refresh.
        global.A = global.A ?? class A extends React.Component {
          render() {
            return <div />;
          }
        }
        const A = global.A;

        function hiddenRef() {
          throw new Error('Unexpected hiddenRef() invocation.');
        }

        export default function App() {
          return (
            <Activity mode="hidden">
              <A ref={hiddenRef} />
            </Activity>
          );
        };
      `;

      await render(code);
      await patch(code);
    });

    // @gate __DEV__
    it('ignores ref for hoistable resource in hidden subtree', async () => {
      const code = `
        import {Activity} from 'react';

        function hiddenRef() {
          throw new Error('Unexpected hiddenRef() invocation.');
        }

        export default function App() {
          return (
            <Activity mode="hidden">
              <link rel="preload" href="foo" ref={hiddenRef} />
            </Activity>
          );
        };
      `;

      await render(code);
      await patch(code);
    });

    // @gate __DEV__
    it('ignores ref for host component in hidden subtree', async () => {
      const code = `
        import {Activity} from 'react';

        function hiddenRef() {
          throw new Error('Unexpected hiddenRef() invocation.');
        }

        export default function App() {
          return (
            <Activity mode="hidden">
              <div ref={hiddenRef} />
            </Activity>
          );
        };
      `;

      await render(code);
      await patch(code);
    });

    // @gate __DEV__
    it('ignores ref for Activity in hidden subtree', async () => {
      const code = `
        import {Activity} from 'react';

        function hiddenRef(value) {
          throw new Error('Unexpected hiddenRef() invocation.');
        }

        export default function App() {
          return (
            <Activity mode="hidden">
              <Activity mode="visible" ref={hiddenRef}>
                <div />
              </Activity>
            </Activity>
          );
        };
      `;

      await render(code);
      await patch(code);
    });

    // @gate __DEV__
    it('ignores ref for Scope in hidden subtree', async () => {
      const code = `
        import {
          Activity,
          unstable_Scope as Scope,
        } from 'react';

        function hiddenRef(value) {
          throw new Error('Unexpected hiddenRef() invocation.');
        }

        export default function App() {
          return (
            <Activity mode="hidden">
              <Scope ref={hiddenRef}>
                <div />
              </Scope>
            </Activity>
          );
        };
      `;

      await render(code);
      await patch(code);
    });

    // @gate __DEV__
    it('ignores ref for functional component in hidden subtree', async () => {
      const code = `
        import {Activity} from 'react';

        // Avoid creating a new component on Fast Refresh.
        global.A = global.A ?? function A() {
          return <div />;
        }
        const A = global.A;

        function hiddenRef() {
          throw new Error('Unexpected hiddenRef() invocation.');
        }

        export default function App() {
          return (
            <Activity mode="hidden">
              <A ref={hiddenRef} />
            </Activity>
          );
        };
      `;

      await render(code);
      await patch(code);
    });

    // @gate __DEV__
    it('ignores ref for ref forwarding component in hidden subtree', async () => {
      const code = `
        import {
          forwardRef,
          Activity,
        } from 'react';

        // Avoid creating a new component on Fast Refresh.
        global.A = global.A ?? forwardRef(function A(props, ref) {
          return <div ref={ref} />;
        });
        const A = global.A;

        function hiddenRef() {
          throw new Error('Unexpected hiddenRef() invocation.');
        }

        export default function App() {
          return (
            <Activity mode="hidden">
              <A ref={hiddenRef} />
            </Activity>
          );
        };
      `;

      await render(code);
      await patch(code);
    });

    // @gate __DEV__
    it('ignores ref for simple memo component in hidden subtree', async () => {
      const code = `
        import {
          memo,
          Activity,
        } from 'react';

        // Avoid creating a new component on Fast Refresh.
        global.A = global.A ?? memo(function A() {
          return <div />;
        });
        const A = global.A;

        function hiddenRef() {
          throw new Error('Unexpected hiddenRef() invocation.');
        }

        export default function App() {
          return (
            <Activity mode="hidden">
              <A ref={hiddenRef} />
            </Activity>
          );
        };
      `;

      await render(code);
      await patch(code);
    });

    // @gate __DEV__
    it('ignores ref for memo component in hidden subtree', async () => {
      // A custom compare function means this won't use SimpleMemoComponent.
      const code = `
        import {
          memo,
          Activity,
        } from 'react';

        // Avoid creating a new component on Fast Refresh.
        global.A = global.A ?? memo(
          function A() {
            return <div />;
          },
          () => false,
        );
        const A = global.A;

        function hiddenRef() {
          throw new Error('Unexpected hiddenRef() invocation.');
        }

        export default function App() {
          return (
            <Activity mode="hidden">
              <A ref={hiddenRef} />
            </Activity>
          );
        };
      `;

      await render(code);
      await patch(code);
    });

    it('reloads HOCs if they return functions', async () => {
      if (__DEV__) {
        await render(`
          function hoc(letter) {
            return function() {
              return <h1>{letter}1</h1>;
            }
          }

          export default function Parent() {
            return <Child />;
          }

          const Child = hoc('A');
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          function hoc(letter) {
            return function() {
              return <h1>{letter}2</h1>;
            }
          }

          export default function Parent() {
            return React.createElement(Child);
          }

          const Child = hoc('B');
        `);
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B2');
      }
    });

    it('resets state when renaming a state variable', async () => {
      if (__DEV__) {
        await render(`
          const {useState} = React;
          const S = 1;

          export default function App() {
            const [foo, setFoo] = useState(S);
            return <h1>A{foo}</h1>;
          }
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A1');

        await patch(`
          const {useState} = React;
          const S = 2;

          export default function App() {
            const [foo, setFoo] = useState(S);
            return <h1>B{foo}</h1>;
          }
        `);
        // Same state variable name, so state is preserved.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B1');

        await patch(`
          const {useState} = React;
          const S = 3;

          export default function App() {
            const [bar, setBar] = useState(S);
            return <h1>C{bar}</h1>;
          }
        `);
        // Different state variable name, so state is reset.
        expect(container.firstChild).not.toBe(el);
        const newEl = container.firstChild;
        expect(newEl.textContent).toBe('C3');
      }
    });

    it('resets state when renaming a state variable in a HOC', async () => {
      if (__DEV__) {
        await render(`
          const {useState} = React;
          const S = 1;

          function hoc(Wrapped) {
            return function Generated() {
              const [foo, setFoo] = useState(S);
              return <Wrapped value={foo} />;
            };
          }

          export default hoc(({ value }) => {
            return <h1>A{value}</h1>;
          });
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A1');

        await patch(`
          const {useState} = React;
          const S = 2;

          function hoc(Wrapped) {
            return function Generated() {
              const [foo, setFoo] = useState(S);
              return <Wrapped value={foo} />;
            };
          }

          export default hoc(({ value }) => {
            return <h1>B{value}</h1>;
          });
        `);
        // Same state variable name, so state is preserved.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B1');

        await patch(`
          const {useState} = React;
          const S = 3;

          function hoc(Wrapped) {
            return function Generated() {
              const [bar, setBar] = useState(S);
              return <Wrapped value={bar} />;
            };
          }

          export default hoc(({ value }) => {
            return <h1>C{value}</h1>;
          });
        `);
        // Different state variable name, so state is reset.
        expect(container.firstChild).not.toBe(el);
        const newEl = container.firstChild;
        expect(newEl.textContent).toBe('C3');
      }
    });

    it('resets state when renaming a state variable in a HOC with indirection', async () => {
      if (__DEV__) {
        await render(`
          const {useState} = React;
          const S = 1;

          function hoc(Wrapped) {
            return function Generated() {
              const [foo, setFoo] = useState(S);
              return <Wrapped value={foo} />;
            };
          }

          function Indirection({ value }) {
            return <h1>A{value}</h1>;
          }

          export default hoc(Indirection);
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A1');

        await patch(`
          const {useState} = React;
          const S = 2;

          function hoc(Wrapped) {
            return function Generated() {
              const [foo, setFoo] = useState(S);
              return <Wrapped value={foo} />;
            };
          }

          function Indirection({ value }) {
            return <h1>B{value}</h1>;
          }

          export default hoc(Indirection);
        `);
        // Same state variable name, so state is preserved.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B1');

        await patch(`
          const {useState} = React;
          const S = 3;

          function hoc(Wrapped) {
            return function Generated() {
              const [bar, setBar] = useState(S);
              return <Wrapped value={bar} />;
            };
          }

          function Indirection({ value }) {
            return <h1>C{value}</h1>;
          }

          export default hoc(Indirection);
        `);
        // Different state variable name, so state is reset.
        expect(container.firstChild).not.toBe(el);
        const newEl = container.firstChild;
        expect(newEl.textContent).toBe('C3');
      }
    });

    it('resets state when renaming a state variable inside a HOC with direct call', async () => {
      if (__DEV__) {
        await render(`
          const {useState} = React;
          const S = 1;

          function hocWithDirectCall(Wrapped) {
            return function Generated() {
              return Wrapped();
            };
          }

          export default hocWithDirectCall(() => {
            const [foo, setFoo] = useState(S);
            return <h1>A{foo}</h1>;
          });
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A1');

        await patch(`
          const {useState} = React;
          const S = 2;

          function hocWithDirectCall(Wrapped) {
            return function Generated() {
              return Wrapped();
            };
          }

          export default hocWithDirectCall(() => {
            const [foo, setFoo] = useState(S);
            return <h1>B{foo}</h1>;
          });
        `);
        // Same state variable name, so state is preserved.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B1');

        await patch(`
          const {useState} = React;
          const S = 3;

          function hocWithDirectCall(Wrapped) {
            return function Generated() {
              return Wrapped();
            };
          }

          export default hocWithDirectCall(() => {
            const [bar, setBar] = useState(S);
            return <h1>C{bar}</h1>;
          });
        `);
        // Different state variable name, so state is reset.
        expect(container.firstChild).not.toBe(el);
        const newEl = container.firstChild;
        expect(newEl.textContent).toBe('C3');
      }
    });

    it('does not crash when changing Hook order inside a HOC with direct call', async () => {
      if (__DEV__) {
        await render(`
          const {useEffect} = React;

          function hocWithDirectCall(Wrapped) {
            return function Generated() {
              return Wrapped();
            };
          }

          export default hocWithDirectCall(() => {
            useEffect(() => {}, []);
            return <h1>A</h1>;
          });
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A');

        await patch(`
          const {useEffect} = React;

          function hocWithDirectCall(Wrapped) {
            return function Generated() {
              return Wrapped();
            };
          }

          export default hocWithDirectCall(() => {
            useEffect(() => {}, []);
            useEffect(() => {}, []);
            return <h1>B</h1>;
          });
        `);
        // Hook order changed, so we remount.
        expect(container.firstChild).not.toBe(el);
        const newEl = container.firstChild;
        expect(newEl.textContent).toBe('B');
      }
    });

    it('does not crash when changing Hook order inside a memo-ed HOC with direct call', async () => {
      if (__DEV__) {
        await render(`
          const {useEffect, memo} = React;

          function hocWithDirectCall(Wrapped) {
            return memo(function Generated() {
              return Wrapped();
            });
          }

          export default hocWithDirectCall(() => {
            useEffect(() => {}, []);
            return <h1>A</h1>;
          });
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A');

        await patch(`
          const {useEffect, memo} = React;

          function hocWithDirectCall(Wrapped) {
            return memo(function Generated() {
              return Wrapped();
            });
          }

          export default hocWithDirectCall(() => {
            useEffect(() => {}, []);
            useEffect(() => {}, []);
            return <h1>B</h1>;
          });
        `);
        // Hook order changed, so we remount.
        expect(container.firstChild).not.toBe(el);
        const newEl = container.firstChild;
        expect(newEl.textContent).toBe('B');
      }
    });

    it('does not crash when changing Hook order inside a memo+forwardRef-ed HOC with direct call', async () => {
      if (__DEV__) {
        await render(`
          const {useEffect, memo, forwardRef} = React;

          function hocWithDirectCall(Wrapped) {
            return memo(forwardRef(function Generated() {
              return Wrapped();
            }));
          }

          export default hocWithDirectCall(() => {
            useEffect(() => {}, []);
            return <h1>A</h1>;
          });
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A');

        await patch(`
          const {useEffect, memo, forwardRef} = React;

          function hocWithDirectCall(Wrapped) {
            return memo(forwardRef(function Generated() {
              return Wrapped();
            }));
          }

          export default hocWithDirectCall(() => {
            useEffect(() => {}, []);
            useEffect(() => {}, []);
            return <h1>B</h1>;
          });
        `);
        // Hook order changed, so we remount.
        expect(container.firstChild).not.toBe(el);
        const newEl = container.firstChild;
        expect(newEl.textContent).toBe('B');
      }
    });

    it('does not crash when changing Hook order inside a HOC returning an object', async () => {
      if (__DEV__) {
        await render(`
          const {useEffect} = React;

          function hocWithDirectCall(Wrapped) {
            return {Wrapped: Wrapped};
          }

          export default hocWithDirectCall(() => {
            useEffect(() => {}, []);
            return <h1>A</h1>;
          }).Wrapped;
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A');

        await patch(`
          const {useEffect} = React;

          function hocWithDirectCall(Wrapped) {
            return {Wrapped: Wrapped};
          }

          export default hocWithDirectCall(() => {
            useEffect(() => {}, []);
            useEffect(() => {}, []);
            return <h1>B</h1>;
          }).Wrapped;
        `);
        // Hook order changed, so we remount.
        expect(container.firstChild).not.toBe(el);
        const newEl = container.firstChild;
        expect(newEl.textContent).toBe('B');
      }
    });

    it('resets effects while preserving state', async () => {
      if (__DEV__) {
        await render(`
          const {useState} = React;

          export default function App() {
            const [value, setValue] = useState(0);
            return <h1>A{value}</h1>;
          }
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('A0');

        // Add an effect.
        await patch(`
          const {useState} = React;

          export default function App() {
            const [value, setValue] = useState(0);
            React.useEffect(() => {
              Scheduler.log('B mount');
              setValue(1)
              return () => {
                Scheduler.log('B unmount');
              };
            }, []);
            return <h1>B{value}</h1>;
          }
        `);

        // We added an effect, thereby changing Hook order.
        // This causes a remount.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('B1');
        assertLog(['B mount']);

        await patch(`
          const {useState} = React;

          export default function App() {
            const [value, setValue] = useState(0);
            React.useEffect(() => {
              Scheduler.log('C mount');
              return () => {
                Scheduler.log('C unmount');
              };
            }, []);
            return <h1>C{value}</h1>;
          }
        `);
        // Same Hooks are called, so state is preserved.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('C1');

        // Effects are always reset, so effect B was unmounted and C was mounted.
        assertLog(['B unmount', 'C mount']);

        await patch(`
          const {useState} = React;

          export default function App() {
            const [value, setValue] = useState(0);
            return <h1>D{value}</h1>;
          }
        `);
        // Removing the effect changes the signature
        // and causes the component to remount.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('D0');
        assertLog(['C unmount']);
      }
    });

    it('does not get confused when custom hooks are reordered', async () => {
      if (__DEV__) {
        await render(`
          function useFancyState(initialState) {
            return React.useState(initialState);
          }

          const App = () => {
            const [x, setX] = useFancyState('X');
            const [y, setY] = useFancyState('Y');
            return <h1>A{x}{y}</h1>;
          };

          export default App;
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('AXY');

        await patch(`
          function useFancyState(initialState) {
            return React.useState(initialState);
          }

          const App = () => {
            const [x, setX] = useFancyState('X');
            const [y, setY] = useFancyState('Y');
            return <h1>B{x}{y}</h1>;
          };

          export default App;
        `);
        // Same state variables, so no remount.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('BXY');

        await patch(`
          function useFancyState(initialState) {
            return React.useState(initialState);
          }

          const App = () => {
            const [y, setY] = useFancyState('Y');
            const [x, setX] = useFancyState('X');
            return <h1>B{x}{y}</h1>;
          };

          export default App;
        `);
        // Hooks were re-ordered. This causes a remount.
        // Therefore, Hook calls don't accidentally share state.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('BXY');
      }
    });

    it('does not get confused when component is called early', async () => {
      if (__DEV__) {
        await render(`
          // This isn't really a valid pattern but it's close enough
          // to simulate what happens when you call ReactDOM.render
          // in the same file. We want to ensure this doesn't confuse
          // the runtime.
          App();

          function App() {
            const [x, setX] = useFancyState('X');
            const [y, setY] = useFancyState('Y');
            return <h1>A{x}{y}</h1>;
          };

          function useFancyState(initialState) {
            // No real Hook calls to avoid triggering invalid call invariant.
            // We only want to verify that we can still call this function early.
            return initialState;
          }

          export default App;
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('AXY');

        await patch(`
          // This isn't really a valid pattern but it's close enough
          // to simulate what happens when you call ReactDOM.render
          // in the same file. We want to ensure this doesn't confuse
          // the runtime.
          App();

          function App() {
            const [x, setX] = useFancyState('X');
            const [y, setY] = useFancyState('Y');
            return <h1>B{x}{y}</h1>;
          };

          function useFancyState(initialState) {
            // No real Hook calls to avoid triggering invalid call invariant.
            // We only want to verify that we can still call this function early.
            return initialState;
          }

          export default App;
        `);
        // Same state variables, so no remount.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('BXY');

        await patch(`
          // This isn't really a valid pattern but it's close enough
          // to simulate what happens when you call ReactDOM.render
          // in the same file. We want to ensure this doesn't confuse
          // the runtime.
          App();

          function App() {
            const [y, setY] = useFancyState('Y');
            const [x, setX] = useFancyState('X');
            return <h1>B{x}{y}</h1>;
          };

          function useFancyState(initialState) {
            // No real Hook calls to avoid triggering invalid call invariant.
            // We only want to verify that we can still call this function early.
            return initialState;
          }

          export default App;
        `);
        // Hooks were re-ordered. This causes a remount.
        // Therefore, Hook calls don't accidentally share state.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('BXY');
      }
    });

    it('does not get confused by Hooks defined inline', async () => {
      // This is not a recommended pattern but at least it shouldn't break.
      if (__DEV__) {
        await render(`
          const App = () => {
            const useFancyState = (initialState) => {
              const result = React.useState(initialState);
              return result;
            };
            const [x, setX] = useFancyState('X1');
            const [y, setY] = useFancyState('Y1');
            return <h1>A{x}{y}</h1>;
          };

          export default App;
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('AX1Y1');

        await patch(`
          const App = () => {
            const useFancyState = (initialState) => {
              const result = React.useState(initialState);
              return result;
            };
            const [x, setX] = useFancyState('X2');
            const [y, setY] = useFancyState('Y2');
            return <h1>B{x}{y}</h1>;
          };

          export default App;
        `);
        // Remount even though nothing changed because
        // the custom Hook is inside -- and so we don't
        // really know whether its signature has changed.
        // We could potentially make it work, but for now
        // let's assert we don't crash with confusing errors.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('BX2Y2');
      }
    });

    it('remounts component if custom hook it uses changes order', async () => {
      if (__DEV__) {
        await render(`
          const App = () => {
            const [x, setX] = useFancyState('X');
            const [y, setY] = useFancyState('Y');
            return <h1>A{x}{y}</h1>;
          };

          const useFancyState = (initialState) => {
            const result = useIndirection(initialState);
            return result;
          };

          function useIndirection(initialState) {
            return React.useState(initialState);
          }

          export default App;
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('AXY');

        await patch(`
          const App = () => {
            const [x, setX] = useFancyState('X');
            const [y, setY] = useFancyState('Y');
            return <h1>B{x}{y}</h1>;
          };

          const useFancyState = (initialState) => {
            const result = useIndirection();
            return result;
          };

          function useIndirection(initialState) {
            return React.useState(initialState);
          }

          export default App;
        `);
        // We didn't change anything except the header text.
        // So we don't expect a remount.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('BXY');

        await patch(`
          const App = () => {
            const [x, setX] = useFancyState('X');
            const [y, setY] = useFancyState('Y');
            return <h1>C{x}{y}</h1>;
          };

          const useFancyState = (initialState) => {
            const result = useIndirection(initialState);
            return result;
          };

          function useIndirection(initialState) {
            React.useEffect(() => {});
            return React.useState(initialState);
          }

          export default App;
        `);
        // The useIndirection Hook added an affect,
        // so we had to remount the component.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('CXY');

        await patch(`
          const App = () => {
            const [x, setX] = useFancyState('X');
            const [y, setY] = useFancyState('Y');
            return <h1>D{x}{y}</h1>;
          };

          const useFancyState = (initialState) => {
            const result = useIndirection();
            return result;
          };

          function useIndirection(initialState) {
            React.useEffect(() => {});
            return React.useState(initialState);
          }

          export default App;
        `);
        // We didn't change anything except the header text.
        // So we don't expect a remount.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('DXY');
      }
    });

    it('does not lose the inferred arrow names', async () => {
      if (__DEV__) {
        await render(`
          const Parent = () => {
            return <Child/>;
          };

          const Child = () => {
            useMyThing();
            return <h1>{Parent.name} {Child.name} {useMyThing.name}</h1>;
          };

          const useMyThing = () => {
            React.useState();
          };

          export default Parent;
        `);
        expect(container.textContent).toBe('Parent Child useMyThing');
      }
    });

    it('does not lose the inferred function names', async () => {
      if (__DEV__) {
        await render(`
          var Parent = function() {
            return <Child/>;
          };

          var Child = function() {
            useMyThing();
            return <h1>{Parent.name} {Child.name} {useMyThing.name}</h1>;
          };

          var useMyThing = function() {
            React.useState();
          };

          export default Parent;
        `);
        expect(container.textContent).toBe('Parent Child useMyThing');
      }
    });

    it('resets state on every edit with @refresh reset annotation', async () => {
      if (__DEV__) {
        await render(`
          const {useState} = React;
          const S = 1;

          export default function App() {
            const [foo, setFoo] = useState(S);
            return <h1>A{foo}</h1>;
          }
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('A1');

        await patch(`
          const {useState} = React;
          const S = 2;

          export default function App() {
            const [foo, setFoo] = useState(S);
            return <h1>B{foo}</h1>;
          }
        `);
        // Same state variable name, so state is preserved.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B1');

        await patch(`
          const {useState} = React;
          const S = 3;

          /* @refresh reset */

          export default function App() {
            const [foo, setFoo] = useState(S);
            return <h1>C{foo}</h1>;
          }
        `);
        // Found remount annotation, so state is reset.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('C3');

        await patch(`
          const {useState} = React;
          const S = 4;

          export default function App() {

            // @refresh reset

            const [foo, setFoo] = useState(S);
            return <h1>D{foo}</h1>;
          }
        `);
        // Found remount annotation, so state is reset.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('D4');

        await patch(`
          const {useState} = React;
          const S = 5;

          export default function App() {
            const [foo, setFoo] = useState(S);
            return <h1>E{foo}</h1>;
          }
        `);
        // There is no remount annotation anymore,
        // so preserve the previous state.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('E4');

        await patch(`
          const {useState} = React;
          const S = 6;

          export default function App() {
            const [foo, setFoo] = useState(S);
            return <h1>F{foo}</h1>;
          }
        `);
        // Continue editing.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('F4');

        await patch(`
          const {useState} = React;
          const S = 7;

          export default function App() {

            /* @refresh reset */

            const [foo, setFoo] = useState(S);
            return <h1>G{foo}</h1>;
          }
        `);
        // Force remount one last time.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('G7');
      }
    });

    // This is best effort for simple cases.
    // We won't attempt to resolve identifiers.
    it('resets state when useState initial state is edited', async () => {
      if (__DEV__) {
        await render(`
          const {useState} = React;

          export default function App() {
            const [foo, setFoo] = useState(1);
            return <h1>A{foo}</h1>;
          }
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('A1');

        await patch(`
          const {useState} = React;

          export default function App() {
            const [foo, setFoo] = useState(1);
            return <h1>B{foo}</h1>;
          }
        `);
        // Same initial state, so it's preserved.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B1');

        await patch(`
          const {useState} = React;

          export default function App() {
            const [foo, setFoo] = useState(2);
            return <h1>C{foo}</h1>;
          }
        `);
        // Different initial state, so state is reset.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('C2');
      }
    });

    // This is best effort for simple cases.
    // We won't attempt to resolve identifiers.
    it('resets state when useReducer initial state is edited', async () => {
      if (__DEV__) {
        await render(`
          const {useReducer} = React;

          export default function App() {
            const [foo, setFoo] = useReducer(x => x, 1);
            return <h1>A{foo}</h1>;
          }
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('A1');

        await patch(`
          const {useReducer} = React;

          export default function App() {
            const [foo, setFoo] = useReducer(x => x, 1);
            return <h1>B{foo}</h1>;
          }
        `);
        // Same initial state, so it's preserved.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B1');

        await patch(`
          const {useReducer} = React;

          export default function App() {
            const [foo, setFoo] = useReducer(x => x, 2);
            return <h1>C{foo}</h1>;
          }
        `);
        // Different initial state, so state is reset.
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('C2');
      }
    });

    it('remounts when switching export from function to class', async () => {
      if (__DEV__) {
        await render(`
          export default function App() {
            return <h1>A1</h1>;
          }
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          export default function App() {
            return <h1>A2</h1>;
          }
        `);
        // Keep state.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('A2');

        await patch(`
          export default class App extends React.Component {
            render() {
              return <h1>B1</h1>
            }
          }
        `);
        // Reset (function -> class).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('B1');
        await patch(`
          export default class App extends React.Component {
            render() {
              return <h1>B2</h1>
            }
          }
        `);
        // Reset (classes always do).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('B2');

        await patch(`
          export default function App() {
            return <h1>C1</h1>;
          }
        `);
        // Reset (class -> function).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('C1');
        await patch(`
          export default function App() {
            return <h1>C2</h1>;
          }
        `);
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('C2');

        await patch(`
          export default function App() {
            return <h1>D1</h1>;
          }
        `);
        el = container.firstChild;
        expect(el.textContent).toBe('D1');
        await patch(`
          export default function App() {
            return <h1>D2</h1>;
          }
        `);
        // Keep state.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('D2');
      }
    });

    it('remounts when switching export from class to function', async () => {
      if (__DEV__) {
        await render(`
          export default class App extends React.Component {
            render() {
              return <h1>A1</h1>
            }
          }
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          export default class App extends React.Component {
            render() {
              return <h1>A2</h1>
            }
          }
        `);
        // Reset (classes always do).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('A2');

        await patch(`
          export default function App() {
            return <h1>B1</h1>;
          }
        `);
        // Reset (class -> function).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('B1');
        await patch(`
          export default function App() {
            return <h1>B2</h1>;
          }
        `);
        // Keep state.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B2');

        await patch(`
          export default class App extends React.Component {
            render() {
              return <h1>C1</h1>
            }
          }
        `);
        // Reset (function -> class).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('C1');
      }
    });

    it('remounts when wrapping export in a HOC', async () => {
      if (__DEV__) {
        await render(`
          export default function App() {
            return <h1>A1</h1>;
          }
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          export default function App() {
            return <h1>A2</h1>;
          }
        `);
        // Keep state.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('A2');

        await patch(`
          function hoc(Inner) {
            return function Wrapper() {
              return <Inner />;
            }
          }

          function App() {
            return <h1>B1</h1>;
          }

          export default hoc(App);
        `);
        // Reset (wrapped in HOC).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('B1');
        await patch(`
          function hoc(Inner) {
            return function Wrapper() {
              return <Inner />;
            }
          }

          function App() {
            return <h1>B2</h1>;
          }

          export default hoc(App);
        `);
        // Keep state.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B2');

        await patch(`
          export default function App() {
            return <h1>C1</h1>;
          }
        `);
        // Reset (unwrapped).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('C1');
        await patch(`
          export default function App() {
            return <h1>C2</h1>;
          }
        `);
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('C2');
      }
    });

    it('remounts when wrapping export in memo()', async () => {
      if (__DEV__) {
        await render(`
          export default function App() {
            return <h1>A1</h1>;
          }
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          export default function App() {
            return <h1>A2</h1>;
          }
        `);
        // Keep state.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('A2');

        await patch(`
          function App() {
            return <h1>B1</h1>;
          }

          export default React.memo(App);
        `);
        // Reset (wrapped in HOC).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('B1');
        await patch(`
          function App() {
            return <h1>B2</h1>;
          }

          export default React.memo(App);
        `);
        // Keep state.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B2');

        await patch(`
          export default function App() {
            return <h1>C1</h1>;
          }
        `);
        // Reset (unwrapped).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('C1');
        await patch(`
          export default function App() {
            return <h1>C2</h1>;
          }
        `);
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('C2');
      }
    });

    it('remounts when wrapping export in forwardRef()', async () => {
      if (__DEV__) {
        await render(`
          export default function App() {
            return <h1>A1</h1>;
          }
        `);
        let el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          export default function App() {
            return <h1>A2</h1>;
          }
        `);
        // Keep state.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('A2');

        await patch(`
          function App() {
            return <h1>B1</h1>;
          }

          export default React.forwardRef(App);
        `);
        // Reset (wrapped in HOC).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('B1');
        await patch(`
          function App() {
            return <h1>B2</h1>;
          }

          export default React.forwardRef(App);
        `);
        // Keep state.
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B2');

        await patch(`
          export default function App() {
            return <h1>C1</h1>;
          }
        `);
        // Reset (unwrapped).
        expect(container.firstChild).not.toBe(el);
        el = container.firstChild;
        expect(el.textContent).toBe('C1');
        await patch(`
          export default function App() {
            return <h1>C2</h1>;
          }
        `);
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('C2');
      }
    });

    it('resets useMemoCache cache slots', async () => {
      if (__DEV__) {
        await render(`
          const useMemoCache = require('react/compiler-runtime').c;
          let cacheMisses = 0;
          const cacheMiss = (id) => {
            cacheMisses++;
            return id;
          };
          export default function App(t0) {
            const $ = useMemoCache(1);
            const {reset1} = t0;
            let t1;
            if ($[0] !== reset1) {
              $[0] = t1 = cacheMiss({reset1});
            } else {
              t1 = $[1];
            }
            return <h1>{cacheMisses}</h1>;
          }
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('1');
        await patch(`
          const useMemoCache = require('react/compiler-runtime').c;
          let cacheMisses = 0;
          const cacheMiss = (id) => {
            cacheMisses++;
            return id;
          };
          export default function App(t0) {
            const $ = useMemoCache(2);
            const {reset1, reset2} = t0;
            let t1;
            if ($[0] !== reset1) {
              $[0] = t1 = cacheMiss({reset1});
            } else {
              t1 = $[1];
            }
            let t2;
            if ($[1] !== reset2) {
              $[1] = t2 = cacheMiss({reset2});
            } else {
              t2 = $[1];
            }
            return <h1>{cacheMisses}</h1>;
          }
        `);
        expect(container.firstChild).toBe(el);
        // cache size changed between refreshes
        expect(el.textContent).toBe('2');
      }
    });

    describe('with inline requires', () => {
      beforeEach(() => {
        global.FakeModuleSystem = {};
      });

      afterEach(() => {
        delete global.FakeModuleSystem;
      });

      it('remounts component if custom hook it uses changes order on first edit', async () => {
        // This test verifies that remounting works even if calls to custom Hooks
        // were transformed with an inline requires transform, like we have on RN.
        // Inline requires make it harder to compare previous and next signatures
        // because useFancyState inline require always resolves to the newest version.
        // We're not actually using inline requires in the test, but it has similar semantics.
        if (__DEV__) {
          await render(`
            const FakeModuleSystem = global.FakeModuleSystem;

            FakeModuleSystem.useFancyState = function(initialState) {
              return React.useState(initialState);
            };

            const App = () => {
              const [x, setX] = FakeModuleSystem.useFancyState('X');
              const [y, setY] = FakeModuleSystem.useFancyState('Y');
              return <h1>A{x}{y}</h1>;
            };

            export default App;
          `);
          let el = container.firstChild;
          expect(el.textContent).toBe('AXY');

          await patch(`
            const FakeModuleSystem = global.FakeModuleSystem;

            FakeModuleSystem.useFancyState = function(initialState) {
              React.useEffect(() => {});
              return React.useState(initialState);
            };

            const App = () => {
              const [x, setX] = FakeModuleSystem.useFancyState('X');
              const [y, setY] = FakeModuleSystem.useFancyState('Y');
              return <h1>B{x}{y}</h1>;
            };

            export default App;
          `);
          // The useFancyState Hook added an effect,
          // so we had to remount the component.
          expect(container.firstChild).not.toBe(el);
          el = container.firstChild;
          expect(el.textContent).toBe('BXY');

          await patch(`
            const FakeModuleSystem = global.FakeModuleSystem;

            FakeModuleSystem.useFancyState = function(initialState) {
              React.useEffect(() => {});
              return React.useState(initialState);
            };

            const App = () => {
              const [x, setX] = FakeModuleSystem.useFancyState('X');
              const [y, setY] = FakeModuleSystem.useFancyState('Y');
              return <h1>C{x}{y}</h1>;
            };

            export default App;
          `);
          // We didn't change anything except the header text.
          // So we don't expect a remount.
          expect(container.firstChild).toBe(el);
          expect(el.textContent).toBe('CXY');
        }
      });

      it('remounts component if custom hook it uses changes order on second edit', async () => {
        if (__DEV__) {
          await render(`
            const FakeModuleSystem = global.FakeModuleSystem;

            FakeModuleSystem.useFancyState = function(initialState) {
              return React.useState(initialState);
            };

            const App = () => {
              const [x, setX] = FakeModuleSystem.useFancyState('X');
              const [y, setY] = FakeModuleSystem.useFancyState('Y');
              return <h1>A{x}{y}</h1>;
            };

            export default App;
          `);
          let el = container.firstChild;
          expect(el.textContent).toBe('AXY');

          await patch(`
            const FakeModuleSystem = global.FakeModuleSystem;

            FakeModuleSystem.useFancyState = function(initialState) {
              return React.useState(initialState);
            };

            const App = () => {
              const [x, setX] = FakeModuleSystem.useFancyState('X');
              const [y, setY] = FakeModuleSystem.useFancyState('Y');
              return <h1>B{x}{y}</h1>;
            };

            export default App;
          `);
          expect(container.firstChild).toBe(el);
          expect(el.textContent).toBe('BXY');

          await patch(`
            const FakeModuleSystem = global.FakeModuleSystem;

            FakeModuleSystem.useFancyState = function(initialState) {
              React.useEffect(() => {});
              return React.useState(initialState);
            };

            const App = () => {
              const [x, setX] = FakeModuleSystem.useFancyState('X');
              const [y, setY] = FakeModuleSystem.useFancyState('Y');
              return <h1>C{x}{y}</h1>;
            };

            export default App;
          `);
          // The useFancyState Hook added an effect,
          // so we had to remount the component.
          expect(container.firstChild).not.toBe(el);
          el = container.firstChild;
          expect(el.textContent).toBe('CXY');

          await patch(`
            const FakeModuleSystem = global.FakeModuleSystem;

            FakeModuleSystem.useFancyState = function(initialState) {
              React.useEffect(() => {});
              return React.useState(initialState);
            };

            const App = () => {
              const [x, setX] = FakeModuleSystem.useFancyState('X');
              const [y, setY] = FakeModuleSystem.useFancyState('Y');
              return <h1>D{x}{y}</h1>;
            };

            export default App;
          `);
          // We didn't change anything except the header text.
          // So we don't expect a remount.
          expect(container.firstChild).toBe(el);
          expect(el.textContent).toBe('DXY');
        }
      });

      it('recovers if evaluating Hook list throws', async () => {
        if (__DEV__) {
          await render(`
          let FakeModuleSystem = null;

          global.FakeModuleSystem.useFancyState = function(initialState) {
            return React.useState(initialState);
          };

          const App = () => {
            FakeModuleSystem = global.FakeModuleSystem;
            const [x, setX] = FakeModuleSystem.useFancyState('X');
            const [y, setY] = FakeModuleSystem.useFancyState('Y');
            return <h1>A{x}{y}</h1>;
          };

          export default App;
        `);
          let el = container.firstChild;
          expect(el.textContent).toBe('AXY');

          await patch(`
          let FakeModuleSystem = null;

          global.FakeModuleSystem.useFancyState = function(initialState) {
            React.useEffect(() => {});
            return React.useState(initialState);
          };

          const App = () => {
            FakeModuleSystem = global.FakeModuleSystem;
            const [x, setX] = FakeModuleSystem.useFancyState('X');
            const [y, setY] = FakeModuleSystem.useFancyState('Y');
            return <h1>B{x}{y}</h1>;
          };

          export default App;
        `);
          // We couldn't evaluate the Hook signatures
          // so we had to remount the component.
          expect(container.firstChild).not.toBe(el);
          el = container.firstChild;
          expect(el.textContent).toBe('BXY');
        }
      });

      it('remounts component if custom hook it uses changes order behind an indirection', async () => {
        if (__DEV__) {
          await render(`
            const FakeModuleSystem = global.FakeModuleSystem;

            FakeModuleSystem.useFancyState = function(initialState) {
              return FakeModuleSystem.useIndirection(initialState);
            };

            FakeModuleSystem.useIndirection = function(initialState) {
              return FakeModuleSystem.useOtherIndirection(initialState);
            };

            FakeModuleSystem.useOtherIndirection = function(initialState) {
              return React.useState(initialState);
            };

            const App = () => {
              const [x, setX] = FakeModuleSystem.useFancyState('X');
              const [y, setY] = FakeModuleSystem.useFancyState('Y');
              return <h1>A{x}{y}</h1>;
            };

            export default App;
          `);
          let el = container.firstChild;
          expect(el.textContent).toBe('AXY');

          await patch(`
            const FakeModuleSystem = global.FakeModuleSystem;

            FakeModuleSystem.useFancyState = function(initialState) {
              return FakeModuleSystem.useIndirection(initialState);
            };

            FakeModuleSystem.useIndirection = function(initialState) {
              return FakeModuleSystem.useOtherIndirection(initialState);
            };

            FakeModuleSystem.useOtherIndirection = function(initialState) {
              React.useEffect(() => {});
              return React.useState(initialState);
            };

            const App = () => {
              const [x, setX] = FakeModuleSystem.useFancyState('X');
              const [y, setY] = FakeModuleSystem.useFancyState('Y');
              return <h1>B{x}{y}</h1>;
            };

            export default App;
          `);

          // The useFancyState Hook added an effect,
          // so we had to remount the component.
          expect(container.firstChild).not.toBe(el);
          el = container.firstChild;
          expect(el.textContent).toBe('BXY');

          await patch(`
            const FakeModuleSystem = global.FakeModuleSystem;

            FakeModuleSystem.useFancyState = function(initialState) {
              return FakeModuleSystem.useIndirection(initialState);
            };

            FakeModuleSystem.useIndirection = function(initialState) {
              return FakeModuleSystem.useOtherIndirection(initialState);
            };

            FakeModuleSystem.useOtherIndirection = function(initialState) {
              React.useEffect(() => {});
              return React.useState(initialState);
            };

            const App = () => {
              const [x, setX] = FakeModuleSystem.useFancyState('X');
              const [y, setY] = FakeModuleSystem.useFancyState('Y');
              return <h1>C{x}{y}</h1>;
            };

            export default App;
          `);
          // We didn't change anything except the header text.
          // So we don't expect a remount.
          expect(container.firstChild).toBe(el);
          expect(el.textContent).toBe('CXY');
        }
      });
    });
  }

  function testTypeScript(render, patch) {
    it('reloads component exported in typescript namespace', async () => {
      if (__DEV__) {
        await render(`
          namespace Foo {
            export namespace Bar {
              export const Child = ({prop}) => {
                return <h1>{prop}1</h1>
              };
            }
          }

          export default function Parent() {
            return <Foo.Bar.Child prop={'A'} />;
          }
        `);
        const el = container.firstChild;
        expect(el.textContent).toBe('A1');
        await patch(`
          namespace Foo {
            export namespace Bar {
              export const Child = ({prop}) => {
                return <h1>{prop}2</h1>
              };
            }
          }

          export default function Parent() {
            return <Foo.Bar.Child prop={'B'} />;
          }
        `);
        expect(container.firstChild).toBe(el);
        expect(el.textContent).toBe('B2');
      }
    });
  }
});
