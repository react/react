/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment node
 */

'use strict';

const ESLintTesterV7 = require('eslint-v7').RuleTester;
const ESLintTesterV9 = require('eslint-v9').RuleTester;
const ReactHooksESLintPlugin = require('eslint-plugin-react-hooks');
const ReactHooksESLintRule =
  ReactHooksESLintPlugin.default.rules['exhaustive-deps'];

/**
 * A string template tag that removes padding from the left side of multi-line strings
 * @param {Array} strings array of code strings (only one expected)
 */
function normalizeIndent(strings) {
  const codeLines = strings[0].split('\n');
  const leftPadding = codeLines[1].match(/\s+/)[0];
  return codeLines.map(line => line.slice(leftPadding.length)).join('\n');
}

// ***************************************************
// For easier local testing, you can add to any case:
// {
//   skip: true,
//   --or--
//   only: true,
//   ...
// }
// ***************************************************

// Tests that are valid/invalid across all parsers
const tests = {
  valid: [
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            console.log(local);
          });
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          useEffect(() => {
            const local = {};
            console.log(local);
          }, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = someFunc();
          useEffect(() => {
            console.log(local);
          }, [local]);
        }
      `,
    },
    {
      // OK because `props` wasn't defined.
      // We don't technically know if `props` is supposed
      // to be an import that hasn't been added yet, or
      // a component-level variable. Ignore it until it
      //  gets defined (a different rule would flag it anyway).
      code: normalizeIndent`
        function MyComponent() {
          useEffect(() => {
            console.log(props.foo);
          }, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local1 = {};
          {
            const local2 = {};
            useEffect(() => {
              console.log(local1);
              console.log(local2);
            });
          }
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local1 = someFunc();
          {
            const local2 = someFunc();
            useCallback(() => {
              console.log(local1);
              console.log(local2);
            }, [local1, local2]);
          }
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local1 = someFunc();
          function MyNestedComponent() {
            const local2 = someFunc();
            useCallback(() => {
              console.log(local1);
              console.log(local2);
            }, [local2]);
          }
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = someFunc();
          useEffect(() => {
            console.log(local);
            console.log(local);
          }, [local]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          useEffect(() => {
            console.log(unresolved);
          }, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = someFunc();
          useEffect(() => {
            console.log(local);
          }, [,,,local,,,]);
        }
      `,
    },
    {
      // Regression test
      code: normalizeIndent`
        function MyComponent({ foo }) {
          useEffect(() => {
            console.log(foo.length);
          }, [foo]);
        }
      `,
    },
    {
      // Regression test
      code: normalizeIndent`
        function MyComponent({ foo }) {
          useEffect(() => {
            console.log(foo.length);
            console.log(foo.slice(0));
          }, [foo]);
        }
      `,
    },
    {
      // Regression test
      code: normalizeIndent`
        function MyComponent({ history }) {
          useEffect(() => {
            return history.listen();
          }, [history]);
        }
      `,
    },
    {
      // Valid because they have meaning without deps.
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {});
          useLayoutEffect(() => {});
          useImperativeHandle(props.innerRef, () => {});
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo);
          }, [props.foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo);
            console.log(props.bar);
          }, [props.bar, props.foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo);
            console.log(props.bar);
          }, [props.foo, props.bar]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const local = someFunc();
          useEffect(() => {
            console.log(props.foo);
            console.log(props.bar);
            console.log(local);
          }, [props.foo, props.bar, local]);
        }
      `,
    },
    {
      // [props, props.foo] is technically unnecessary ('props' covers 'props.foo').
      // However, it's valid for effects to over-specify their deps.
      // So we don't warn about this. We *would* warn about useMemo/useCallback.
      code: normalizeIndent`
        function MyComponent(props) {
          const local = {};
          useEffect(() => {
            console.log(props.foo);
            console.log(props.bar);
          }, [props, props.foo]);

          let color = someFunc();
          useEffect(() => {
            console.log(props.foo.bar.baz);
            console.log(color);
          }, [props.foo, props.foo.bar.baz, color]);
        }
      `,
    },
    // Nullish coalescing and optional chaining
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo?.bar?.baz ?? null);
          }, [props.foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo?.bar);
          }, [props.foo?.bar]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo?.bar);
          }, [props.foo.bar]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo.bar);
          }, [props.foo?.bar]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo.bar);
            console.log(props.foo?.bar);
          }, [props.foo?.bar]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo.bar);
            console.log(props.foo?.bar);
          }, [props.foo.bar]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo);
            console.log(props.foo?.bar);
          }, [props.foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo?.toString());
          }, [props.foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useMemo(() => {
            console.log(props.foo?.toString());
          }, [props.foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCallback(() => {
            console.log(props.foo?.toString());
          }, [props.foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCallback(() => {
            console.log(props.foo.bar?.toString());
          }, [props.foo.bar]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCallback(() => {
            console.log(props.foo?.bar?.toString());
          }, [props.foo.bar]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCallback(() => {
            console.log(props.foo.bar.toString());
          }, [props?.foo?.bar]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCallback(() => {
            console.log(props.foo?.bar?.baz);
          }, [props?.foo.bar?.baz]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const myEffect = () => {
            // Doesn't use anything
          };
          useEffect(myEffect, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        const local = {};
        function MyComponent() {
          const myEffect = () => {
            console.log(local);
          };
          useEffect(myEffect, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        const local = {};
        function MyComponent() {
          function myEffect() {
            console.log(local);
          }
          useEffect(myEffect, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = someFunc();
          function myEffect() {
            console.log(local);
          }
          useEffect(myEffect, [local]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          function myEffect() {
            console.log(global);
          }
          useEffect(myEffect, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        const local = {};
        function MyComponent() {
          const myEffect = () => {
            otherThing()
          }
          const otherThing = () => {
            console.log(local);
          }
          useEffect(myEffect, []);
        }
      `,
    },
    {
      // Valid because even though we don't inspect the function itself,
      // at least it's passed as a dependency.
      code: normalizeIndent`
        function MyComponent({delay}) {
          const local = {};
          const myEffect = debounce(() => {
            console.log(local);
          }, delay);
          useEffect(myEffect, [myEffect]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent({myEffect}) {
          useEffect(myEffect, [,myEffect]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent({myEffect}) {
          useEffect(myEffect, [,myEffect,,]);
        }
      `,
    },
    {
      code: normalizeIndent`
        let local = {};
        function myEffect() {
          console.log(local);
        }
        function MyComponent() {
          useEffect(myEffect, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent({myEffect}) {
          useEffect(myEffect, [myEffect]);
        }
      `,
    },
    {
      // Valid because has no deps.
      code: normalizeIndent`
        function MyComponent({myEffect}) {
          useEffect(myEffect);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCustomEffect(() => {
            console.log(props.foo);
          });
        }
      `,
      options: [{additionalHooks: 'useCustomEffect'}],
    },
    {
      // behaves like no deps
      code: normalizeIndent`
        function MyComponent(props) {
          useSpecialEffect(() => {
            console.log(props.foo);
          }, null);
        }
      `,
      options: [
        {
          additionalHooks: 'useSpecialEffect',
          experimental_autoDependenciesHooks: ['useSpecialEffect'],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCustomEffect(() => {
            console.log(props.foo);
          }, [props.foo]);
        }
      `,
      options: [{additionalHooks: 'useCustomEffect'}],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCustomEffect(() => {
            console.log(props.foo);
          }, []);
        }
      `,
      options: [{additionalHooks: 'useAnotherEffect'}],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useWithoutEffectSuffix(() => {
            console.log(props.foo);
          }, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          return renderHelperConfusedWithEffect(() => {
            console.log(props.foo);
          }, []);
        }
      `,
    },
    {
      // Valid because we don't care about hooks outside of components.
      code: normalizeIndent`
        const local = {};
        useEffect(() => {
          console.log(local);
        }, []);
      `,
    },
    {
      // Valid because we don't care about hooks outside of components.
      code: normalizeIndent`
        const local1 = {};
        {
          const local2 = {};
          useEffect(() => {
            console.log(local1);
            console.log(local2);
          }, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const ref = useRef();
          useEffect(() => {
            console.log(ref.current);
          }, [ref]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const ref = useRef();
          useEffect(() => {
            console.log(ref.current);
          }, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent({ maybeRef2, foo }) {
          const definitelyRef1 = useRef();
          const definitelyRef2 = useRef();
          const maybeRef1 = useSomeOtherRefyThing();
          const [state1, setState1] = useState();
          const [state2, setState2] = React.useState();
          const [state3, dispatch1] = useReducer();
          const [state4, dispatch2] = React.useReducer();
          const [state5, maybeSetState] = useFunnyState();
          const [state6, maybeDispatch] = useFunnyReducer();
          const [state9, dispatch5] = useActionState();
          const [state10, dispatch6] = React.useActionState();
          const [isPending1] = useTransition();
          const [isPending2, startTransition2] = useTransition();
          const [isPending3] = React.useTransition();
          const [isPending4, startTransition4] = React.useTransition();
          const mySetState = useCallback(() => {}, []);
          let myDispatch = useCallback(() => {}, []);

          useEffect(() => {
            // Known to be static
            console.log(definitelyRef1.current);
            console.log(definitelyRef2.current);
            console.log(maybeRef1.current);
            console.log(maybeRef2.current);
            setState1();
            setState2();
            dispatch1();
            dispatch2();
            dispatch5();
            dispatch6();
            startTransition1();
            startTransition2();
            startTransition3();
            startTransition4();

            // Dynamic
            console.log(state1);
            console.log(state2);
            console.log(state3);
            console.log(state4);
            console.log(state5);
            console.log(state6);
            console.log(isPending2);
            console.log(isPending4);
            mySetState();
            myDispatch();

            // Not sure; assume dynamic
            maybeSetState();
            maybeDispatch();
          }, [
            // Dynamic
            state1, state2, state3, state4, state5, state6, state9, state10,
            maybeRef1, maybeRef2,
            isPending2, isPending4,

            // Not sure; assume dynamic
            mySetState, myDispatch,
            maybeSetState, maybeDispatch

            // In this test, we don't specify static deps.
            // That should be okay.
          ]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent({ maybeRef2 }) {
          const definitelyRef1 = useRef();
          const definitelyRef2 = useRef();
          const maybeRef1 = useSomeOtherRefyThing();

          const [state1, setState1] = useState();
          const [state2, setState2] = React.useState();
          const [state3, dispatch1] = useReducer();
          const [state4, dispatch2] = React.useReducer();

          const [state5, maybeSetState] = useFunnyState();
          const [state6, maybeDispatch] = useFunnyReducer();

          const mySetState = useCallback(() => {}, []);
          let myDispatch = useCallback(() => {}, []);

          useEffect(() => {
            // Known to be static
            console.log(definitelyRef1.current);
            console.log(definitelyRef2.current);
            console.log(maybeRef1.current);
            console.log(maybeRef2.current);
            setState1();
            setState2();
            dispatch1();
            dispatch2();

            // Dynamic
            console.log(state1);
            console.log(state2);
            console.log(state3);
            console.log(state4);
            console.log(state5);
            console.log(state6);
            mySetState();
            myDispatch();

            // Not sure; assume dynamic
            maybeSetState();
            maybeDispatch();
          }, [
            // Dynamic
            state1, state2, state3, state4, state5, state6,
            maybeRef1, maybeRef2,

            // Not sure; assume dynamic
            mySetState, myDispatch,
            maybeSetState, maybeDispatch,

            // In this test, we specify static deps.
            // That should be okay too!
            definitelyRef1, definitelyRef2, setState1, setState2, dispatch1, dispatch2
          ]);
        }
      `,
    },
    {
      code: normalizeIndent`
        const MyComponent = forwardRef((props, ref) => {
          useImperativeHandle(ref, () => ({
            focus() {
              alert(props.hello);
            }
          }))
        });
      `,
    },
    {
      code: normalizeIndent`
        const MyComponent = forwardRef((props, ref) => {
          useImperativeHandle(ref, () => ({
            focus() {
              alert(props.hello);
            }
          }), [props.hello])
        });
      `,
    },
    {
      // This is not ideal but warning would likely create
      // too many false positives. We do, however, prevent
      // direct assignments.
      code: normalizeIndent`
        function MyComponent(props) {
          let obj = someFunc();
          useEffect(() => {
            obj.foo = true;
          }, [obj]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let foo = {}
          useEffect(() => {
            foo.bar.baz = 43;
          }, [foo.bar]);
        }
      `,
    },
    {
      // Valid because we assign ref.current
      // ourselves. Therefore it's likely not
      // a ref managed by React.
      code: normalizeIndent`
        function MyComponent() {
          const myRef = useRef();
          useEffect(() => {
            const handleMove = () => {};
            myRef.current = {};
            return () => {
              console.log(myRef.current.toString())
            };
          }, []);
          return <div />;
        }
      `,
    },
    {
      // Valid because we assign ref.current
      // ourselves. Therefore it's likely not
      // a ref managed by React.
      code: normalizeIndent`
        function MyComponent() {
          const myRef = useRef();
          useEffect(() => {
            const handleMove = () => {};
            myRef.current = {};
            return () => {
              console.log(myRef?.current?.toString())
            };
          }, []);
          return <div />;
        }
      `,
    },
    {
      // Valid because we assign ref.current
      // ourselves. Therefore it's likely not
      // a ref managed by React.
      code: normalizeIndent`
        function useMyThing(myRef) {
          useEffect(() => {
            const handleMove = () => {};
            myRef.current = {};
            return () => {
              console.log(myRef.current.toString())
            };
          }, [myRef]);
        }
      `,
    },
    {
      // Valid because the ref is captured.
      code: normalizeIndent`
        function MyComponent() {
          const myRef = useRef();
          useEffect(() => {
            const handleMove = () => {};
            const node = myRef.current;
            node.addEventListener('mousemove', handleMove);
            return () => node.removeEventListener('mousemove', handleMove);
          }, []);
          return <div ref={myRef} />;
        }
      `,
    },
    {
      // Valid because the ref is captured.
      code: normalizeIndent`
        function useMyThing(myRef) {
          useEffect(() => {
            const handleMove = () => {};
            const node = myRef.current;
            node.addEventListener('mousemove', handleMove);
            return () => node.removeEventListener('mousemove', handleMove);
          }, [myRef]);
          return <div ref={myRef} />;
        }
      `,
    },
    {
      // Valid because it's not an effect.
      code: normalizeIndent`
        function useMyThing(myRef) {
          useCallback(() => {
            const handleMouse = () => {};
            myRef.current.addEventListener('mousemove', handleMouse);
            myRef.current.addEventListener('mousein', handleMouse);
            return function() {
              setTimeout(() => {
                myRef.current.removeEventListener('mousemove', handleMouse);
                myRef.current.removeEventListener('mousein', handleMouse);
              });
            }
          }, [myRef]);
        }
      `,
    },
    {
      // Valid because we read ref.current in a function that isn't cleanup.
      code: normalizeIndent`
        function useMyThing() {
          const myRef = useRef();
          useEffect(() => {
            const handleMove = () => {
              console.log(myRef.current)
            };
            window.addEventListener('mousemove', handleMove);
            return () => window.removeEventListener('mousemove', handleMove);
          }, []);
          return <div ref={myRef} />;
        }
      `,
    },
    {
      // Valid because we read ref.current in a function that isn't cleanup.
      code: normalizeIndent`
        function useMyThing() {
          const myRef = useRef();
          useEffect(() => {
            const handleMove = () => {
              return () => window.removeEventListener('mousemove', handleMove);
            };
            window.addEventListener('mousemove', handleMove);
            return () => {};
          }, []);
          return <div ref={myRef} />;
        }
      `,
    },
    {
      // Valid because it's a primitive constant.
      code: normalizeIndent`
        function MyComponent() {
          const local1 = 42;
          const local2 = '42';
          const local3 = null;
          useEffect(() => {
            console.log(local1);
            console.log(local2);
            console.log(local3);
          }, []);
        }
      `,
    },
    {
      // It's not a mistake to specify constant values though.
      code: normalizeIndent`
        function MyComponent() {
          const local1 = 42;
          const local2 = '42';
          const local3 = null;
          useEffect(() => {
            console.log(local1);
            console.log(local2);
            console.log(local3);
          }, [local1, local2, local3]);
        }
      `,
    },
    {
      // It is valid for effects to over-specify their deps.
      code: normalizeIndent`
        function MyComponent(props) {
          const local = props.local;
          useEffect(() => {}, [local]);
        }
      `,
    },
    {
      // Valid even though activeTab is "unused".
      // We allow over-specifying deps for effects, but not callbacks or memo.
      code: normalizeIndent`
        function Foo({ activeTab }) {
          useEffect(() => {
            window.scrollTo(0, 0);
          }, [activeTab]);
        }
      `,
    },
    {
      // It is valid to specify broader effect deps than strictly necessary.
      // Don't warn for this.
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo.bar.baz);
          }, [props]);
          useEffect(() => {
            console.log(props.foo.bar.baz);
          }, [props.foo]);
          useEffect(() => {
            console.log(props.foo.bar.baz);
          }, [props.foo.bar]);
          useEffect(() => {
            console.log(props.foo.bar.baz);
          }, [props.foo.bar.baz]);
        }
      `,
    },
    {
      // It is *also* valid to specify broader memo/callback deps than strictly necessary.
      // Don't warn for this either.
      code: normalizeIndent`
        function MyComponent(props) {
          const fn = useCallback(() => {
            console.log(props.foo.bar.baz);
          }, [props]);
          const fn2 = useCallback(() => {
            console.log(props.foo.bar.baz);
          }, [props.foo]);
          const fn3 = useMemo(() => {
            console.log(props.foo.bar.baz);
          }, [props.foo.bar]);
          const fn4 = useMemo(() => {
            console.log(props.foo.bar.baz);
          }, [props.foo.bar.baz]);
        }
      `,
    },
    {
      // Declaring handleNext is optional because
      // it doesn't use anything in the function scope.
      code: normalizeIndent`
        function MyComponent(props) {
          function handleNext1() {
            console.log('hello');
          }
          const handleNext2 = () => {
            console.log('hello');
          };
          let handleNext3 = function() {
            console.log('hello');
          };
          useEffect(() => {
            return Store.subscribe(handleNext1);
          }, []);
          useLayoutEffect(() => {
            return Store.subscribe(handleNext2);
          }, []);
          useMemo(() => {
            return Store.subscribe(handleNext3);
          }, []);
        }
      `,
    },
    {
      // Declaring handleNext is optional because
      // it doesn't use anything in the function scope.
      code: normalizeIndent`
        function MyComponent(props) {
          function handleNext() {
            console.log('hello');
          }
          useEffect(() => {
            return Store.subscribe(handleNext);
          }, []);
          useLayoutEffect(() => {
            return Store.subscribe(handleNext);
          }, []);
          useMemo(() => {
            return Store.subscribe(handleNext);
          }, []);
        }
      `,
    },
    {
      // Declaring handleNext is optional because
      // everything they use is fully static.
      code: normalizeIndent`
        function MyComponent(props) {
          let [, setState] = useState();
          let [, dispatch] = React.useReducer();

          function handleNext1(value) {
            let value2 = value * 100;
            setState(value2);
            console.log('hello');
          }
          const handleNext2 = (value) => {
            setState(foo(value));
            console.log('hello');
          };
          let handleNext3 = function(value) {
            console.log(value);
            dispatch({ type: 'x', value });
          };
          useEffect(() => {
            return Store.subscribe(handleNext1);
          }, []);
          useLayoutEffect(() => {
            return Store.subscribe(handleNext2);
          }, []);
          useMemo(() => {
            return Store.subscribe(handleNext3);
          }, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function useInterval(callback, delay) {
          const savedCallback = useRef();
          useEffect(() => {
            savedCallback.current = callback;
          });
          useEffect(() => {
            function tick() {
              savedCallback.current();
            }
            if (delay !== null) {
              let id = setInterval(tick, delay);
              return () => clearInterval(id);
            }
          }, [delay]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function Counter() {
          const [count, setCount] = useState(0);

          useEffect(() => {
            let id = setInterval(() => {
              setCount(c => c + 1);
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
    },
    {
      code: normalizeIndent`
        function Counter(unstableProp) {
          let [count, setCount] = useState(0);
          setCount = unstableProp
          useEffect(() => {
            let id = setInterval(() => {
              setCount(c => c + 1);
            }, 1000);
            return () => clearInterval(id);
          }, [setCount]);

          return <h1>{count}</h1>;
        }
      `,
    },
    {
      code: normalizeIndent`
        function Counter() {
          const [count, setCount] = useState(0);

          function tick() {
            setCount(c => c + 1);
          }

          useEffect(() => {
            let id = setInterval(() => {
              tick();
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
    },
    {
      code: normalizeIndent`
        function Counter() {
          const [count, dispatch] = useReducer((state, action) => {
            if (action === 'inc') {
              return state + 1;
            }
          }, 0);

          useEffect(() => {
            let id = setInterval(() => {
              dispatch('inc');
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
    },
    {
      code: normalizeIndent`
        function Counter() {
          const [count, dispatch] = useReducer((state, action) => {
            if (action === 'inc') {
              return state + 1;
            }
          }, 0);

          const tick = () => {
            dispatch('inc');
          };

          useEffect(() => {
            let id = setInterval(tick, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
    },
    {
      // Regression test for a crash
      code: normalizeIndent`
        function Podcasts() {
          useEffect(() => {
            setPodcasts([]);
          }, []);
          let [podcasts, setPodcasts] = useState(null);
        }
      `,
    },
    {
      code: normalizeIndent`
        function withFetch(fetchPodcasts) {
          return function Podcasts({ id }) {
            let [podcasts, setPodcasts] = useState(null);
            useEffect(() => {
              fetchPodcasts(id).then(setPodcasts);
            }, [id]);
          }
        }
      `,
    },
    {
      code: normalizeIndent`
        function Podcasts({ id }) {
          let [podcasts, setPodcasts] = useState(null);
          useEffect(() => {
            function doFetch({ fetchPodcasts }) {
              fetchPodcasts(id).then(setPodcasts);
            }
            doFetch({ fetchPodcasts: API.fetchPodcasts });
          }, [id]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function Counter() {
          let [count, setCount] = useState(0);

          function increment(x) {
            return x + 1;
          }

          useEffect(() => {
            let id = setInterval(() => {
              setCount(increment);
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
    },
    {
      code: normalizeIndent`
        function Counter() {
          let [count, setCount] = useState(0);

          function increment(x) {
            return x + 1;
          }

          useEffect(() => {
            let id = setInterval(() => {
              setCount(count => increment(count));
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
    },
    {
      code: normalizeIndent`
        import increment from './increment';
        function Counter() {
          let [count, setCount] = useState(0);

          useEffect(() => {
            let id = setInterval(() => {
              setCount(count => count + increment);
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
    },
    {
      code: normalizeIndent`
        function withStuff(increment) {
          return function Counter() {
            let [count, setCount] = useState(0);

            useEffect(() => {
              let id = setInterval(() => {
                setCount(count => count + increment);
              }, 1000);
              return () => clearInterval(id);
            }, []);

            return <h1>{count}</h1>;
          }
        }
      `,
    },
    {
      code: normalizeIndent`
        function App() {
          const [query, setQuery] = useState('react');
          const [state, setState] = useState(null);
          useEffect(() => {
            let ignore = false;
            fetchSomething();
            async function fetchSomething() {
              const result = await (await fetch('http://hn.algolia.com/api/v1/search?query=' + query)).json();
              if (!ignore) setState(result);
            }
            return () => { ignore = true; };
          }, [query]);
          return (
            <>
              <input value={query} onChange={e => setQuery(e.target.value)} />
              {JSON.stringify(state)}
            </>
          );
        }
      `,
    },
    {
      code: normalizeIndent`
        function Example() {
          const foo = useCallback(() => {
            foo();
          }, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function Example({ prop }) {
          const foo = useCallback(() => {
            if (prop) {
              foo();
            }
          }, [prop]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function Hello() {
          const [state, setState] = useState(0);
          useEffect(() => {
            const handleResize = () => setState(window.innerWidth);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
          });
        }
      `,
    },
    // Ignore arguments keyword for arrow functions.
    {
      code: normalizeIndent`
        function Example() {
          useEffect(() => {
            arguments
          }, [])
        }
      `,
    },
    {
      code: normalizeIndent`
        function Example() {
          useEffect(() => {
            const bar = () => {
              arguments;
            };
            bar();
          }, [])
        }
      `,
    },
    // Regression test.
    {
      code: normalizeIndent`
        function Example(props) {
          useEffect(() => {
            let topHeight = 0;
            topHeight = props.upperViewHeight;
          }, [props.upperViewHeight]);
        }
      `,
    },
    // Regression test.
    {
      code: normalizeIndent`
        function Example(props) {
          useEffect(() => {
            let topHeight = 0;
            topHeight = props?.upperViewHeight;
          }, [props?.upperViewHeight]);
        }
      `,
    },
    // Regression test.
    {
      code: normalizeIndent`
        function Example(props) {
          useEffect(() => {
            let topHeight = 0;
            topHeight = props?.upperViewHeight;
          }, [props]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function useFoo(foo){
          return useMemo(() => foo, [foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function useFoo(){
          const foo = "hi!";
          return useMemo(() => foo, [foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function useFoo(){
          let {foo} = {foo: 1};
          return useMemo(() => foo, [foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function useFoo(){
          let [foo] = [1];
          return useMemo(() => foo, [foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function useFoo() {
          const foo = "fine";
          if (true) {
            // Shadowed variable with constant construction in a nested scope is fine.
            const foo = {};
          }
          return useMemo(() => foo, [foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent({foo}) {
          return useMemo(() => foo, [foo])
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const foo = true ? "fine" : "also fine";
          return useMemo(() => foo, [foo]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          useEffect(() => {
            console.log('banana banana banana');
          }, undefined);
        }
      `,
    },
    {
      // Test settings-based additionalHooks - should work with settings
      code: normalizeIndent`
        function MyComponent(props) {
          useCustomEffect(() => {
            console.log(props.foo);
          });
        }
      `,
      settings: {
        'react-hooks': {
          additionalEffectHooks: 'useCustomEffect',
        },
      },
    },
    {
      // Test settings-based additionalHooks - should work with dependencies
      code: normalizeIndent`
        function MyComponent(props) {
          useCustomEffect(() => {
            console.log(props.foo);
          }, [props.foo]);
        }
      `,
      settings: {
        'react-hooks': {
          additionalEffectHooks: 'useCustomEffect',
        },
      },
    },
    {
      // Test that rule-level additionalHooks takes precedence over settings
      code: normalizeIndent`
        function MyComponent(props) {
          useCustomEffect(() => {
            console.log(props.foo);
          }, []);
        }
      `,
      options: [{additionalHooks: 'useAnotherEffect'}],
      settings: {
        'react-hooks': {
          additionalEffectHooks: 'useCustomEffect',
        },
      },
    },
    {
      // Test settings with multiple hooks pattern
      code: normalizeIndent`
        function MyComponent(props) {
          useCustomEffect(() => {
            console.log(props.foo);
          }, [props.foo]);
          useAnotherEffect(() => {
            console.log(props.bar);
          }, [props.bar]);
        }
      `,
      settings: {
        'react-hooks': {
          additionalEffectHooks: '(useCustomEffect|useAnotherEffect)',
        },
      },
    },
    {
      code: normalizeIndent`
        function MyComponent({ theme }) {
          const onStuff = useEffectEvent(() => {
            showNotification(theme);
          });
          useEffect(() => {
            onStuff();
          }, []);
          React.useEffect(() => {
            onStuff();
          }, []);
        }
      `,
    },
  ],
  invalid: [
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useSpecialEffect(() => {
            console.log(props.foo);
          }, null);
        }
      `,
      options: [{additionalHooks: 'useSpecialEffect'}],
      errors: [
        {
          message:
            "React Hook useSpecialEffect was passed a dependency list that is not an array literal. This means we can't statically verify whether you've passed the correct dependencies.",
        },
        {
          message:
            "React Hook useSpecialEffect has a missing dependency: 'props.foo'. Either include it or remove the dependency array.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useSpecialEffect(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCallback(() => {
            console.log(props.foo?.toString());
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useCallback(() => {
                    console.log(props.foo?.toString());
                  }, [props.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Affected code should use React.useActionState instead
      code: normalizeIndent`
        function ComponentUsingFormState(props) {
          const [state7, dispatch3] = useFormState();
          const [state8, dispatch4] = ReactDOM.useFormState();
          useEffect(() => {
            dispatch3();
            dispatch4();

            // dynamic
            console.log(state7);
            console.log(state8);

          }, [state7, state8]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'dispatch3' and 'dispatch4'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [dispatch3, dispatch4, state7, state8]',
              output: normalizeIndent`
                function ComponentUsingFormState(props) {
                  const [state7, dispatch3] = useFormState();
                  const [state8, dispatch4] = ReactDOM.useFormState();
                  useEffect(() => {
                    dispatch3();
                    dispatch4();

                    // dynamic
                    console.log(state7);
                    console.log(state8);

                  }, [dispatch3, dispatch4, state7, state8]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCallback(() => {
            console.log(props.foo?.bar.baz);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'props.foo?.bar.baz'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo?.bar.baz]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useCallback(() => {
                    console.log(props.foo?.bar.baz);
                  }, [props.foo?.bar.baz]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCallback(() => {
            console.log(props.foo?.bar?.baz);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'props.foo?.bar?.baz'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo?.bar?.baz]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useCallback(() => {
                    console.log(props.foo?.bar?.baz);
                  }, [props.foo?.bar?.baz]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCallback(() => {
            console.log(props.foo?.bar.toString());
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'props.foo?.bar'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo?.bar]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useCallback(() => {
                    console.log(props.foo?.bar.toString());
                  }, [props.foo?.bar]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = someFunc();
          useEffect(() => {
            console.log(local);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = someFunc();
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Counter(unstableProp) {
          let [count, setCount] = useState(0);
          setCount = unstableProp
          useEffect(() => {
            let id = setInterval(() => {
              setCount(c => c + 1);
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'setCount'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [setCount]',
              output: normalizeIndent`
                function Counter(unstableProp) {
                  let [count, setCount] = useState(0);
                  setCount = unstableProp
                  useEffect(() => {
                    let id = setInterval(() => {
                      setCount(c => c + 1);
                    }, 1000);
                    return () => clearInterval(id);
                  }, [setCount]);

                  return <h1>{count}</h1>;
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Note: we *could* detect it's a primitive and never assigned
      // even though it's not a constant -- but we currently don't.
      // So this is an error.
      code: normalizeIndent`
        function MyComponent() {
          let local = 42;
          useEffect(() => {
            console.log(local);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  let local = 42;
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Regexes are literals but potentially stateful.
      code: normalizeIndent`
        function MyComponent() {
          const local = /foo/;
          useEffect(() => {
            console.log(local);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = /foo/;
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Invalid because they don't have a meaning without deps.
      code: normalizeIndent`
        function MyComponent(props) {
          const value = useMemo(() => { return 2*2; });
          const fn = useCallback(() => { alert('foo'); });
        }
      `,
      // We don't know what you meant.
      errors: [
        {
          message:
            'React Hook useMemo does nothing when called with only one argument. ' +
            'Did you forget to pass an array of dependencies?',
          suggestions: undefined,
        },
        {
          message:
            'React Hook useCallback does nothing when called with only one argument. ' +
            'Did you forget to pass an array of dependencies?',
          suggestions: undefined,
        },
      ],
    },
    {
      // Invalid because they don't have a meaning without deps.
      code: normalizeIndent`
        function MyComponent({ fn1, fn2 }) {
          const value = useMemo(fn1);
          const fn = useCallback(fn2);
        }
      `,
      errors: [
        {
          message:
            'React Hook useMemo does nothing when called with only one argument. ' +
            'Did you forget to pass an array of dependencies?',
          suggestions: undefined,
        },
        {
          message:
            'React Hook useCallback does nothing when called with only one argument. ' +
            'Did you forget to pass an array of dependencies?',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          useEffect()
          useLayoutEffect()
          useCallback()
          useMemo()
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect requires an effect callback. ' +
            'Did you forget to pass a callback to the hook?',
          suggestions: undefined,
        },
        {
          message:
            'React Hook useLayoutEffect requires an effect callback. ' +
            'Did you forget to pass a callback to the hook?',
          suggestions: undefined,
        },
        {
          message:
            'React Hook useCallback requires an effect callback. ' +
            'Did you forget to pass a callback to the hook?',
          suggestions: undefined,
        },
        {
          message:
            'React Hook useMemo requires an effect callback. ' +
            'Did you forget to pass a callback to the hook?',
          suggestions: undefined,
        },
      ],
    },
    {
      // Regression test
      code: normalizeIndent`
        function MyComponent() {
          const local = someFunc();
          useEffect(() => {
            if (true) {
              console.log(local);
            }
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = someFunc();
                  useEffect(() => {
                    if (true) {
                      console.log(local);
                    }
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Regression test
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            try {
              console.log(local);
            } finally {}
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  useEffect(() => {
                    try {
                      console.log(local);
                    } finally {}
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Regression test
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            function inner() {
              console.log(local);
            }
            inner();
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  useEffect(() => {
                    function inner() {
                      console.log(local);
                    }
                    inner();
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local1 = someFunc();
          {
            const local2 = someFunc();
            useEffect(() => {
              console.log(local1);
              console.log(local2);
            }, []);
          }
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'local1' and 'local2'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local1, local2]',
              output: normalizeIndent`
                function MyComponent() {
                  const local1 = someFunc();
                  {
                    const local2 = someFunc();
                    useEffect(() => {
                      console.log(local1);
                      console.log(local2);
                    }, [local1, local2]);
                  }
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local1 = {};
          const local2 = {};
          useEffect(() => {
            console.log(local1);
            console.log(local2);
          }, [local1]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local2'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local1, local2]',
              output: normalizeIndent`
                function MyComponent() {
                  const local1 = {};
                  const local2 = {};
                  useEffect(() => {
                    console.log(local1);
                    console.log(local2);
                  }, [local1, local2]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local1 = {};
          const local2 = {};
          useMemo(() => {
            console.log(local1);
          }, [local1, local2]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useMemo has an unnecessary dependency: 'local2'. " +
            'Either exclude it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local1]',
              output: normalizeIndent`
                function MyComponent() {
                  const local1 = {};
                  const local2 = {};
                  useMemo(() => {
                    console.log(local1);
                  }, [local1]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local1 = someFunc();
          function MyNestedComponent() {
            const local2 = {};
            useCallback(() => {
              console.log(local1);
              console.log(local2);
            }, [local1]);
          }
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'local2'. " +
            'Either include it or remove the dependency array. ' +
            "Outer scope values like 'local1' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local2]',
              output: normalizeIndent`
                function MyComponent() {
                  const local1 = someFunc();
                  function MyNestedComponent() {
                    const local2 = {};
                    useCallback(() => {
                      console.log(local1);
                      console.log(local2);
                    }, [local2]);
                  }
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            console.log(local);
            console.log(local);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  useEffect(() => {
                    console.log(local);
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            console.log(local);
            console.log(local);
          }, [local, local]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a duplicate dependency: 'local'. " +
            'Either omit it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  useEffect(() => {
                    console.log(local);
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          useCallback(() => {}, [window]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has an unnecessary dependency: 'window'. " +
            'Either exclude it or remove the dependency array. ' +
            "Outer scope values like 'window' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                function MyComponent() {
                  useCallback(() => {}, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // It is not valid for useCallback to specify extraneous deps
      // because it doesn't serve as a side effect trigger unlike useEffect.
      code: normalizeIndent`
        function MyComponent(props) {
          let local = props.foo;
          useCallback(() => {}, [local]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has an unnecessary dependency: 'local'. " +
            'Either exclude it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                function MyComponent(props) {
                  let local = props.foo;
                  useCallback(() => {}, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({ history }) {
          useEffect(() => {
            return history.listen();
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'history'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [history]',
              output: normalizeIndent`
                function MyComponent({ history }) {
                  useEffect(() => {
                    return history.listen();
                  }, [history]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({ history }) {
          useEffect(() => {
            return [
              history.foo.bar[2].dobedo.listen(),
              history.foo.bar().dobedo.listen[2]
            ];
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'history.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [history.foo]',
              output: normalizeIndent`
                function MyComponent({ history }) {
                  useEffect(() => {
                    return [
                      history.foo.bar[2].dobedo.listen(),
                      history.foo.bar().dobedo.listen[2]
                    ];
                  }, [history.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({ history }) {
          useEffect(() => {
            return [
              history?.foo
            ];
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'history?.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [history?.foo]',
              output: normalizeIndent`
                function MyComponent({ history }) {
                  useEffect(() => {
                    return [
                      history?.foo
                    ];
                  }, [history?.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          useEffect(() => {}, ['foo']);
        }
      `,
      errors: [
        {
          message:
            // Don't assume user meant `foo` because it's not used in the effect.
            "The 'foo' literal is not a valid dependency because it never changes. " +
            'You can safely remove it.',
          // TODO: provide suggestion.
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({ foo, bar, baz }) {
          useEffect(() => {
            console.log(foo, bar, baz);
          }, ['foo', 'bar']);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'bar', 'baz', and 'foo'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [bar, baz, foo]',
              output: normalizeIndent`
                function MyComponent({ foo, bar, baz }) {
                  useEffect(() => {
                    console.log(foo, bar, baz);
                  }, [bar, baz, foo]);
                }
              `,
            },
          ],
        },
        {
          message:
            "The 'foo' literal is not a valid dependency because it never changes. " +
            'Did you mean to include foo in the array instead?',
          suggestions: undefined,
        },
        {
          message:
            "The 'bar' literal is not a valid dependency because it never changes. " +
            'Did you mean to include bar in the array instead?',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({ foo, bar, baz }) {
          useEffect(() => {
            console.log(foo, bar, baz);
          }, [42, false, null]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'bar', 'baz', and 'foo'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [bar, baz, foo]',
              output: normalizeIndent`
                function MyComponent({ foo, bar, baz }) {
                  useEffect(() => {
                    console.log(foo, bar, baz);
                  }, [bar, baz, foo]);
                }
              `,
            },
          ],
        },
        {
          message:
            'The 42 literal is not a valid dependency because it never changes. You can safely remove it.',
          suggestions: undefined,
        },
        {
          message:
            'The false literal is not a valid dependency because it never changes. You can safely remove it.',
          suggestions: undefined,
        },
        {
          message:
            'The null literal is not a valid dependency because it never changes. You can safely remove it.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const dependencies = [];
          useEffect(() => {}, dependencies);
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect was passed a dependency list that is not an ' +
            "array literal. This means we can't statically verify whether you've " +
            'passed the correct dependencies.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          const dependencies = [local];
          useEffect(() => {
            console.log(local);
          }, dependencies);
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect was passed a dependency list that is not an ' +
            "array literal. This means we can't statically verify whether you've " +
            'passed the correct dependencies.',
          // TODO: should this autofix or bail out?
          suggestions: undefined,
        },
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  const dependencies = [local];
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          const dependencies = [local];
          useEffect(() => {
            console.log(local);
          }, [...dependencies]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  const dependencies = [local];
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
        {
          message:
            'React Hook useEffect has a spread element in its dependency array. ' +
            "This means we can't statically verify whether you've passed the " +
            'correct dependencies.',
          // TODO: should this autofix or bail out?
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = someFunc();
          useEffect(() => {
            console.log(local);
          }, [local, ...dependencies]);
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect has a spread element in its dependency array. ' +
            "This means we can't statically verify whether you've passed the " +
            'correct dependencies.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            console.log(local);
          }, [computeCacheKey(local)]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          // TODO: I'm not sure this is a good idea.
          // Maybe bail out?
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
        {
          message:
            'React Hook useEffect has a complex expression in the dependency array. ' +
            'Extract it to a separate variable so it can be statically checked.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.items[0]);
          }, [props.items[0]]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props.items'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.items]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    console.log(props.items[0]);
                  }, [props.items]);
                }
              `,
            },
          ],
        },
        {
          message:
            'React Hook useEffect has a complex expression in the dependency array. ' +
            'Extract it to a separate variable so it can be statically checked.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.items[0]);
          }, [props.items, props.items[0]]);
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect has a complex expression in the dependency array. ' +
            'Extract it to a separate variable so it can be statically checked.',
          // TODO: ideally suggestion would remove the bad expression?
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({ items }) {
          useEffect(() => {
            console.log(items[0]);
          }, [items[0]]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'items'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [items]',
              output: normalizeIndent`
                function MyComponent({ items }) {
                  useEffect(() => {
                    console.log(items[0]);
                  }, [items]);
                }
              `,
            },
          ],
        },
        {
          message:
            'React Hook useEffect has a complex expression in the dependency array. ' +
            'Extract it to a separate variable so it can be statically checked.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({ items }) {
          useEffect(() => {
            console.log(items[0]);
          }, [items, items[0]]);
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect has a complex expression in the dependency array. ' +
            'Extract it to a separate variable so it can be statically checked.',
          // TODO: ideally suggeston would remove the bad expression?
          suggestions: undefined,
        },
      ],
    },
    {
      // It is not valid for useCallback to specify extraneous deps
      // because it doesn't serve as a side effect trigger unlike useEffect.
      // However, we generally allow specifying *broader* deps as escape hatch.
      // So while [props, props.foo] is unnecessary, 'props' wins here as the
      // broader one, and this is why 'props.foo' is reported as unnecessary.
      code: normalizeIndent`
        function MyComponent(props) {
          const local = {};
          useCallback(() => {
            console.log(props.foo);
            console.log(props.bar);
          }, [props, props.foo]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has an unnecessary dependency: 'props.foo'. " +
            'Either exclude it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const local = {};
                  useCallback(() => {
                    console.log(props.foo);
                    console.log(props.bar);
                  }, [props]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Since we don't have 'props' in the list, we'll suggest narrow dependencies.
      code: normalizeIndent`
        function MyComponent(props) {
          const local = {};
          useCallback(() => {
            console.log(props.foo);
            console.log(props.bar);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has missing dependencies: 'props.bar' and 'props.foo'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.bar, props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const local = {};
                  useCallback(() => {
                    console.log(props.foo);
                    console.log(props.bar);
                  }, [props.bar, props.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Effects are allowed to over-specify deps. We'll complain about missing
      // 'local', but we won't remove the already-specified 'local.id' from your list.
      code: normalizeIndent`
        function MyComponent() {
          const local = {id: 42};
          useEffect(() => {
            console.log(local);
          }, [local.id]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local, local.id]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {id: 42};
                  useEffect(() => {
                    console.log(local);
                  }, [local, local.id]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Callbacks are not allowed to over-specify deps. So we'll complain about missing
      // 'local' and we will also *remove* 'local.id' from your list.
      code: normalizeIndent`
        function MyComponent() {
          const local = {id: 42};
          const fn = useCallback(() => {
            console.log(local);
          }, [local.id]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {id: 42};
                  const fn = useCallback(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Callbacks are not allowed to over-specify deps. So we'll complain about
      // the unnecessary 'local.id'.
      code: normalizeIndent`
        function MyComponent() {
          const local = {id: 42};
          const fn = useCallback(() => {
            console.log(local);
          }, [local.id, local]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has an unnecessary dependency: 'local.id'. " +
            'Either exclude it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {id: 42};
                  const fn = useCallback(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const fn = useCallback(() => {
            console.log(props.foo.bar.baz);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'props.foo.bar.baz'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo.bar.baz]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const fn = useCallback(() => {
                    console.log(props.foo.bar.baz);
                  }, [props.foo.bar.baz]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let color = {}
          const fn = useCallback(() => {
            console.log(props.foo.bar.baz);
            console.log(color);
          }, [props.foo, props.foo.bar.baz]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'color'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [color, props.foo.bar.baz]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let color = {}
                  const fn = useCallback(() => {
                    console.log(props.foo.bar.baz);
                    console.log(color);
                  }, [color, props.foo.bar.baz]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Callbacks are not allowed to over-specify deps. So one of these is extra.
      // However, it *is* allowed to specify broader deps then strictly necessary.
      // So in this case we ask you to remove 'props.foo.bar.baz' because 'props.foo'
      // already covers it, and having both is unnecessary.
      // TODO: maybe consider suggesting a narrower one by default in these cases.
      code: normalizeIndent`
        function MyComponent(props) {
          const fn = useCallback(() => {
            console.log(props.foo.bar.baz);
          }, [props.foo.bar.baz, props.foo]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has an unnecessary dependency: 'props.foo.bar.baz'. " +
            'Either exclude it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const fn = useCallback(() => {
                    console.log(props.foo.bar.baz);
                  }, [props.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const fn = useCallback(() => {
            console.log(props.foo.bar.baz);
            console.log(props.foo.fizz.bizz);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has missing dependencies: 'props.foo.bar.baz' and 'props.foo.fizz.bizz'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo.bar.baz, props.foo.fizz.bizz]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const fn = useCallback(() => {
                    console.log(props.foo.bar.baz);
                    console.log(props.foo.fizz.bizz);
                  }, [props.foo.bar.baz, props.foo.fizz.bizz]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Normally we allow specifying deps too broadly.
      // So we'd be okay if 'props.foo.bar' was there rather than 'props.foo.bar.baz'.
      // However, 'props.foo.bar.baz' is missing. So we know there is a mistake.
      // When we're sure there is a mistake, for callbacks we will rebuild the list
      // from scratch. This will set the user on a better path by default.
      // This is why we end up with just 'props.foo.bar', and not them both.
      code: normalizeIndent`
        function MyComponent(props) {
          const fn = useCallback(() => {
            console.log(props.foo.bar);
          }, [props.foo.bar.baz]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'props.foo.bar'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo.bar]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const fn = useCallback(() => {
                    console.log(props.foo.bar);
                  }, [props.foo.bar]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const fn = useCallback(() => {
            console.log(props);
            console.log(props.hello);
          }, [props.foo.bar.baz]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'props'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const fn = useCallback(() => {
                    console.log(props);
                    console.log(props.hello);
                  }, [props]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            console.log(local);
          }, [local, local]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a duplicate dependency: 'local'. " +
            'Either omit it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local1 = {};
          useCallback(() => {
            const local1 = {};
            console.log(local1);
          }, [local1]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has an unnecessary dependency: 'local1'. " +
            'Either exclude it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                function MyComponent() {
                  const local1 = {};
                  useCallback(() => {
                    const local1 = {};
                    console.log(local1);
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local1 = {};
          useCallback(() => {}, [local1]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has an unnecessary dependency: 'local1'. " +
            'Either exclude it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                function MyComponent() {
                  const local1 = {};
                  useCallback(() => {}, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo);
            console.log(props.bar);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'props.bar' and 'props.foo'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.bar, props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    console.log(props.foo);
                    console.log(props.bar);
                  }, [props.bar, props.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let a, b, c, d, e, f, g;
          useEffect(() => {
            console.log(b, e, d, c, a, g, f);
          }, [c, a, g]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'b', 'd', 'e', and 'f'. " +
            'Either include them or remove the dependency array.',
          // Don't alphabetize if it wasn't alphabetized in the first place.
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [c, a, g, b, e, d, f]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let a, b, c, d, e, f, g;
                  useEffect(() => {
                    console.log(b, e, d, c, a, g, f);
                  }, [c, a, g, b, e, d, f]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let a, b, c, d, e, f, g;
          useEffect(() => {
            console.log(b, e, d, c, a, g, f);
          }, [a, c, g]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'b', 'd', 'e', and 'f'. " +
            'Either include them or remove the dependency array.',
          // Alphabetize if it was alphabetized.
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [a, b, c, d, e, f, g]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let a, b, c, d, e, f, g;
                  useEffect(() => {
                    console.log(b, e, d, c, a, g, f);
                  }, [a, b, c, d, e, f, g]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let a, b, c, d, e, f, g;
          useEffect(() => {
            console.log(b, e, d, c, a, g, f);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'a', 'b', 'c', 'd', 'e', 'f', and 'g'. " +
            'Either include them or remove the dependency array.',
          // Alphabetize if it was empty.
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [a, b, c, d, e, f, g]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let a, b, c, d, e, f, g;
                  useEffect(() => {
                    console.log(b, e, d, c, a, g, f);
                  }, [a, b, c, d, e, f, g]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const local = {};
          useEffect(() => {
            console.log(props.foo);
            console.log(props.bar);
            console.log(local);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'local', 'props.bar', and 'props.foo'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local, props.bar, props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const local = {};
                  useEffect(() => {
                    console.log(props.foo);
                    console.log(props.bar);
                    console.log(local);
                  }, [local, props.bar, props.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const local = {};
          useEffect(() => {
            console.log(props.foo);
            console.log(props.bar);
            console.log(local);
          }, [props]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local, props]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const local = {};
                  useEffect(() => {
                    console.log(props.foo);
                    console.log(props.bar);
                    console.log(local);
                  }, [local, props]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo);
          }, []);
          useCallback(() => {
            console.log(props.foo);
          }, []);
          useMemo(() => {
            console.log(props.foo);
          }, []);
          React.useEffect(() => {
            console.log(props.foo);
          }, []);
          React.useCallback(() => {
            console.log(props.foo);
          }, []);
          React.useMemo(() => {
            console.log(props.foo);
          }, []);
          React.notReactiveHook(() => {
            console.log(props.foo);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                  useCallback(() => {
                    console.log(props.foo);
                  }, []);
                  useMemo(() => {
                    console.log(props.foo);
                  }, []);
                  React.useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  React.useCallback(() => {
                    console.log(props.foo);
                  }, []);
                  React.useMemo(() => {
                    console.log(props.foo);
                  }, []);
                  React.notReactiveHook(() => {
                    console.log(props.foo);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook useCallback has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  useCallback(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                  useMemo(() => {
                    console.log(props.foo);
                  }, []);
                  React.useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  React.useCallback(() => {
                    console.log(props.foo);
                  }, []);
                  React.useMemo(() => {
                    console.log(props.foo);
                  }, []);
                  React.notReactiveHook(() => {
                    console.log(props.foo);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook useMemo has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  useCallback(() => {
                    console.log(props.foo);
                  }, []);
                  useMemo(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                  React.useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  React.useCallback(() => {
                    console.log(props.foo);
                  }, []);
                  React.useMemo(() => {
                    console.log(props.foo);
                  }, []);
                  React.notReactiveHook(() => {
                    console.log(props.foo);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook React.useEffect has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  useCallback(() => {
                    console.log(props.foo);
                  }, []);
                  useMemo(() => {
                    console.log(props.foo);
                  }, []);
                  React.useEffect(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                  React.useCallback(() => {
                    console.log(props.foo);
                  }, []);
                  React.useMemo(() => {
                    console.log(props.foo);
                  }, []);
                  React.notReactiveHook(() => {
                    console.log(props.foo);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook React.useCallback has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  useCallback(() => {
                    console.log(props.foo);
                  }, []);
                  useMemo(() => {
                    console.log(props.foo);
                  }, []);
                  React.useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  React.useCallback(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                  React.useMemo(() => {
                    console.log(props.foo);
                  }, []);
                  React.notReactiveHook(() => {
                    console.log(props.foo);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook React.useMemo has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  useCallback(() => {
                    console.log(props.foo);
                  }, []);
                  useMemo(() => {
                    console.log(props.foo);
                  }, []);
                  React.useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  React.useCallback(() => {
                    console.log(props.foo);
                  }, []);
                  React.useMemo(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                  React.notReactiveHook(() => {
                    console.log(props.foo);
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useCustomEffect(() => {
            console.log(props.foo);
          }, []);
          useEffect(() => {
            console.log(props.foo);
          }, []);
          React.useEffect(() => {
            console.log(props.foo);
          }, []);
          React.useCustomEffect(() => {
            console.log(props.foo);
          }, []);
        }
      `,
      options: [{additionalHooks: 'useCustomEffect'}],
      errors: [
        {
          message:
            "React Hook useCustomEffect has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useCustomEffect(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                  useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  React.useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  React.useCustomEffect(() => {
                    console.log(props.foo);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook useEffect has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useCustomEffect(() => {
                    console.log(props.foo);
                  }, []);
                  useEffect(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                  React.useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  React.useCustomEffect(() => {
                    console.log(props.foo);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook React.useEffect has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useCustomEffect(() => {
                    console.log(props.foo);
                  }, []);
                  useEffect(() => {
                    console.log(props.foo);
                  }, []);
                  React.useEffect(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                  React.useCustomEffect(() => {
                    console.log(props.foo);
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Test settings-based additionalHooks - should detect missing dependency
      code: normalizeIndent`
        function MyComponent(props) {
          useCustomEffect(() => {
            console.log(props.foo);
          }, []);
        }
      `,
      settings: {
        'react-hooks': {
          additionalEffectHooks: 'useCustomEffect',
        },
      },
      errors: [
        {
          message:
            "React Hook useCustomEffect has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useCustomEffect(() => {
                    console.log(props.foo);
                  }, [props.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            console.log(local);
          }, [a ? local : b]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          // TODO: should we bail out instead?
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
        {
          message:
            'React Hook useEffect has a complex expression in the dependency array. ' +
            'Extract it to a separate variable so it can be statically checked.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            console.log(local);
          }, [a && local]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          // TODO: should we bail out instead?
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
        {
          message:
            'React Hook useEffect has a complex expression in the dependency array. ' +
            'Extract it to a separate variable so it can be statically checked.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {}, [props?.attribute.method()]);
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect has a complex expression in the dependency array. ' +
            'Extract it to a separate variable so it can be statically checked.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {}, [props.method()]);
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect has a complex expression in the dependency array. ' +
            'Extract it to a separate variable so it can be statically checked.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const ref = useRef();
          const [state, setState] = useState();
          useEffect(() => {
            ref.current = {};
            setState(state + 1);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'state'. " +
            'Either include it or remove the dependency array. ' +
            `You can also do a functional update 'setState(s => ...)' ` +
            `if you only need 'state' in the 'setState' call.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [state]',
              output: normalizeIndent`
                function MyComponent() {
                  const ref = useRef();
                  const [state, setState] = useState();
                  useEffect(() => {
                    ref.current = {};
                    setState(state + 1);
                  }, [state]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const ref = useRef();
          const [state, setState] = useState();
          useEffect(() => {
            ref.current = {};
            setState(state + 1);
          }, [ref]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'state'. " +
            'Either include it or remove the dependency array. ' +
            `You can also do a functional update 'setState(s => ...)' ` +
            `if you only need 'state' in the 'setState' call.`,
          // We don't ask to remove static deps but don't add them either.
          // Don't suggest removing "ref" (it's fine either way)
          // but *do* add "state". *Don't* add "setState" ourselves.
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [ref, state]',
              output: normalizeIndent`
                function MyComponent() {
                  const ref = useRef();
                  const [state, setState] = useState();
                  useEffect(() => {
                    ref.current = {};
                    setState(state + 1);
                  }, [ref, state]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const ref1 = useRef();
          const ref2 = useRef();
          useEffect(() => {
            ref1.current.focus();
            console.log(ref2.current.textContent);
            alert(props.someOtherRefs.current.innerHTML);
            fetch(props.color);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'props.color' and 'props.someOtherRefs'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.color, props.someOtherRefs]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const ref1 = useRef();
                  const ref2 = useRef();
                  useEffect(() => {
                    ref1.current.focus();
                    console.log(ref2.current.textContent);
                    alert(props.someOtherRefs.current.innerHTML);
                    fetch(props.color);
                  }, [props.color, props.someOtherRefs]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const ref1 = useRef();
          const ref2 = useRef();
          useEffect(() => {
            ref1.current.focus();
            console.log(ref2.current.textContent);
            alert(props.someOtherRefs.current.innerHTML);
            fetch(props.color);
          }, [ref1.current, ref2.current, props.someOtherRefs, props.color]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has unnecessary dependencies: 'ref1.current' and 'ref2.current'. " +
            'Either exclude them or remove the dependency array. ' +
            "Mutable values like 'ref1.current' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.someOtherRefs, props.color]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const ref1 = useRef();
                  const ref2 = useRef();
                  useEffect(() => {
                    ref1.current.focus();
                    console.log(ref2.current.textContent);
                    alert(props.someOtherRefs.current.innerHTML);
                    fetch(props.color);
                  }, [props.someOtherRefs, props.color]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const ref1 = useRef();
          const ref2 = useRef();
          useEffect(() => {
            ref1?.current?.focus();
            console.log(ref2?.current?.textContent);
            alert(props.someOtherRefs.current.innerHTML);
            fetch(props.color);
          }, [ref1?.current, ref2?.current, props.someOtherRefs, props.color]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has unnecessary dependencies: 'ref1.current' and 'ref2.current'. " +
            'Either exclude them or remove the dependency array. ' +
            "Mutable values like 'ref1.current' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.someOtherRefs, props.color]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const ref1 = useRef();
                  const ref2 = useRef();
                  useEffect(() => {
                    ref1?.current?.focus();
                    console.log(ref2?.current?.textContent);
                    alert(props.someOtherRefs.current.innerHTML);
                    fetch(props.color);
                  }, [props.someOtherRefs, props.color]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const ref = useRef();
          useEffect(() => {
            console.log(ref.current);
          }, [ref.current]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has an unnecessary dependency: 'ref.current'. " +
            'Either exclude it or remove the dependency array. ' +
            "Mutable values like 'ref.current' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                function MyComponent() {
                  const ref = useRef();
                  useEffect(() => {
                    console.log(ref.current);
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({ activeTab }) {
          const ref1 = useRef();
          const ref2 = useRef();
          useEffect(() => {
            ref1.current.scrollTop = 0;
            ref2.current.scrollTop = 0;
          }, [ref1.current, ref2.current, activeTab]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has unnecessary dependencies: 'ref1.current' and 'ref2.current'. " +
            'Either exclude them or remove the dependency array. ' +
            "Mutable values like 'ref1.current' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [activeTab]',
              output: normalizeIndent`
                function MyComponent({ activeTab }) {
                  const ref1 = useRef();
                  const ref2 = useRef();
                  useEffect(() => {
                    ref1.current.scrollTop = 0;
                    ref2.current.scrollTop = 0;
                  }, [activeTab]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({ activeTab, initY }) {
          const ref1 = useRef();
          const ref2 = useRef();
          const fn = useCallback(() => {
            ref1.current.scrollTop = initY;
            ref2.current.scrollTop = initY;
          }, [ref1.current, ref2.current, activeTab, initY]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has unnecessary dependencies: 'activeTab', 'ref1.current', and 'ref2.current'. " +
            'Either exclude them or remove the dependency array. ' +
            "Mutable values like 'ref1.current' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [initY]',
              output: normalizeIndent`
                function MyComponent({ activeTab, initY }) {
                  const ref1 = useRef();
                  const ref2 = useRef();
                  const fn = useCallback(() => {
                    ref1.current.scrollTop = initY;
                    ref2.current.scrollTop = initY;
                  }, [initY]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const ref = useRef();
          useEffect(() => {
            console.log(ref.current);
          }, [ref.current, ref]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has an unnecessary dependency: 'ref.current'. " +
            'Either exclude it or remove the dependency array. ' +
            "Mutable values like 'ref.current' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [ref]',
              output: normalizeIndent`
                function MyComponent() {
                  const ref = useRef();
                  useEffect(() => {
                    console.log(ref.current);
                  }, [ref]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        const MyComponent = forwardRef((props, ref) => {
          useImperativeHandle(ref, () => ({
            focus() {
              alert(props.hello);
            }
          }), [])
        });
      `,
      errors: [
        {
          message:
            "React Hook useImperativeHandle has a missing dependency: 'props.hello'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.hello]',
              output: normalizeIndent`
                const MyComponent = forwardRef((props, ref) => {
                  useImperativeHandle(ref, () => ({
                    focus() {
                      alert(props.hello);
                    }
                  }), [props.hello])
                });
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            if (props.onChange) {
              props.onChange();
            }
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props'. " +
            'Either include it or remove the dependency array. ' +
            `However, 'props' will change when *any* prop changes, so the ` +
            `preferred fix is to destructure the 'props' object outside ` +
            `of the useEffect call and refer to those specific ` +
            `props inside useEffect.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    if (props.onChange) {
                      props.onChange();
                    }
                  }, [props]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            if (props?.onChange) {
              props?.onChange();
            }
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props'. " +
            'Either include it or remove the dependency array. ' +
            `However, 'props' will change when *any* prop changes, so the ` +
            `preferred fix is to destructure the 'props' object outside ` +
            `of the useEffect call and refer to those specific ` +
            `props inside useEffect.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    if (props?.onChange) {
                      props?.onChange();
                    }
                  }, [props]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            function play() {
              props.onPlay();
            }
            function pause() {
              props.onPause();
            }
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props'. " +
            'Either include it or remove the dependency array. ' +
            `However, 'props' will change when *any* prop changes, so the ` +
            `preferred fix is to destructure the 'props' object outside ` +
            `of the useEffect call and refer to those specific ` +
            `props inside useEffect.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    function play() {
                      props.onPlay();
                    }
                    function pause() {
                      props.onPause();
                    }
                  }, [props]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            if (props.foo.onChange) {
              props.foo.onChange();
            }
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props.foo'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    if (props.foo.onChange) {
                      props.foo.onChange();
                    }
                  }, [props.foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            props.onChange();
            if (props.foo.onChange) {
              props.foo.onChange();
            }
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props'. " +
            'Either include it or remove the dependency array. ' +
            `However, 'props' will change when *any* prop changes, so the ` +
            `preferred fix is to destructure the 'props' object outside ` +
            `of the useEffect call and refer to those specific ` +
            `props inside useEffect.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    props.onChange();
                    if (props.foo.onChange) {
                      props.foo.onChange();
                    }
                  }, [props]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const [skillsCount] = useState();
          useEffect(() => {
            if (skillsCount === 0 && !props.isEditMode) {
              props.toggleEditMode();
            }
          }, [skillsCount, props.isEditMode, props.toggleEditMode]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props'. " +
            'Either include it or remove the dependency array. ' +
            `However, 'props' will change when *any* prop changes, so the ` +
            `preferred fix is to destructure the 'props' object outside ` +
            `of the useEffect call and refer to those specific ` +
            `props inside useEffect.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [skillsCount, props.isEditMode, props.toggleEditMode, props]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const [skillsCount] = useState();
                  useEffect(() => {
                    if (skillsCount === 0 && !props.isEditMode) {
                      props.toggleEditMode();
                    }
                  }, [skillsCount, props.isEditMode, props.toggleEditMode, props]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const [skillsCount] = useState();
          useEffect(() => {
            if (skillsCount === 0 && !props.isEditMode) {
              props.toggleEditMode();
            }
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'props' and 'skillsCount'. " +
            'Either include them or remove the dependency array. ' +
            `However, 'props' will change when *any* prop changes, so the ` +
            `preferred fix is to destructure the 'props' object outside ` +
            `of the useEffect call and refer to those specific ` +
            `props inside useEffect.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props, skillsCount]',
              output: normalizeIndent`
                function MyComponent(props) {
                  const [skillsCount] = useState();
                  useEffect(() => {
                    if (skillsCount === 0 && !props.isEditMode) {
                      props.toggleEditMode();
                    }
                  }, [props, skillsCount]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            externalCall(props);
            props.onChange();
          }, []);
        }
      `,
      // Don't suggest to destructure props here since you can't.
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    externalCall(props);
                    props.onChange();
                  }, [props]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            props.onChange();
            externalCall(props);
          }, []);
        }
      `,
      // Don't suggest to destructure props here since you can't.
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props]',
              output: normalizeIndent`
                function MyComponent(props) {
                  useEffect(() => {
                    props.onChange();
                    externalCall(props);
                  }, [props]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let value;
          let value2;
          let value3;
          let value4;
          let asyncValue;
          useEffect(() => {
            if (value4) {
              value = {};
            }
            value2 = 100;
            value = 43;
            value4 = true;
            console.log(value2);
            console.log(value3);
            setTimeout(() => {
              asyncValue = 100;
            });
          }, []);
        }
      `,
      // This is a separate warning unrelated to others.
      // We could've made a separate rule for it but it's rare enough to name it.
      // No suggestions because the intent isn't clear.
      errors: [
        {
          message:
            // value2
            `Assignments to the 'value2' variable from inside React Hook useEffect ` +
            `will be lost after each render. To preserve the value over time, ` +
            `store it in a useRef Hook and keep the mutable value in the '.current' property. ` +
            `Otherwise, you can move this variable directly inside useEffect.`,
          suggestions: undefined,
        },
        {
          message:
            // value
            `Assignments to the 'value' variable from inside React Hook useEffect ` +
            `will be lost after each render. To preserve the value over time, ` +
            `store it in a useRef Hook and keep the mutable value in the '.current' property. ` +
            `Otherwise, you can move this variable directly inside useEffect.`,
          suggestions: undefined,
        },
        {
          message:
            // value4
            `Assignments to the 'value4' variable from inside React Hook useEffect ` +
            `will be lost after each render. To preserve the value over time, ` +
            `store it in a useRef Hook and keep the mutable value in the '.current' property. ` +
            `Otherwise, you can move this variable directly inside useEffect.`,
          suggestions: undefined,
        },
        {
          message:
            // asyncValue
            `Assignments to the 'asyncValue' variable from inside React Hook useEffect ` +
            `will be lost after each render. To preserve the value over time, ` +
            `store it in a useRef Hook and keep the mutable value in the '.current' property. ` +
            `Otherwise, you can move this variable directly inside useEffect.`,
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let value;
          let value2;
          let value3;
          let asyncValue;
          useEffect(() => {
            value = {};
            value2 = 100;
            value = 43;
            console.log(value2);
            console.log(value3);
            setTimeout(() => {
              asyncValue = 100;
            });
          }, [value, value2, value3]);
        }
      `,
      // This is a separate warning unrelated to others.
      // We could've made a separate rule for it but it's rare enough to name it.
      // No suggestions because the intent isn't clear.
      errors: [
        {
          message:
            // value
            `Assignments to the 'value' variable from inside React Hook useEffect ` +
            `will be lost after each render. To preserve the value over time, ` +
            `store it in a useRef Hook and keep the mutable value in the '.current' property. ` +
            `Otherwise, you can move this variable directly inside useEffect.`,
          suggestions: undefined,
        },
        {
          message:
            // value2
            `Assignments to the 'value2' variable from inside React Hook useEffect ` +
            `will be lost after each render. To preserve the value over time, ` +
            `store it in a useRef Hook and keep the mutable value in the '.current' property. ` +
            `Otherwise, you can move this variable directly inside useEffect.`,
          suggestions: undefined,
        },
        {
          message:
            // asyncValue
            `Assignments to the 'asyncValue' variable from inside React Hook useEffect ` +
            `will be lost after each render. To preserve the value over time, ` +
            `store it in a useRef Hook and keep the mutable value in the '.current' property. ` +
            `Otherwise, you can move this variable directly inside useEffect.`,
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const myRef = useRef();
          useEffect(() => {
            const handleMove = () => {};
            myRef.current.addEventListener('mousemove', handleMove);
            return () => myRef.current.removeEventListener('mousemove', handleMove);
          }, []);
          return <div ref={myRef} />;
        }
      `,
      errors: [
        {
          message:
            `The ref value 'myRef.current' will likely have changed by the time ` +
            `this effect cleanup function runs. If this ref points to a node ` +
            `rendered by React, copy 'myRef.current' to a variable inside the effect, ` +
            `and use that variable in the cleanup function.`,
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const myRef = useRef();
          useEffect(() => {
            const handleMove = () => {};
            myRef?.current?.addEventListener('mousemove', handleMove);
            return () => myRef?.current?.removeEventListener('mousemove', handleMove);
          }, []);
          return <div ref={myRef} />;
        }
      `,
      errors: [
        {
          message:
            `The ref value 'myRef.current' will likely have changed by the time ` +
            `this effect cleanup function runs. If this ref points to a node ` +
            `rendered by React, copy 'myRef.current' to a variable inside the effect, ` +
            `and use that variable in the cleanup function.`,
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const myRef = useRef();
          useEffect(() => {
            const handleMove = () => {};
            myRef.current.addEventListener('mousemove', handleMove);
            return () => myRef.current.removeEventListener('mousemove', handleMove);
          });
          return <div ref={myRef} />;
        }
      `,
      errors: [
        {
          message:
            `The ref value 'myRef.current' will likely have changed by the time ` +
            `this effect cleanup function runs. If this ref points to a node ` +
            `rendered by React, copy 'myRef.current' to a variable inside the effect, ` +
            `and use that variable in the cleanup function.`,
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function useMyThing(myRef) {
          useEffect(() => {
            const handleMove = () => {};
            myRef.current.addEventListener('mousemove', handleMove);
            return () => myRef.current.removeEventListener('mousemove', handleMove);
          }, [myRef]);
        }
      `,
      errors: [
        {
          message:
            `The ref value 'myRef.current' will likely have changed by the time ` +
            `this effect cleanup function runs. If this ref points to a node ` +
            `rendered by React, copy 'myRef.current' to a variable inside the effect, ` +
            `and use that variable in the cleanup function.`,
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function useMyThing(myRef) {
          useEffect(() => {
            const handleMouse = () => {};
            myRef.current.addEventListener('mousemove', handleMouse);
            myRef.current.addEventListener('mousein', handleMouse);
            return function() {
              setTimeout(() => {
                myRef.current.removeEventListener('mousemove', handleMouse);
                myRef.current.removeEventListener('mousein', handleMouse);
              });
            }
          }, [myRef]);
        }
      `,
      errors: [
        {
          message:
            `The ref value 'myRef.current' will likely have changed by the time ` +
            `this effect cleanup function runs. If this ref points to a node ` +
            `rendered by React, copy 'myRef.current' to a variable inside the effect, ` +
            `and use that variable in the cleanup function.`,
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function useMyThing(myRef, active) {
          useEffect(() => {
            const handleMove = () => {};
            if (active) {
              myRef.current.addEventListener('mousemove', handleMove);
              return function() {
                setTimeout(() => {
                  myRef.current.removeEventListener('mousemove', handleMove);
                });
              }
            }
          }, [myRef, active]);
        }
      `,
      errors: [
        {
          message:
            `The ref value 'myRef.current' will likely have changed by the time ` +
            `this effect cleanup function runs. If this ref points to a node ` +
            `rendered by React, copy 'myRef.current' to a variable inside the effect, ` +
            `and use that variable in the cleanup function.`,
          suggestions: undefined,
        },
      ],
    },
    {
      code: `
        function MyComponent() {
          const myRef = useRef();
          useLayoutEffect_SAFE_FOR_SSR(() => {
            const handleMove = () => {};
            myRef.current.addEventListener('mousemove', handleMove);
            return () => myRef.current.removeEventListener('mousemove', handleMove);
          });
          return <div ref={myRef} />;
        }
      `,
      // No changes
      output: null,
      errors: [
        `The ref value 'myRef.current' will likely have changed by the time ` +
          `this effect cleanup function runs. If this ref points to a node ` +
          `rendered by React, copy 'myRef.current' to a variable inside the effect, ` +
          `and use that variable in the cleanup function.`,
      ],
      options: [{additionalHooks: 'useLayoutEffect_SAFE_FOR_SSR'}],
    },
    {
      // Autofix ignores constant primitives (leaving the ones that are there).
      code: normalizeIndent`
        function MyComponent() {
          const local1 = 42;
          const local2 = '42';
          const local3 = null;
          const local4 = {};
          useEffect(() => {
            console.log(local1);
            console.log(local2);
            console.log(local3);
            console.log(local4);
          }, [local1, local3]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local4'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local1, local3, local4]',
              output: normalizeIndent`
                function MyComponent() {
                  const local1 = 42;
                  const local2 = '42';
                  const local3 = null;
                  const local4 = {};
                  useEffect(() => {
                    console.log(local1);
                    console.log(local2);
                    console.log(local3);
                    console.log(local4);
                  }, [local1, local3, local4]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          useEffect(() => {
            window.scrollTo(0, 0);
          }, [window]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has an unnecessary dependency: 'window'. " +
            'Either exclude it or remove the dependency array. ' +
            "Outer scope values like 'window' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                function MyComponent() {
                  useEffect(() => {
                    window.scrollTo(0, 0);
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        import MutableStore from 'store';

        function MyComponent() {
          useEffect(() => {
            console.log(MutableStore.hello);
          }, [MutableStore.hello]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has an unnecessary dependency: 'MutableStore.hello'. " +
            'Either exclude it or remove the dependency array. ' +
            "Outer scope values like 'MutableStore.hello' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                import MutableStore from 'store';

                function MyComponent() {
                  useEffect(() => {
                    console.log(MutableStore.hello);
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        import MutableStore from 'store';
        let z = {};

        function MyComponent(props) {
          let x = props.foo;
          {
            let y = props.bar;
            useEffect(() => {
              console.log(MutableStore.hello.world, props.foo, x, y, z, global.stuff);
            }, [MutableStore.hello.world, props.foo, x, y, z, global.stuff]);
          }
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect has unnecessary dependencies: ' +
            "'MutableStore.hello.world', 'global.stuff', and 'z'. " +
            'Either exclude them or remove the dependency array. ' +
            "Outer scope values like 'MutableStore.hello.world' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo, x, y]',
              output: normalizeIndent`
                import MutableStore from 'store';
                let z = {};

                function MyComponent(props) {
                  let x = props.foo;
                  {
                    let y = props.bar;
                    useEffect(() => {
                      console.log(MutableStore.hello.world, props.foo, x, y, z, global.stuff);
                    }, [props.foo, x, y]);
                  }
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        import MutableStore from 'store';
        let z = {};

        function MyComponent(props) {
          let x = props.foo;
          {
            let y = props.bar;
            useEffect(() => {
              // nothing
            }, [MutableStore.hello.world, props.foo, x, y, z, global.stuff]);
          }
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect has unnecessary dependencies: ' +
            "'MutableStore.hello.world', 'global.stuff', and 'z'. " +
            'Either exclude them or remove the dependency array. ' +
            "Outer scope values like 'MutableStore.hello.world' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          // The output should contain the ones that are inside a component
          // since there are legit reasons to over-specify them for effects.
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.foo, x, y]',
              output: normalizeIndent`
                import MutableStore from 'store';
                let z = {};

                function MyComponent(props) {
                  let x = props.foo;
                  {
                    let y = props.bar;
                    useEffect(() => {
                      // nothing
                    }, [props.foo, x, y]);
                  }
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        import MutableStore from 'store';
        let z = {};

        function MyComponent(props) {
          let x = props.foo;
          {
            let y = props.bar;
            const fn = useCallback(() => {
              // nothing
            }, [MutableStore.hello.world, props.foo, x, y, z, global.stuff]);
          }
        }
      `,
      errors: [
        {
          message:
            'React Hook useCallback has unnecessary dependencies: ' +
            "'MutableStore.hello.world', 'global.stuff', 'props.foo', 'x', 'y', and 'z'. " +
            'Either exclude them or remove the dependency array. ' +
            "Outer scope values like 'MutableStore.hello.world' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                import MutableStore from 'store';
                let z = {};

                function MyComponent(props) {
                  let x = props.foo;
                  {
                    let y = props.bar;
                    const fn = useCallback(() => {
                      // nothing
                    }, []);
                  }
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        import MutableStore from 'store';
        let z = {};

        function MyComponent(props) {
          let x = props.foo;
          {
            let y = props.bar;
            const fn = useCallback(() => {
              // nothing
            }, [MutableStore?.hello?.world, props.foo, x, y, z, global?.stuff]);
          }
        }
      `,
      errors: [
        {
          message:
            'React Hook useCallback has unnecessary dependencies: ' +
            "'MutableStore.hello.world', 'global.stuff', 'props.foo', 'x', 'y', and 'z'. " +
            'Either exclude them or remove the dependency array. ' +
            "Outer scope values like 'MutableStore.hello.world' aren't valid dependencies " +
            "because mutating them doesn't re-render the component.",
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                import MutableStore from 'store';
                let z = {};

                function MyComponent(props) {
                  let x = props.foo;
                  {
                    let y = props.bar;
                    const fn = useCallback(() => {
                      // nothing
                    }, []);
                  }
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Every almost-static function is tainted by a dynamic value.
      code: normalizeIndent`
        function MyComponent(props) {
          let [, setState] = useState();
          let [, dispatch] = React.useReducer();
          let taint = props.foo;

          function handleNext1(value) {
            let value2 = value * taint;
            setState(value2);
            console.log('hello');
          }
          const handleNext2 = (value) => {
            setState(taint(value));
            console.log('hello');
          };
          let handleNext3 = function(value) {
            setTimeout(() => console.log(taint));
            dispatch({ type: 'x', value });
          };
          useEffect(() => {
            return Store.subscribe(handleNext1);
          }, []);
          useLayoutEffect(() => {
            return Store.subscribe(handleNext2);
          }, []);
          useMemo(() => {
            return Store.subscribe(handleNext3);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'handleNext1'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [handleNext1]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let [, setState] = useState();
                  let [, dispatch] = React.useReducer();
                  let taint = props.foo;

                  function handleNext1(value) {
                    let value2 = value * taint;
                    setState(value2);
                    console.log('hello');
                  }
                  const handleNext2 = (value) => {
                    setState(taint(value));
                    console.log('hello');
                  };
                  let handleNext3 = function(value) {
                    setTimeout(() => console.log(taint));
                    dispatch({ type: 'x', value });
                  };
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                  }, [handleNext1]);
                  useLayoutEffect(() => {
                    return Store.subscribe(handleNext2);
                  }, []);
                  useMemo(() => {
                    return Store.subscribe(handleNext3);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook useLayoutEffect has a missing dependency: 'handleNext2'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [handleNext2]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let [, setState] = useState();
                  let [, dispatch] = React.useReducer();
                  let taint = props.foo;

                  function handleNext1(value) {
                    let value2 = value * taint;
                    setState(value2);
                    console.log('hello');
                  }
                  const handleNext2 = (value) => {
                    setState(taint(value));
                    console.log('hello');
                  };
                  let handleNext3 = function(value) {
                    setTimeout(() => console.log(taint));
                    dispatch({ type: 'x', value });
                  };
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                  }, []);
                  useLayoutEffect(() => {
                    return Store.subscribe(handleNext2);
                  }, [handleNext2]);
                  useMemo(() => {
                    return Store.subscribe(handleNext3);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook useMemo has a missing dependency: 'handleNext3'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [handleNext3]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let [, setState] = useState();
                  let [, dispatch] = React.useReducer();
                  let taint = props.foo;

                  function handleNext1(value) {
                    let value2 = value * taint;
                    setState(value2);
                    console.log('hello');
                  }
                  const handleNext2 = (value) => {
                    setState(taint(value));
                    console.log('hello');
                  };
                  let handleNext3 = function(value) {
                    setTimeout(() => console.log(taint));
                    dispatch({ type: 'x', value });
                  };
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                  }, []);
                  useLayoutEffect(() => {
                    return Store.subscribe(handleNext2);
                  }, []);
                  useMemo(() => {
                    return Store.subscribe(handleNext3);
                  }, [handleNext3]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Regression test
      code: normalizeIndent`
        function MyComponent(props) {
          let [, setState] = useState();
          let [, dispatch] = React.useReducer();
          let taint = props.foo;

          // Shouldn't affect anything
          function handleChange() {}

          function handleNext1(value) {
            let value2 = value * taint;
            setState(value2);
            console.log('hello');
          }
          const handleNext2 = (value) => {
            setState(taint(value));
            console.log('hello');
          };
          let handleNext3 = function(value) {
            console.log(taint);
            dispatch({ type: 'x', value });
          };
          useEffect(() => {
            return Store.subscribe(handleNext1);
          }, []);
          useLayoutEffect(() => {
            return Store.subscribe(handleNext2);
          }, []);
          useMemo(() => {
            return Store.subscribe(handleNext3);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'handleNext1'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [handleNext1]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let [, setState] = useState();
                  let [, dispatch] = React.useReducer();
                  let taint = props.foo;

                  // Shouldn't affect anything
                  function handleChange() {}

                  function handleNext1(value) {
                    let value2 = value * taint;
                    setState(value2);
                    console.log('hello');
                  }
                  const handleNext2 = (value) => {
                    setState(taint(value));
                    console.log('hello');
                  };
                  let handleNext3 = function(value) {
                    console.log(taint);
                    dispatch({ type: 'x', value });
                  };
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                  }, [handleNext1]);
                  useLayoutEffect(() => {
                    return Store.subscribe(handleNext2);
                  }, []);
                  useMemo(() => {
                    return Store.subscribe(handleNext3);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook useLayoutEffect has a missing dependency: 'handleNext2'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [handleNext2]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let [, setState] = useState();
                  let [, dispatch] = React.useReducer();
                  let taint = props.foo;

                  // Shouldn't affect anything
                  function handleChange() {}

                  function handleNext1(value) {
                    let value2 = value * taint;
                    setState(value2);
                    console.log('hello');
                  }
                  const handleNext2 = (value) => {
                    setState(taint(value));
                    console.log('hello');
                  };
                  let handleNext3 = function(value) {
                    console.log(taint);
                    dispatch({ type: 'x', value });
                  };
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                  }, []);
                  useLayoutEffect(() => {
                    return Store.subscribe(handleNext2);
                  }, [handleNext2]);
                  useMemo(() => {
                    return Store.subscribe(handleNext3);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook useMemo has a missing dependency: 'handleNext3'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [handleNext3]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let [, setState] = useState();
                  let [, dispatch] = React.useReducer();
                  let taint = props.foo;

                  // Shouldn't affect anything
                  function handleChange() {}

                  function handleNext1(value) {
                    let value2 = value * taint;
                    setState(value2);
                    console.log('hello');
                  }
                  const handleNext2 = (value) => {
                    setState(taint(value));
                    console.log('hello');
                  };
                  let handleNext3 = function(value) {
                    console.log(taint);
                    dispatch({ type: 'x', value });
                  };
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                  }, []);
                  useLayoutEffect(() => {
                    return Store.subscribe(handleNext2);
                  }, []);
                  useMemo(() => {
                    return Store.subscribe(handleNext3);
                  }, [handleNext3]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Regression test
      code: normalizeIndent`
        function MyComponent(props) {
          let [, setState] = useState();
          let [, dispatch] = React.useReducer();
          let taint = props.foo;

          // Shouldn't affect anything
          const handleChange = () => {};

          function handleNext1(value) {
            let value2 = value * taint;
            setState(value2);
            console.log('hello');
          }
          const handleNext2 = (value) => {
            setState(taint(value));
            console.log('hello');
          };
          let handleNext3 = function(value) {
            console.log(taint);
            dispatch({ type: 'x', value });
          };
          useEffect(() => {
            return Store.subscribe(handleNext1);
          }, []);
          useLayoutEffect(() => {
            return Store.subscribe(handleNext2);
          }, []);
          useMemo(() => {
            return Store.subscribe(handleNext3);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'handleNext1'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [handleNext1]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let [, setState] = useState();
                  let [, dispatch] = React.useReducer();
                  let taint = props.foo;

                  // Shouldn't affect anything
                  const handleChange = () => {};

                  function handleNext1(value) {
                    let value2 = value * taint;
                    setState(value2);
                    console.log('hello');
                  }
                  const handleNext2 = (value) => {
                    setState(taint(value));
                    console.log('hello');
                  };
                  let handleNext3 = function(value) {
                    console.log(taint);
                    dispatch({ type: 'x', value });
                  };
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                  }, [handleNext1]);
                  useLayoutEffect(() => {
                    return Store.subscribe(handleNext2);
                  }, []);
                  useMemo(() => {
                    return Store.subscribe(handleNext3);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook useLayoutEffect has a missing dependency: 'handleNext2'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [handleNext2]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let [, setState] = useState();
                  let [, dispatch] = React.useReducer();
                  let taint = props.foo;

                  // Shouldn't affect anything
                  const handleChange = () => {};

                  function handleNext1(value) {
                    let value2 = value * taint;
                    setState(value2);
                    console.log('hello');
                  }
                  const handleNext2 = (value) => {
                    setState(taint(value));
                    console.log('hello');
                  };
                  let handleNext3 = function(value) {
                    console.log(taint);
                    dispatch({ type: 'x', value });
                  };
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                  }, []);
                  useLayoutEffect(() => {
                    return Store.subscribe(handleNext2);
                  }, [handleNext2]);
                  useMemo(() => {
                    return Store.subscribe(handleNext3);
                  }, []);
                }
              `,
            },
          ],
        },
        {
          message:
            "React Hook useMemo has a missing dependency: 'handleNext3'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [handleNext3]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let [, setState] = useState();
                  let [, dispatch] = React.useReducer();
                  let taint = props.foo;

                  // Shouldn't affect anything
                  const handleChange = () => {};

                  function handleNext1(value) {
                    let value2 = value * taint;
                    setState(value2);
                    console.log('hello');
                  }
                  const handleNext2 = (value) => {
                    setState(taint(value));
                    console.log('hello');
                  };
                  let handleNext3 = function(value) {
                    console.log(taint);
                    dispatch({ type: 'x', value });
                  };
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                  }, []);
                  useLayoutEffect(() => {
                    return Store.subscribe(handleNext2);
                  }, []);
                  useMemo(() => {
                    return Store.subscribe(handleNext3);
                  }, [handleNext3]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let [, setState] = useState();

          function handleNext(value) {
            setState(value);
          }

          useEffect(() => {
            return Store.subscribe(handleNext);
          }, [handleNext]);
        }
      `,
      errors: [
        {
          message:
            `The 'handleNext' function makes the dependencies of ` +
            `useEffect Hook (at line 11) change on every render. ` +
            `Move it inside the useEffect callback. Alternatively, ` +
            `wrap the definition of 'handleNext' in its own useCallback() Hook.`,
          // Not gonna fix a function definition
          // because it's not always safe due to hoisting.
          suggestions: undefined,
        },
      ],
    },
    {
      // Even if the function only references static values,
      // once you specify it in deps, it will invalidate them.
      code: normalizeIndent`
        function MyComponent(props) {
          let [, setState] = useState();

          const handleNext = (value) => {
            setState(value);
          };

          useEffect(() => {
            return Store.subscribe(handleNext);
          }, [handleNext]);
        }
      `,
      errors: [
        {
          message:
            `The 'handleNext' function makes the dependencies of ` +
            `useEffect Hook (at line 11) change on every render. ` +
            `Move it inside the useEffect callback. Alternatively, ` +
            `wrap the definition of 'handleNext' in its own useCallback() Hook.`,
          // We don't fix moving (too invasive). But that's the suggested fix
          // when only effect uses this function. Otherwise, we'd useCallback.
          suggestions: undefined,
        },
      ],
    },
    {
      // Even if the function only references static values,
      // once you specify it in deps, it will invalidate them.
      // However, we can't suggest moving handleNext into the
      // effect because it is *also* used outside of it.
      // So our suggestion is useCallback().
      code: normalizeIndent`
        function MyComponent(props) {
          let [, setState] = useState();

          const handleNext = (value) => {
            setState(value);
          };

          useEffect(() => {
            return Store.subscribe(handleNext);
          }, [handleNext]);

          return <div onClick={handleNext} />;
        }
      `,
      errors: [
        {
          message:
            `The 'handleNext' function makes the dependencies of ` +
            `useEffect Hook (at line 11) change on every render. ` +
            `To fix this, wrap the definition of 'handleNext' in its own useCallback() Hook.`,
          // We fix this one with useCallback since it's
          // the easy fix and you can't just move it into effect.
          suggestions: [
            {
              desc: "Wrap the definition of 'handleNext' in its own useCallback() Hook.",
              output: normalizeIndent`
                function MyComponent(props) {
                  let [, setState] = useState();

                  const handleNext = useCallback((value) => {
                    setState(value);
                  });

                  useEffect(() => {
                    return Store.subscribe(handleNext);
                  }, [handleNext]);

                  return <div onClick={handleNext} />;
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          function handleNext1() {
            console.log('hello');
          }
          const handleNext2 = () => {
            console.log('hello');
          };
          let handleNext3 = function() {
            console.log('hello');
          };
          useEffect(() => {
            return Store.subscribe(handleNext1);
          }, [handleNext1]);
          useLayoutEffect(() => {
            return Store.subscribe(handleNext2);
          }, [handleNext2]);
          useMemo(() => {
            return Store.subscribe(handleNext3);
          }, [handleNext3]);
        }
      `,
      errors: [
        {
          message:
            "The 'handleNext1' function makes the dependencies of useEffect Hook " +
            '(at line 14) change on every render. Move it inside the useEffect callback. ' +
            "Alternatively, wrap the definition of 'handleNext1' in its own useCallback() Hook.",
          suggestions: undefined,
        },
        {
          message:
            "The 'handleNext2' function makes the dependencies of useLayoutEffect Hook " +
            '(at line 17) change on every render. Move it inside the useLayoutEffect callback. ' +
            "Alternatively, wrap the definition of 'handleNext2' in its own useCallback() Hook.",
          suggestions: undefined,
        },
        {
          message:
            "The 'handleNext3' function makes the dependencies of useMemo Hook " +
            '(at line 20) change on every render. Move it inside the useMemo callback. ' +
            "Alternatively, wrap the definition of 'handleNext3' in its own useCallback() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          function handleNext1() {
            console.log('hello');
          }
          const handleNext2 = () => {
            console.log('hello');
          };
          let handleNext3 = function() {
            console.log('hello');
          };
          useEffect(() => {
            handleNext1();
            return Store.subscribe(() => handleNext1());
          }, [handleNext1]);
          useLayoutEffect(() => {
            handleNext2();
            return Store.subscribe(() => handleNext2());
          }, [handleNext2]);
          useMemo(() => {
            handleNext3();
            return Store.subscribe(() => handleNext3());
          }, [handleNext3]);
        }
      `,
      // Suggestions don't wrap into useCallback here
      // because they are only referenced by effect itself.
      errors: [
        {
          message:
            "The 'handleNext1' function makes the dependencies of useEffect Hook " +
            '(at line 15) change on every render. Move it inside the useEffect callback. ' +
            "Alternatively, wrap the definition of 'handleNext1' in its own useCallback() Hook.",
          suggestions: undefined,
        },
        {
          message:
            "The 'handleNext2' function makes the dependencies of useLayoutEffect Hook " +
            '(at line 19) change on every render. Move it inside the useLayoutEffect callback. ' +
            "Alternatively, wrap the definition of 'handleNext2' in its own useCallback() Hook.",
          suggestions: undefined,
        },
        {
          message:
            "The 'handleNext3' function makes the dependencies of useMemo Hook " +
            '(at line 23) change on every render. Move it inside the useMemo callback. ' +
            "Alternatively, wrap the definition of 'handleNext3' in its own useCallback() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          function handleNext1() {
            console.log('hello');
          }
          const handleNext2 = () => {
            console.log('hello');
          };
          let handleNext3 = function() {
            console.log('hello');
          };
          useEffect(() => {
            handleNext1();
            return Store.subscribe(() => handleNext1());
          }, [handleNext1]);
          useLayoutEffect(() => {
            handleNext2();
            return Store.subscribe(() => handleNext2());
          }, [handleNext2]);
          useMemo(() => {
            handleNext3();
            return Store.subscribe(() => handleNext3());
          }, [handleNext3]);
          return (
            <div
              onClick={() => {
                handleNext1();
                setTimeout(handleNext2);
                setTimeout(() => {
                  handleNext3();
                });
              }}
            />
          );
        }
      `,
      errors: [
        {
          message:
            "The 'handleNext1' function makes the dependencies of useEffect Hook " +
            '(at line 15) change on every render. To fix this, wrap the ' +
            "definition of 'handleNext1' in its own useCallback() Hook.",
          suggestions: undefined,
        },
        {
          message:
            "The 'handleNext2' function makes the dependencies of useLayoutEffect Hook " +
            '(at line 19) change on every render. To fix this, wrap the ' +
            "definition of 'handleNext2' in its own useCallback() Hook.",
          // Suggestion wraps into useCallback where possible (variables only)
          // because they are only referenced outside the effect.
          suggestions: [
            {
              desc: "Wrap the definition of 'handleNext2' in its own useCallback() Hook.",
              output: normalizeIndent`
                function MyComponent(props) {
                  function handleNext1() {
                    console.log('hello');
                  }
                  const handleNext2 = useCallback(() => {
                    console.log('hello');
                  });
                  let handleNext3 = function() {
                    console.log('hello');
                  };
                  useEffect(() => {
                    handleNext1();
                    return Store.subscribe(() => handleNext1());
                  }, [handleNext1]);
                  useLayoutEffect(() => {
                    handleNext2();
                    return Store.subscribe(() => handleNext2());
                  }, [handleNext2]);
                  useMemo(() => {
                    handleNext3();
                    return Store.subscribe(() => handleNext3());
                  }, [handleNext3]);
                  return (
                    <div
                      onClick={() => {
                        handleNext1();
                        setTimeout(handleNext2);
                        setTimeout(() => {
                          handleNext3();
                        });
                      }}
                    />
                  );
                }
              `,
            },
          ],
        },
        {
          message:
            "The 'handleNext3' function makes the dependencies of useMemo Hook " +
            '(at line 23) change on every render. To fix this, wrap the ' +
            "definition of 'handleNext3' in its own useCallback() Hook.",
          // Autofix wraps into useCallback where possible (variables only)
          // because they are only referenced outside the effect.
          suggestions: [
            {
              desc: "Wrap the definition of 'handleNext3' in its own useCallback() Hook.",
              output: normalizeIndent`
                function MyComponent(props) {
                  function handleNext1() {
                    console.log('hello');
                  }
                  const handleNext2 = () => {
                    console.log('hello');
                  };
                  let handleNext3 = useCallback(function() {
                    console.log('hello');
                  });
                  useEffect(() => {
                    handleNext1();
                    return Store.subscribe(() => handleNext1());
                  }, [handleNext1]);
                  useLayoutEffect(() => {
                    handleNext2();
                    return Store.subscribe(() => handleNext2());
                  }, [handleNext2]);
                  useMemo(() => {
                    handleNext3();
                    return Store.subscribe(() => handleNext3());
                  }, [handleNext3]);
                  return (
                    <div
                      onClick={() => {
                        handleNext1();
                        setTimeout(handleNext2);
                        setTimeout(() => {
                          handleNext3();
                        });
                      }}
                    />
                  );
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          const handleNext1 = () => {
            console.log('hello');
          };
          function handleNext2() {
            console.log('hello');
          }
          useEffect(() => {
            return Store.subscribe(handleNext1);
            return Store.subscribe(handleNext2);
          }, [handleNext1, handleNext2]);
          useEffect(() => {
            return Store.subscribe(handleNext1);
            return Store.subscribe(handleNext2);
          }, [handleNext1, handleNext2]);
        }
      `,
      // Normally we'd suggest moving handleNext inside an
      // effect. But it's used by more than one. So we
      // suggest useCallback() and use it for the autofix
      // where possible (variable but not declaration).
      // TODO: we could coalesce messages for the same function if it affects multiple Hooks.
      errors: [
        {
          message:
            "The 'handleNext1' function makes the dependencies of useEffect Hook " +
            '(at line 12) change on every render. To fix this, wrap the ' +
            "definition of 'handleNext1' in its own useCallback() Hook.",
          suggestions: [
            {
              desc: "Wrap the definition of 'handleNext1' in its own useCallback() Hook.",
              output: normalizeIndent`
                function MyComponent(props) {
                  const handleNext1 = useCallback(() => {
                    console.log('hello');
                  });
                  function handleNext2() {
                    console.log('hello');
                  }
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                    return Store.subscribe(handleNext2);
                  }, [handleNext1, handleNext2]);
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                    return Store.subscribe(handleNext2);
                  }, [handleNext1, handleNext2]);
                }
              `,
            },
          ],
        },
        {
          message:
            "The 'handleNext1' function makes the dependencies of useEffect Hook " +
            '(at line 16) change on every render. To fix this, wrap the ' +
            "definition of 'handleNext1' in its own useCallback() Hook.",
          suggestions: [
            {
              desc: "Wrap the definition of 'handleNext1' in its own useCallback() Hook.",
              output: normalizeIndent`
                function MyComponent(props) {
                  const handleNext1 = useCallback(() => {
                    console.log('hello');
                  });
                  function handleNext2() {
                    console.log('hello');
                  }
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                    return Store.subscribe(handleNext2);
                  }, [handleNext1, handleNext2]);
                  useEffect(() => {
                    return Store.subscribe(handleNext1);
                    return Store.subscribe(handleNext2);
                  }, [handleNext1, handleNext2]);
                }
              `,
            },
          ],
        },
        {
          message:
            "The 'handleNext2' function makes the dependencies of useEffect Hook " +
            '(at line 12) change on every render. To fix this, wrap the ' +
            "definition of 'handleNext2' in its own useCallback() Hook.",
          suggestions: undefined,
        },
        {
          message:
            "The 'handleNext2' function makes the dependencies of useEffect Hook " +
            '(at line 16) change on every render. To fix this, wrap the ' +
            "definition of 'handleNext2' in its own useCallback() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let handleNext = () => {
            console.log('hello');
          };
          if (props.foo) {
            handleNext = () => {
              console.log('hello');
            };
          }
          useEffect(() => {
            return Store.subscribe(handleNext);
          }, [handleNext]);
        }
      `,
      errors: [
        {
          message:
            "The 'handleNext' function makes the dependencies of useEffect Hook " +
            '(at line 13) change on every render. To fix this, wrap the definition of ' +
            "'handleNext' in its own useCallback() Hook.",
          // Normally we'd suggest moving handleNext inside an
          // effect. But it's used more than once.
          // TODO: our autofix here isn't quite sufficient because
          // it only wraps the first definition. But seems ok.
          suggestions: [
            {
              desc: "Wrap the definition of 'handleNext' in its own useCallback() Hook.",
              output: normalizeIndent`
                function MyComponent(props) {
                  let handleNext = useCallback(() => {
                    console.log('hello');
                  });
                  if (props.foo) {
                    handleNext = () => {
                      console.log('hello');
                    };
                  }
                  useEffect(() => {
                    return Store.subscribe(handleNext);
                  }, [handleNext]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let [, setState] = useState();
          let taint = props.foo;

          function handleNext(value) {
            let value2 = value * taint;
            setState(value2);
            console.log('hello');
          }

          useEffect(() => {
            return Store.subscribe(handleNext);
          }, [handleNext]);
        }
      `,
      errors: [
        {
          message:
            `The 'handleNext' function makes the dependencies of ` +
            `useEffect Hook (at line 14) change on every render. ` +
            `Move it inside the useEffect callback. Alternatively, wrap the ` +
            `definition of 'handleNext' in its own useCallback() Hook.`,
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Counter() {
          let [count, setCount] = useState(0);

          useEffect(() => {
            let id = setInterval(() => {
              setCount(count + 1);
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'count'. " +
            'Either include it or remove the dependency array. ' +
            `You can also do a functional update 'setCount(c => ...)' if you ` +
            `only need 'count' in the 'setCount' call.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [count]',
              output: normalizeIndent`
                function Counter() {
                  let [count, setCount] = useState(0);

                  useEffect(() => {
                    let id = setInterval(() => {
                      setCount(count + 1);
                    }, 1000);
                    return () => clearInterval(id);
                  }, [count]);

                  return <h1>{count}</h1>;
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Counter() {
          let [count, setCount] = useState(0);
          let [increment, setIncrement] = useState(0);

          useEffect(() => {
            let id = setInterval(() => {
              setCount(count + increment);
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'count' and 'increment'. " +
            'Either include them or remove the dependency array. ' +
            `You can also do a functional update 'setCount(c => ...)' if you ` +
            `only need 'count' in the 'setCount' call.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [count, increment]',
              output: normalizeIndent`
                function Counter() {
                  let [count, setCount] = useState(0);
                  let [increment, setIncrement] = useState(0);

                  useEffect(() => {
                    let id = setInterval(() => {
                      setCount(count + increment);
                    }, 1000);
                    return () => clearInterval(id);
                  }, [count, increment]);

                  return <h1>{count}</h1>;
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Counter() {
          let [count, setCount] = useState(0);
          let [increment, setIncrement] = useState(0);

          useEffect(() => {
            let id = setInterval(() => {
              setCount(count => count + increment);
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'increment'. " +
            'Either include it or remove the dependency array. ' +
            `You can also replace multiple useState variables with useReducer ` +
            `if 'setCount' needs the current value of 'increment'.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [increment]',
              output: normalizeIndent`
                function Counter() {
                  let [count, setCount] = useState(0);
                  let [increment, setIncrement] = useState(0);

                  useEffect(() => {
                    let id = setInterval(() => {
                      setCount(count => count + increment);
                    }, 1000);
                    return () => clearInterval(id);
                  }, [increment]);

                  return <h1>{count}</h1>;
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Counter() {
          let [count, setCount] = useState(0);
          let increment = useCustomHook();

          useEffect(() => {
            let id = setInterval(() => {
              setCount(count => count + increment);
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
      // This intentionally doesn't show the reducer message
      // because we don't know if it's safe for it to close over a value.
      // We only show it for state variables (and possibly props).
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'increment'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [increment]',
              output: normalizeIndent`
                function Counter() {
                  let [count, setCount] = useState(0);
                  let increment = useCustomHook();

                  useEffect(() => {
                    let id = setInterval(() => {
                      setCount(count => count + increment);
                    }, 1000);
                    return () => clearInterval(id);
                  }, [increment]);

                  return <h1>{count}</h1>;
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Counter({ step }) {
          let [count, setCount] = useState(0);

          function increment(x) {
            return x + step;
          }

          useEffect(() => {
            let id = setInterval(() => {
              setCount(count => increment(count));
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
      // This intentionally doesn't show the reducer message
      // because we don't know if it's safe for it to close over a value.
      // We only show it for state variables (and possibly props).
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'increment'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [increment]',
              output: normalizeIndent`
                function Counter({ step }) {
                  let [count, setCount] = useState(0);

                  function increment(x) {
                    return x + step;
                  }

                  useEffect(() => {
                    let id = setInterval(() => {
                      setCount(count => increment(count));
                    }, 1000);
                    return () => clearInterval(id);
                  }, [increment]);

                  return <h1>{count}</h1>;
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Counter({ step }) {
          let [count, setCount] = useState(0);

          function increment(x) {
            return x + step;
          }

          useEffect(() => {
            let id = setInterval(() => {
              setCount(count => increment(count));
            }, 1000);
            return () => clearInterval(id);
          }, [increment]);

          return <h1>{count}</h1>;
        }
      `,
      errors: [
        {
          message:
            `The 'increment' function makes the dependencies of useEffect Hook ` +
            `(at line 14) change on every render. Move it inside the useEffect callback. ` +
            `Alternatively, wrap the definition of \'increment\' in its own ` +
            `useCallback() Hook.`,
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Counter({ increment }) {
          let [count, setCount] = useState(0);

          useEffect(() => {
            let id = setInterval(() => {
              setCount(count => count + increment);
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'increment'. " +
            'Either include it or remove the dependency array. ' +
            `If 'setCount' needs the current value of 'increment', ` +
            `you can also switch to useReducer instead of useState and read 'increment' in the reducer.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [increment]',
              output: normalizeIndent`
                function Counter({ increment }) {
                  let [count, setCount] = useState(0);

                  useEffect(() => {
                    let id = setInterval(() => {
                      setCount(count => count + increment);
                    }, 1000);
                    return () => clearInterval(id);
                  }, [increment]);

                  return <h1>{count}</h1>;
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Counter() {
          const [count, setCount] = useState(0);

          function tick() {
            setCount(count + 1);
          }

          useEffect(() => {
            let id = setInterval(() => {
              tick();
            }, 1000);
            return () => clearInterval(id);
          }, []);

          return <h1>{count}</h1>;
        }
      `,
      // TODO: ideally this should suggest useState updater form
      // since this code doesn't actually work. The autofix could
      // at least avoid suggesting 'tick' since it's obviously
      // always different, and thus useless.
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'tick'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [tick]',
              output: normalizeIndent`
                function Counter() {
                  const [count, setCount] = useState(0);

                  function tick() {
                    setCount(count + 1);
                  }

                  useEffect(() => {
                    let id = setInterval(() => {
                      tick();
                    }, 1000);
                    return () => clearInterval(id);
                  }, [tick]);

                  return <h1>{count}</h1>;
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // Regression test for a crash
      code: normalizeIndent`
        function Podcasts() {
          useEffect(() => {
            alert(podcasts);
          }, []);
          let [podcasts, setPodcasts] = useState(null);
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect has a missing dependency: 'podcasts'. ` +
            `Either include it or remove the dependency array.`,
          // Note: this autofix is shady because
          // the variable is used before declaration.
          // TODO: Maybe we can catch those fixes and not autofix.
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [podcasts]',
              output: normalizeIndent`
                function Podcasts() {
                  useEffect(() => {
                    alert(podcasts);
                  }, [podcasts]);
                  let [podcasts, setPodcasts] = useState(null);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Podcasts({ fetchPodcasts, id }) {
          let [podcasts, setPodcasts] = useState(null);
          useEffect(() => {
            fetchPodcasts(id).then(setPodcasts);
          }, [id]);
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect has a missing dependency: 'fetchPodcasts'. ` +
            `Either include it or remove the dependency array. ` +
            `If 'fetchPodcasts' changes too often, ` +
            `find the parent component that defines it and wrap that definition in useCallback.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [fetchPodcasts, id]',
              output: normalizeIndent`
                function Podcasts({ fetchPodcasts, id }) {
                  let [podcasts, setPodcasts] = useState(null);
                  useEffect(() => {
                    fetchPodcasts(id).then(setPodcasts);
                  }, [fetchPodcasts, id]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Podcasts({ api: { fetchPodcasts }, id }) {
          let [podcasts, setPodcasts] = useState(null);
          useEffect(() => {
            fetchPodcasts(id).then(setPodcasts);
          }, [id]);
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect has a missing dependency: 'fetchPodcasts'. ` +
            `Either include it or remove the dependency array. ` +
            `If 'fetchPodcasts' changes too often, ` +
            `find the parent component that defines it and wrap that definition in useCallback.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [fetchPodcasts, id]',
              output: normalizeIndent`
                function Podcasts({ api: { fetchPodcasts }, id }) {
                  let [podcasts, setPodcasts] = useState(null);
                  useEffect(() => {
                    fetchPodcasts(id).then(setPodcasts);
                  }, [fetchPodcasts, id]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Podcasts({ fetchPodcasts, fetchPodcasts2, id }) {
          let [podcasts, setPodcasts] = useState(null);
          useEffect(() => {
            setTimeout(() => {
              console.log(id);
              fetchPodcasts(id).then(setPodcasts);
              fetchPodcasts2(id).then(setPodcasts);
            });
          }, [id]);
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect has missing dependencies: 'fetchPodcasts' and 'fetchPodcasts2'. ` +
            `Either include them or remove the dependency array. ` +
            `If 'fetchPodcasts' changes too often, ` +
            `find the parent component that defines it and wrap that definition in useCallback.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [fetchPodcasts, fetchPodcasts2, id]',
              output: normalizeIndent`
                function Podcasts({ fetchPodcasts, fetchPodcasts2, id }) {
                  let [podcasts, setPodcasts] = useState(null);
                  useEffect(() => {
                    setTimeout(() => {
                      console.log(id);
                      fetchPodcasts(id).then(setPodcasts);
                      fetchPodcasts2(id).then(setPodcasts);
                    });
                  }, [fetchPodcasts, fetchPodcasts2, id]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Podcasts({ fetchPodcasts, id }) {
          let [podcasts, setPodcasts] = useState(null);
          useEffect(() => {
            console.log(fetchPodcasts);
            fetchPodcasts(id).then(setPodcasts);
          }, [id]);
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect has a missing dependency: 'fetchPodcasts'. ` +
            `Either include it or remove the dependency array. ` +
            `If 'fetchPodcasts' changes too often, ` +
            `find the parent component that defines it and wrap that definition in useCallback.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [fetchPodcasts, id]',
              output: normalizeIndent`
                function Podcasts({ fetchPodcasts, id }) {
                  let [podcasts, setPodcasts] = useState(null);
                  useEffect(() => {
                    console.log(fetchPodcasts);
                    fetchPodcasts(id).then(setPodcasts);
                  }, [fetchPodcasts, id]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Podcasts({ fetchPodcasts, id }) {
          let [podcasts, setPodcasts] = useState(null);
          useEffect(() => {
            console.log(fetchPodcasts);
            fetchPodcasts?.(id).then(setPodcasts);
          }, [id]);
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect has a missing dependency: 'fetchPodcasts'. ` +
            `Either include it or remove the dependency array. ` +
            `If 'fetchPodcasts' changes too often, ` +
            `find the parent component that defines it and wrap that definition in useCallback.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [fetchPodcasts, id]',
              output: normalizeIndent`
                function Podcasts({ fetchPodcasts, id }) {
                  let [podcasts, setPodcasts] = useState(null);
                  useEffect(() => {
                    console.log(fetchPodcasts);
                    fetchPodcasts?.(id).then(setPodcasts);
                  }, [fetchPodcasts, id]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      // The mistake here is that it was moved inside the effect
      // so it can't be referenced in the deps array.
      code: normalizeIndent`
        function Thing() {
          useEffect(() => {
            const fetchData = async () => {};
            fetchData();
          }, [fetchData]);
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect has an unnecessary dependency: 'fetchData'. ` +
            `Either exclude it or remove the dependency array.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                function Thing() {
                  useEffect(() => {
                    const fetchData = async () => {};
                    fetchData();
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Hello() {
          const [state, setState] = useState(0);
          useEffect(() => {
            setState({});
          });
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect contains a call to 'setState'. ` +
            `Without a list of dependencies, this can lead to an infinite chain of updates. ` +
            `To fix this, pass [] as a second argument to the useEffect Hook.`,
          suggestions: [
            {
              desc: 'Add dependencies array: []',
              output: normalizeIndent`
                function Hello() {
                  const [state, setState] = useState(0);
                  useEffect(() => {
                    setState({});
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Hello() {
          const [data, setData] = useState(0);
          useEffect(() => {
            fetchData.then(setData);
          });
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect contains a call to 'setData'. ` +
            `Without a list of dependencies, this can lead to an infinite chain of updates. ` +
            `To fix this, pass [] as a second argument to the useEffect Hook.`,
          suggestions: [
            {
              desc: 'Add dependencies array: []',
              output: normalizeIndent`
                function Hello() {
                  const [data, setData] = useState(0);
                  useEffect(() => {
                    fetchData.then(setData);
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Hello({ country }) {
          const [data, setData] = useState(0);
          useEffect(() => {
            fetchData(country).then(setData);
          });
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect contains a call to 'setData'. ` +
            `Without a list of dependencies, this can lead to an infinite chain of updates. ` +
            `To fix this, pass [country] as a second argument to the useEffect Hook.`,
          suggestions: [
            {
              desc: 'Add dependencies array: [country]',
              output: normalizeIndent`
                function Hello({ country }) {
                  const [data, setData] = useState(0);
                  useEffect(() => {
                    fetchData(country).then(setData);
                  }, [country]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Hello({ prop1, prop2 }) {
          const [state, setState] = useState(0);
          useEffect(() => {
            if (prop1) {
              setState(prop2);
            }
          });
        }
      `,
      errors: [
        {
          message:
            `React Hook useEffect contains a call to 'setState'. ` +
            `Without a list of dependencies, this can lead to an infinite chain of updates. ` +
            `To fix this, pass [prop1, prop2] as a second argument to the useEffect Hook.`,
          suggestions: [
            {
              desc: 'Add dependencies array: [prop1, prop2]',
              output: normalizeIndent`
                function Hello({ prop1, prop2 }) {
                  const [state, setState] = useState(0);
                  useEffect(() => {
                    if (prop1) {
                      setState(prop2);
                    }
                  }, [prop1, prop2]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Thing() {
          useEffect(async () => {}, []);
        }
      `,
      errors: [
        {
          message:
            `Effect callbacks are synchronous to prevent race conditions. ` +
            `Put the async function inside:\n\n` +
            'useEffect(() => {\n' +
            '  async function fetchData() {\n' +
            '    // You can await here\n' +
            '    const response = await MyAPI.getData(someId);\n' +
            '    // ...\n' +
            '  }\n' +
            '  fetchData();\n' +
            `}, [someId]); // Or [] if effect doesn't need props or state\n\n` +
            'Learn more about data fetching with Hooks: https://react.dev/link/hooks-data-fetching',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Thing() {
          useEffect(async () => {});
        }
      `,
      errors: [
        {
          message:
            `Effect callbacks are synchronous to prevent race conditions. ` +
            `Put the async function inside:\n\n` +
            'useEffect(() => {\n' +
            '  async function fetchData() {\n' +
            '    // You can await here\n' +
            '    const response = await MyAPI.getData(someId);\n' +
            '    // ...\n' +
            '  }\n' +
            '  fetchData();\n' +
            `}, [someId]); // Or [] if effect doesn't need props or state\n\n` +
            'Learn more about data fetching with Hooks: https://react.dev/link/hooks-data-fetching',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Example() {
          const foo = useCallback(() => {
            foo();
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has an unnecessary dependency: 'foo'. " +
            'Either exclude it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                function Example() {
                  const foo = useCallback(() => {
                    foo();
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Example({ prop }) {
          const foo = useCallback(() => {
            prop.hello(foo);
          }, [foo]);
          const bar = useCallback(() => {
            foo();
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useCallback has a missing dependency: 'prop'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [prop]',
              output: normalizeIndent`
                function Example({ prop }) {
                  const foo = useCallback(() => {
                    prop.hello(foo);
                  }, [prop]);
                  const bar = useCallback(() => {
                    foo();
                  }, [foo]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          function myEffect() {
            console.log(local);
          }
          useEffect(myEffect, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  function myEffect() {
                    console.log(local);
                  }
                  useEffect(myEffect, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          const myEffect = () => {
            console.log(local);
          };
          useEffect(myEffect, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  const myEffect = () => {
                    console.log(local);
                  };
                  useEffect(myEffect, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          const myEffect = function() {
            console.log(local);
          };
          useEffect(myEffect, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  const myEffect = function() {
                    console.log(local);
                  };
                  useEffect(myEffect, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          const myEffect = () => {
            otherThing();
          };
          const otherThing = () => {
            console.log(local);
          };
          useEffect(myEffect, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'otherThing'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [otherThing]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  const myEffect = () => {
                    otherThing();
                  };
                  const otherThing = () => {
                    console.log(local);
                  };
                  useEffect(myEffect, [otherThing]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          const myEffect = debounce(() => {
            console.log(local);
          }, delay);
          useEffect(myEffect, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'myEffect'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [myEffect]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  const myEffect = debounce(() => {
                    console.log(local);
                  }, delay);
                  useEffect(myEffect, [myEffect]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          const myEffect = debounce(() => {
            console.log(local);
          }, delay);
          useEffect(myEffect, [local]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'myEffect'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [myEffect]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  const myEffect = debounce(() => {
                    console.log(local);
                  }, delay);
                  useEffect(myEffect, [myEffect]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({myEffect}) {
          useEffect(myEffect, []);
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect received a function whose dependencies are unknown. Pass an inline function instead.',
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(debounce(() => {
            console.log(local);
          }, delay), []);
        }
      `,
      errors: [
        {
          message:
            'React Hook useEffect received a function whose dependencies ' +
            'are unknown. Pass an inline function instead.',
          suggestions: [],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            console.log(local);
          }, []);
        }
      `,
      // Dangerous autofix is enabled due to the option:
      output: normalizeIndent`
        function MyComponent() {
          const local = {};
          useEffect(() => {
            console.log(local);
          }, [local]);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {};
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
      // Keep this until major IDEs and VS Code FB ESLint plugin support Suggestions API.
      options: [{enableDangerousAutofixThisMayCauseInfiniteLoops: true}],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          let foo = {}
          useEffect(() => {
            foo.bar.baz = 43;
            props.foo.bar.baz = 1;
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'foo.bar' and 'props.foo.bar'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [foo.bar, props.foo.bar]',
              output: normalizeIndent`
                function MyComponent(props) {
                  let foo = {}
                  useEffect(() => {
                    foo.bar.baz = 43;
                    props.foo.bar.baz = 1;
                  }, [foo.bar, props.foo.bar]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = {};
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = [];
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' array makes the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = () => {};
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' function makes the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the definition of 'foo' in its own " +
            'useCallback() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = function bar(){};
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' function makes the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the definition of 'foo' in its own " +
            'useCallback() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = class {};
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' class makes the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = true ? {} : "fine";
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' conditional could make the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = bar || {};
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' logical expression could make the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = bar ?? {};
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' logical expression could make the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = bar && {};
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' logical expression could make the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = bar ? baz ? {} : null : null;
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' conditional could make the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          let foo = {};
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          var foo = {};
          useMemo(() => foo, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useMemo Hook (at line 4) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = {};
          useCallback(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useCallback Hook (at line 6) change on every render. " +
            "Move it inside the useCallback callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = {};
          useEffect(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useEffect Hook (at line 6) change on every render. " +
            "Move it inside the useEffect callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = {};
          useLayoutEffect(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useLayoutEffect Hook (at line 6) change on every render. " +
            "Move it inside the useLayoutEffect callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Component() {
          const foo = {};
          useImperativeHandle(
            ref,
            () => {
               console.log(foo);
            },
            [foo]
          );
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useImperativeHandle Hook (at line 9) change on every render. " +
            "Move it inside the useImperativeHandle callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Foo(section) {
          const foo = section.section_components?.edges ?? [];
          useEffect(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' logical expression could make the dependencies of useEffect Hook (at line 6) change on every render. " +
            "Move it inside the useEffect callback. Alternatively, wrap the initialization of 'foo' in its own " +
            'useMemo() Hook.',
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Foo(section) {
          const foo = {};
          console.log(foo);
          useMemo(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useMemo Hook (at line 7) change on every render. " +
            "To fix this, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Foo() {
          const foo = <>Hi!</>;
          useMemo(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' JSX fragment makes the dependencies of useMemo Hook (at line 6) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Foo() {
          const foo = <div>Hi!</div>;
          useMemo(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' JSX element makes the dependencies of useMemo Hook (at line 6) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Foo() {
          const foo = bar = {};
          useMemo(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' assignment expression makes the dependencies of useMemo Hook (at line 6) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Foo() {
          const foo = new String('foo'); // Note 'foo' will be boxed, and thus an object and thus compared by reference.
          useMemo(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object construction makes the dependencies of useMemo Hook (at line 6) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Foo() {
          const foo = new Map([]);
          useMemo(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object construction makes the dependencies of useMemo Hook (at line 6) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Foo() {
          const foo = /reg/;
          useMemo(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' regular expression makes the dependencies of useMemo Hook (at line 6) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },

    {
      code: normalizeIndent`
        function Foo() {
          class Bar {};
          useMemo(() => {
            console.log(new Bar());
          }, [Bar]);
        }
      `,
      errors: [
        {
          message:
            "The 'Bar' class makes the dependencies of useMemo Hook (at line 6) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'Bar' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function Foo() {
          const foo = {};
          useLayoutEffect(() => {
            console.log(foo);
          }, [foo]);
          useEffect(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useLayoutEffect Hook (at line 6) change on every render. " +
            "To fix this, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
        {
          message:
            "The 'foo' object makes the dependencies of useEffect Hook (at line 9) change on every render. " +
            "To fix this, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function useCustomCallback(callback, deps) {
          return useCallback(callback, deps)
        }
      `,
      errors: [
        {
          message:
            'React Hook useCallback received a function whose dependencies are unknown. Pass an inline function instead.',
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent({ theme }) {
          const onStuff = useEffectEvent(() => {
            showNotification(theme);
          });
          useEffect(() => {
            onStuff();
          }, [onStuff]);
          React.useEffect(() => {
            onStuff();
          }, [onStuff]);
        }
      `,
      errors: [
        {
          message:
            'Functions returned from `useEffectEvent` must not be included in the dependency array. ' +
            'Remove `onStuff` from the list.',
          suggestions: [
            {
              desc: 'Remove the dependency `onStuff`',
              output: normalizeIndent`
                function MyComponent({ theme }) {
                  const onStuff = useEffectEvent(() => {
                    showNotification(theme);
                  });
                  useEffect(() => {
                    onStuff();
                  }, []);
                  React.useEffect(() => {
                    onStuff();
                  }, [onStuff]);
                }
              `,
            },
          ],
        },
        {
          message:
            'Functions returned from `useEffectEvent` must not be included in the dependency array. ' +
            'Remove `onStuff` from the list.',
          suggestions: [
            {
              desc: 'Remove the dependency `onStuff`',
              output: normalizeIndent`
                function MyComponent({ theme }) {
                  const onStuff = useEffectEvent(() => {
                    showNotification(theme);
                  });
                  useEffect(() => {
                    onStuff();
                  }, [onStuff]);
                  React.useEffect(() => {
                    onStuff();
                  }, []);
                }
              `,
            },
          ],
        },
      ],
    },
  ],
};

// Tests that are only valid/invalid across parsers supporting Flow
const testsFlow = {
  valid: [
    // Ignore Generic Type Variables for arrow functions
    {
      code: normalizeIndent`
        function Example({ prop }) {
          const bar = useEffect(<T>(a: T): Hello => {
            prop();
          }, [prop]);
        }
      `,
    },
    // Flow type aliases in type assertions should not be flagged as missing dependencies
    {
      code: normalizeIndent`
        function MyComponent() {
          type ColumnKey = 'id' | 'name';
          type Item = {id: string, name: string};

          const columns = useMemo(
            () => [
              {
                type: 'text',
                key: 'id',
              } as TextColumn<ColumnKey, Item>,
            ],
            [],
          );
        }
      `,
    },
  ],
  invalid: [
    {
      code: normalizeIndent`
        hook useExample(a) {
          useEffect(() => {
            console.log(a);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'a'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [a]',
              output: normalizeIndent`
                hook useExample(a) {
                  useEffect(() => {
                    console.log(a);
                  }, [a]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
      function Foo() {
        const foo = ({}: any);
        useMemo(() => {
          console.log(foo);
        }, [foo]);
      }
    `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useMemo Hook (at line 6) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },
  ],
};

// Tests that are only valid/invalid across parsers supporting TypeScript
const testsTypescript = {
  valid: [
    {
      // `ref` is still constant, despite the cast.
      code: normalizeIndent`
        function MyComponent() {
          const ref = useRef() as React.MutableRefObject<HTMLDivElement>;
          useEffect(() => {
            console.log(ref.current);
          }, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const [state, setState] = React.useState<number>(0);

          useEffect(() => {
            const someNumber: typeof state = 2;
            setState(prevState => prevState + someNumber);
          }, [])
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const [state, setState] = React.useState<number>(0);

          useSpecialEffect(() => {
            const someNumber: typeof state = 2;
            setState(prevState => prevState + someNumber);
          })
        }
      `,
      options: [
        {
          additionalHooks: 'useSpecialEffect',
          experimental_autoDependenciesHooks: ['useSpecialEffect'],
        },
      ],
    },
    {
      code: normalizeIndent`
        function App() {
          const foo = {x: 1};
          React.useEffect(() => {
            const bar = {x: 2};
            const baz = bar as typeof foo;
            console.log(baz);
          }, []);
        }
      `,
    },
    {
      code: normalizeIndent`
        function App(props) {
          React.useEffect(() => {
            console.log(props.test);
          }, [props.test] as const);
        }
      `,
    },
    {
      code: normalizeIndent`
        function App(props) {
          React.useEffect(() => {
            console.log(props.test);
          }, [props.test] as any);
        }
      `,
    },
    {
      code: normalizeIndent`
        function App(props) {
          React.useEffect((() => {
            console.log(props.test);
          }) as any, [props.test]);
        }
      `,
    },
    {
      code: normalizeIndent`
        function useMyThing<T>(): void {
          useEffect(() => {
            let foo: T;
            console.log(foo);
          }, []);
        }
      `,
    },
  ],
  invalid: [
    {
      // `local` is still non-constant, despite the cast.
      code: normalizeIndent`
        function MyComponent() {
          const local = {} as string;
          useEffect(() => {
            console.log(local);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'local'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [local]',
              output: normalizeIndent`
                function MyComponent() {
                  const local = {} as string;
                  useEffect(() => {
                    console.log(local);
                  }, [local]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function App() {
          const foo = {x: 1};
          const bar = {x: 2};
          useEffect(() => {
            const baz = bar as typeof foo;
            console.log(baz);
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'bar'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [bar]',
              output: normalizeIndent`
                function App() {
                  const foo = {x: 1};
                  const bar = {x: 2};
                  useEffect(() => {
                    const baz = bar as typeof foo;
                    console.log(baz);
                  }, [bar]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const pizza = {};

          useEffect(() => ({
            crust: pizza.crust,
            toppings: pizza?.toppings,
          }), []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has missing dependencies: 'pizza.crust' and 'pizza?.toppings'. " +
            'Either include them or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [pizza.crust, pizza?.toppings]',
              output: normalizeIndent`
                function MyComponent() {
                  const pizza = {};

                  useEffect(() => ({
                    crust: pizza.crust,
                    toppings: pizza?.toppings,
                  }), [pizza.crust, pizza?.toppings]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const pizza = {};

          useEffect(() => ({
            crust: pizza?.crust,
            density: pizza.crust.density,
          }), []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'pizza.crust'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [pizza.crust]',
              output: normalizeIndent`
                function MyComponent() {
                  const pizza = {};

                  useEffect(() => ({
                    crust: pizza?.crust,
                    density: pizza.crust.density,
                  }), [pizza.crust]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const pizza = {};

          useEffect(() => ({
            crust: pizza.crust,
            density: pizza?.crust.density,
          }), []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'pizza.crust'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [pizza.crust]',
              output: normalizeIndent`
                function MyComponent() {
                  const pizza = {};

                  useEffect(() => ({
                    crust: pizza.crust,
                    density: pizza?.crust.density,
                  }), [pizza.crust]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const pizza = {};

          useEffect(() => ({
            crust: pizza?.crust,
            density: pizza?.crust.density,
          }), []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'pizza?.crust'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [pizza?.crust]',
              output: normalizeIndent`
                function MyComponent() {
                  const pizza = {};

                  useEffect(() => ({
                    crust: pizza?.crust,
                    density: pizza?.crust.density,
                  }), [pizza?.crust]);
                }
              `,
            },
          ],
        },
      ],
    },
    // Regression test.
    {
      code: normalizeIndent`
        function Example(props) {
          useEffect(() => {
            let topHeight = 0;
            topHeight = props.upperViewHeight;
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props.upperViewHeight'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props.upperViewHeight]',
              output: normalizeIndent`
                function Example(props) {
                  useEffect(() => {
                    let topHeight = 0;
                    topHeight = props.upperViewHeight;
                  }, [props.upperViewHeight]);
                }
              `,
            },
          ],
        },
      ],
    },
    // Regression test.
    {
      code: normalizeIndent`
        function Example(props) {
          useEffect(() => {
            let topHeight = 0;
            topHeight = props?.upperViewHeight;
          }, []);
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'props?.upperViewHeight'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [props?.upperViewHeight]',
              output: normalizeIndent`
                function Example(props) {
                  useEffect(() => {
                    let topHeight = 0;
                    topHeight = props?.upperViewHeight;
                  }, [props?.upperViewHeight]);
                }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const [state, setState] = React.useState<number>(0);

          useEffect(() => {
            const someNumber: typeof state = 2;
            setState(prevState => prevState + someNumber + state);
          }, [])
        }
      `,
      errors: [
        {
          message:
            "React Hook useEffect has a missing dependency: 'state'. " +
            'Either include it or remove the dependency array. ' +
            `You can also do a functional update 'setState(s => ...)' ` +
            `if you only need 'state' in the 'setState' call.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [state]',
              output: normalizeIndent`
              function MyComponent() {
                const [state, setState] = React.useState<number>(0);

                useEffect(() => {
                  const someNumber: typeof state = 2;
                  setState(prevState => prevState + someNumber + state);
                }, [state])
              }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const [state, setState] = React.useState<number>(0);

          useSpecialEffect(() => {
            const someNumber: typeof state = 2;
            setState(prevState => prevState + someNumber + state);
          }, [])
        }
      `,
      options: [
        {
          additionalHooks: 'useSpecialEffect',
          experimental_autoDependenciesHooks: ['useSpecialEffect'],
        },
      ],
      errors: [
        {
          message:
            "React Hook useSpecialEffect has a missing dependency: 'state'. " +
            'Either include it or remove the dependency array. ' +
            `You can also do a functional update 'setState(s => ...)' ` +
            `if you only need 'state' in the 'setState' call.`,
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [state]',
              output: normalizeIndent`
              function MyComponent() {
                const [state, setState] = React.useState<number>(0);

                useSpecialEffect(() => {
                  const someNumber: typeof state = 2;
                  setState(prevState => prevState + someNumber + state);
                }, [state])
              }
              `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent() {
          const [state, setState] = React.useState<number>(0);

          useMemo(() => {
            const someNumber: typeof state = 2;
            console.log(someNumber);
          }, [state])
        }
      `,
      errors: [
        {
          message:
            "React Hook useMemo has an unnecessary dependency: 'state'. " +
            'Either exclude it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: []',
              output: normalizeIndent`
                function MyComponent() {
                  const [state, setState] = React.useState<number>(0);

                  useMemo(() => {
                    const someNumber: typeof state = 2;
                    console.log(someNumber);
                  }, [])
                }
                `,
            },
          ],
        },
      ],
    },
    {
      code: normalizeIndent`
        function Foo() {
          const foo = {} as any;
          useMemo(() => {
            console.log(foo);
          }, [foo]);
        }
      `,
      errors: [
        {
          message:
            "The 'foo' object makes the dependencies of useMemo Hook (at line 6) change on every render. " +
            "Move it inside the useMemo callback. Alternatively, wrap the initialization of 'foo' in its own useMemo() Hook.",
          suggestions: undefined,
        },
      ],
    },
    {
      code: normalizeIndent`
        function useCustomCallback(callback, deps) {
          return useCallback(callback as any, deps)
        }
      `,
      errors: [
        {
          message:
            'React Hook useCallback received a function whose dependencies are unknown. Pass an inline function instead.',
        },
      ],
    },
    {
      code: normalizeIndent`
        function MyComponent(props) {
          useEffect(() => {
            console.log(props.foo);
          });
        }
      `,
      options: [{requireExplicitEffectDeps: true}],
      errors: [
        {
          message:
            'React Hook useEffect always requires dependencies. Please add a dependency array or an explicit `undefined`',
          suggestions: undefined,
        },
      ],
    },
  ],
};

// Tests that are only valid/invalid for `@typescript-eslint/parser@4.x`
const testsTypescriptEslintParserV4 = {
  valid: [],
  invalid: [
    // TODO: Should also be invalid as part of the JS test suite i.e. be invalid with babel eslint parsers.
    // It doesn't use any explicit types but any JS is still valid TS.
    {
      code: normalizeIndent`
        function Foo({ Component }) {
          React.useEffect(() => {
            console.log(<Component />);
          }, []);
        };
      `,
      errors: [
        {
          message:
            "React Hook React.useEffect has a missing dependency: 'Component'. " +
            'Either include it or remove the dependency array.',
          suggestions: [
            {
              desc: 'Update the dependencies array to be: [Component]',
              output: normalizeIndent`
              function Foo({ Component }) {
                React.useEffect(() => {
                  console.log(<Component />);
                }, [Component]);
              };
            `,
            },
          ],
        },
      ],
    },
  ],
};

// For easier local testing
if (!process.env.CI) {
  let only = [];
  let skipped = [];
  [
    ...tests.valid,
    ...tests.invalid,
    ...testsFlow.valid,
    ...testsFlow.invalid,
    ...testsTypescript.valid,
    ...testsTypescript.invalid,
    ...testsTypescriptEslintParserV4.valid,
    ...testsTypescriptEslintParserV4.invalid,
  ].forEach(t => {
    if (t.skip) {
      delete t.skip;
      skipped.push(t);
    }
    if (t.only) {
      delete t.only;
      only.push(t);
    }
  });
  const predicate = t => {
    if (only.length > 0) {
      return only.indexOf(t) !== -1;
    }
    if (skipped.length > 0) {
      return skipped.indexOf(t) === -1;
    }
    return true;
  };
  tests.valid = tests.valid.filter(predicate);
  tests.invalid = tests.invalid.filter(predicate);
  testsFlow.valid = testsFlow.valid.filter(predicate);
  testsFlow.invalid = testsFlow.invalid.filter(predicate);
  testsTypescript.valid = testsTypescript.valid.filter(predicate);
  testsTypescript.invalid = testsTypescript.invalid.filter(predicate);
  testsTypescriptEslintParserV4.valid =
    testsTypescriptEslintParserV4.valid.filter(predicate);
  testsTypescriptEslintParserV4.invalid =
    testsTypescriptEslintParserV4.invalid.filter(predicate);
}

describe('rules-of-hooks/exhaustive-deps', () => {
  const parserOptionsV7 = {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 6,
    sourceType: 'module',
  };

  const languageOptionsV9 = {
    ecmaVersion: 6,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  };

  const testsBabelEslint = tests;

  const testsHermesParser = {
    valid: [...testsFlow.valid, ...tests.valid],
    invalid: [...testsFlow.invalid, ...tests.invalid],
  };

  new ESLintTesterV7({
    parser: require.resolve('babel-eslint'),
    parserOptions: parserOptionsV7,
  }).run(
    'eslint: v7, parser: babel-eslint',
    ReactHooksESLintRule,
    testsBabelEslint
  );

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('@babel/eslint-parser'),
    },
  }).run(
    'eslint: v9, parser: @babel/eslint-parser',
    ReactHooksESLintRule,
    testsBabelEslint
  );

  new ESLintTesterV7({
    parser: require.resolve('hermes-eslint'),
    parserOptions: {
      sourceType: 'module',
      enableExperimentalComponentSyntax: true,
    },
  }).run(
    'eslint: v7, parser: hermes-eslint',
    ReactHooksESLintRule,
    testsHermesParser
  );

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('hermes-eslint'),
      parserOptions: {
        sourceType: 'module',
        enableExperimentalComponentSyntax: true,
      },
    },
  }).run(
    'eslint: v9, parser: hermes-eslint',
    ReactHooksESLintRule,
    testsHermesParser
  );

  const testsTypescriptEslintParser = {
    valid: [...testsTypescript.valid, ...tests.valid],
    invalid: [...testsTypescript.invalid, ...tests.invalid],
  };

  new ESLintTesterV7({
    parser: require.resolve('@typescript-eslint/parser-v2'),
    parserOptions: parserOptionsV7,
  }).run(
    'eslint: v7, parser: @typescript-eslint/parser@2.x',
    ReactHooksESLintRule,
    testsTypescriptEslintParser
  );

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('@typescript-eslint/parser-v2'),
    },
  }).run(
    'eslint: v9, parser: @typescript-eslint/parser@2.x',
    ReactHooksESLintRule,
    testsTypescriptEslintParser
  );

  new ESLintTesterV7({
    parser: require.resolve('@typescript-eslint/parser-v3'),
    parserOptions: parserOptionsV7,
  }).run(
    'eslint: v7, parser: @typescript-eslint/parser@3.x',
    ReactHooksESLintRule,
    testsTypescriptEslintParser
  );

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('@typescript-eslint/parser-v3'),
    },
  }).run(
    'eslint: v9, parser: @typescript-eslint/parser@3.x',
    ReactHooksESLintRule,
    testsTypescriptEslintParser
  );

  new ESLintTesterV7({
    parser: require.resolve('@typescript-eslint/parser-v4'),
    parserOptions: parserOptionsV7,
  }).run(
    'eslint: v7, parser: @typescript-eslint/parser@4.x',
    ReactHooksESLintRule,
    {
      valid: [
        ...testsTypescriptEslintParserV4.valid,
        ...testsTypescriptEslintParser.valid,
      ],
      invalid: [
        ...testsTypescriptEslintParserV4.invalid,
        ...testsTypescriptEslintParser.invalid,
      ],
    }
  );

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('@typescript-eslint/parser-v4'),
    },
  }).run(
    'eslint: v9, parser: @typescript-eslint/parser@4.x',
    ReactHooksESLintRule,
    {
      valid: [
        ...testsTypescriptEslintParserV4.valid,
        ...testsTypescriptEslintParser.valid,
      ],
      invalid: [
        ...testsTypescriptEslintParserV4.invalid,
        ...testsTypescriptEslintParser.invalid,
      ],
    }
  );

  new ESLintTesterV7({
    parser: require.resolve('@typescript-eslint/parser-v5'),
    parserOptions: parserOptionsV7,
  }).run(
    'eslint: v7, parser: @typescript-eslint/parser@^5.0.0-0',
    ReactHooksESLintRule,
    {
      valid: [
        ...testsTypescriptEslintParserV4.valid,
        ...testsTypescriptEslintParser.valid,
      ],
      invalid: [
        ...testsTypescriptEslintParserV4.invalid,
        ...testsTypescriptEslintParser.invalid,
      ],
    }
  );

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('@typescript-eslint/parser-v5'),
    },
  }).run(
    'eslint: v9, parser: @typescript-eslint/parser@^5.0.0',
    ReactHooksESLintRule,
    {
      valid: [
        ...testsTypescriptEslintParserV4.valid,
        ...testsTypescriptEslintParser.valid,
      ],
      invalid: [
        ...testsTypescriptEslintParserV4.invalid,
        ...testsTypescriptEslintParser.invalid,
      ],
    }
  );
});
