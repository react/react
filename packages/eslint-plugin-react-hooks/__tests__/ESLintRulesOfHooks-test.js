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
  ReactHooksESLintPlugin.default.rules['rules-of-hooks'];

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

const allTests = {
  valid: [
    {
      code: normalizeIndent`
        // Valid because components can use hooks.
        function ComponentWithHook() {
          useHook();
        }
      `,
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax
        component Button() {
          useHook();
          return <div>Button!</div>;
        }
      `,
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Hook syntax
        hook useSampleHook() {
          useHook();
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because components can use hooks.
        function createComponentWithHook() {
          return function ComponentWithHook() {
            useHook();
          };
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can use hooks.
        function useHookWithHook() {
          useHook();
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can use hooks.
        function createHook() {
          return function useHookWithHook() {
            useHook();
          }
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because components can call functions.
        function ComponentWithNormalFunction() {
          doSomething();
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because functions can call functions.
        function normalFunctionWithNormalFunction() {
          doSomething();
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because functions can call functions.
        function normalFunctionWithConditionalFunction() {
          if (cond) {
            doSomething();
          }
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because functions can call functions.
        function functionThatStartsWithUseButIsntAHook() {
          if (cond) {
            userFetch();
          }
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid although unconditional return doesn't make sense and would fail other rules.
        // We could make it invalid but it doesn't matter.
        function useUnreachable() {
          return;
          useHook();
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can call hooks.
        function useHook() { useState(); }
        const whatever = function useHook() { useState(); };
        const useHook1 = () => { useState(); };
        let useHook2 = () => useState();
        useHook2 = () => { useState(); };
        ({useHook: () => { useState(); }});
        ({useHook() { useState(); }});
        const {useHook3 = () => { useState(); }} = {};
        ({useHook = () => { useState(); }} = {});
        Namespace.useHook = () => { useState(); };
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can call hooks.
        function useHook() {
          useHook1();
          useHook2();
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can call hooks.
        function createHook() {
          return function useHook() {
            useHook1();
            useHook2();
          };
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can call hooks.
        function useHook() {
          useState() && a;
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can call hooks.
        function useHook() {
          return useHook1() + useHook2();
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can call hooks.
        function useHook() {
          return useHook1(useHook2());
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can be used in anonymous arrow-function arguments
        // to forwardRef.
        const FancyButton = React.forwardRef((props, ref) => {
          useHook();
          return <button {...props} ref={ref} />
        });
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can be used in anonymous function arguments to
        // forwardRef.
        const FancyButton = React.forwardRef(function (props, ref) {
          useHook();
          return <button {...props} ref={ref} />
        });
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can be used in anonymous function arguments to
        // forwardRef.
        const FancyButton = forwardRef(function (props, ref) {
          useHook();
          return <button {...props} ref={ref} />
        });
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can be used in anonymous function arguments to
        // React.memo.
        const MemoizedFunction = React.memo(props => {
          useHook();
          return <button {...props} />
        });
      `,
    },
    {
      code: normalizeIndent`
        // Valid because hooks can be used in anonymous function arguments to
        // memo.
        const MemoizedFunction = memo(function (props) {
          useHook();
          return <button {...props} />
        });
      `,
    },
    {
      code: normalizeIndent`
        // Valid because classes can call functions.
        // We don't consider these to be hooks.
        class C {
          m() {
            this.useHook();
            super.useHook();
          }
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid -- this is a regression test.
        jest.useFakeTimers();
        beforeEach(() => {
          jest.useRealTimers();
        })
      `,
    },
    {
      code: normalizeIndent`
        // Valid because they're not matching use[A-Z].
        fooState();
        _use();
        _useState();
        use_hook();
        // also valid because it's not matching the PascalCase namespace
        jest.useFakeTimer()
      `,
    },
    {
      code: normalizeIndent`
        // Regression test for some internal code.
        // This shows how the "callback rule" is more relaxed,
        // and doesn't kick in unless we're confident we're in
        // a component or a hook.
        function makeListener(instance) {
          each(pixelsWithInferredEvents, pixel => {
            if (useExtendedSelector(pixel.id) && extendedButton) {
              foo();
            }
          });
        }
      `,
    },
    {
      code: normalizeIndent`
        // This is valid because "use"-prefixed functions called in
        // unnamed function arguments are not assumed to be hooks.
        React.unknownFunction((foo, bar) => {
          if (foo) {
            useNotAHook(bar)
          }
        });
      `,
    },
    {
      code: normalizeIndent`
        // This is valid because "use"-prefixed functions called in
        // unnamed function arguments are not assumed to be hooks.
        unknownFunction(function(foo, bar) {
          if (foo) {
            useNotAHook(bar)
          }
        });
      `,
    },
    {
      code: normalizeIndent`
        // Regression test for incorrectly flagged valid code.
        function RegressionTest() {
          const foo = cond ? a : b;
          useState();
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because exceptions abort rendering
        function RegressionTest() {
          if (page == null) {
            throw new Error('oh no!');
          }
          useState();
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because the loop doesn't change the order of hooks calls.
        function RegressionTest() {
          const res = [];
          const additionalCond = true;
          for (let i = 0; i !== 10 && additionalCond; ++i ) {
            res.push(i);
          }
          React.useLayoutEffect(() => {});
        }
      `,
    },
    {
      code: normalizeIndent`
        // Is valid but hard to compute by brute-forcing
        function MyComponent() {
          // 40 conditions
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}
          if (c) {} else {}

          // 10 hooks
          useHook();
          useHook();
          useHook();
          useHook();
          useHook();
          useHook();
          useHook();
          useHook();
          useHook();
          useHook();
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because the neither the conditions before or after the hook affect the hook call
        // Failed prior to implementing BigInt because pathsFromStartToEnd and allPathsFromStartToEnd were too big and had rounding errors
        const useSomeHook = () => {};

        const SomeName = () => {
          const filler = FILLER ?? FILLER ?? FILLER;
          const filler2 = FILLER ?? FILLER ?? FILLER;
          const filler3 = FILLER ?? FILLER ?? FILLER;
          const filler4 = FILLER ?? FILLER ?? FILLER;
          const filler5 = FILLER ?? FILLER ?? FILLER;
          const filler6 = FILLER ?? FILLER ?? FILLER;
          const filler7 = FILLER ?? FILLER ?? FILLER;
          const filler8 = FILLER ?? FILLER ?? FILLER;

          useSomeHook();

          if (anyConditionCanEvenBeFalse) {
            return null;
          }

          return (
            <React.Fragment>
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
              {FILLER ? FILLER : FILLER}
            </React.Fragment>
          );
        };
      `,
    },
    {
      code: normalizeIndent`
        // Valid because the neither the condition nor the loop affect the hook call.
        function App(props) {
          const someObject = {propA: true};
          for (const propName in someObject) {
            if (propName === true) {
            } else {
            }
          }
          const [myState, setMyState] = useState(null);
        }
      `,
    },
    {
      code: normalizeIndent`
        function App() {
          const text = use(Promise.resolve('A'));
          return <Text text={text} />
        }
      `,
    },
    {
      code: normalizeIndent`
        import * as React from 'react';
        function App() {
          if (shouldShowText) {
            const text = use(query);
            const data = React.use(thing);
            const data2 = react.use(thing2);
            return <Text text={text} />
          }
          return <Text text={shouldFetchBackupText ? use(backupQuery) : "Nothing to see here"} />
        }
      `,
    },
    {
      code: normalizeIndent`
        function App() {
          let data = [];
          for (const query of queries) {
            const text = use(item);
            data.push(text);
          }
          return <Child data={data} />
        }
      `,
    },
    {
      code: normalizeIndent`
        function App() {
          const data = someCallback((x) => use(x));
          return <Child data={data} />
        }
      `,
    },
    {
      code: normalizeIndent`
        export const notAComponent = () => {
           return () => {
            useState();
          }
        }
      `,
      // TODO: this should error but doesn't.
      // errors: [functionError('use', 'notAComponent')],
    },
    {
      code: normalizeIndent`
        export default () => {
          if (isVal) {
            useState(0);
          }
        }
      `,
      // TODO: this should error but doesn't.
      // errors: [genericError('useState')],
    },
    {
      code: normalizeIndent`
        function notAComponent() {
          return new Promise.then(() => {
            useState();
          });
        }
      `,
      // TODO: this should error but doesn't.
      // errors: [genericError('useState')],
    },
    {
      code: normalizeIndent`
        // Valid because the hook is outside of the loop
        const Component = () => {
          const [state, setState] = useState(0);
          for (let i = 0; i < 10; i++) {
            console.log(i);
          }
          return <div></div>;
        };
      `,
    },
    {
      code: normalizeIndent`
        // Valid: useEffectEvent can be called in custom effect hooks configured via ESLint settings
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useMyEffect(() => {
            onClick();
          });
          useServerEffect(() => {
            onClick();
          });
        }
      `,
      settings: {
        'react-hooks': {
          additionalEffectHooks: '(useMyEffect|useServerEffect)',
        },
      },
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // Valid: useEffectEvent can be called in custom effect hooks configured via ESLint settings
        component MyComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useMyEffect(() => {
            onClick();
          });
          useServerEffect(() => {
            onClick();  
          });
        }
      `,
      settings: {
        'react-hooks': {
          additionalEffectHooks: '(useMyEffect|useServerEffect)',
        },
      },
    },
    {
      code: normalizeIndent`
        // Valid because functions created with useEffectEvent can be called in a useEffect.
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useEffect(() => {
            onClick();
          });
          React.useEffect(() => {
            onClick();
          });
        }
      `,
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // Valid because functions created with useEffectEvent can be called in a useEffect.
        component MyComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useEffect(() => {
            onClick();
          });
          React.useEffect(() => {
            onClick();
          });
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because functions created with useEffectEvent can be passed by reference in useEffect
        // and useEffectEvent.
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          const onClick2 = useEffectEvent(() => {
            debounce(onClick);
            debounce(() => onClick());
            debounce(() => { onClick() });
            deboucne(() => debounce(onClick));
          });
          useEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          React.useEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          return null;
        }
      `,
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // Valid because functions created with useEffectEvent can be passed by reference in useEffect
        // and useEffectEvent.
        component MyComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          const onClick2 = useEffectEvent(() => {
            debounce(onClick);
            debounce(() => onClick());
            debounce(() => { onClick() });
            deboucne(() => debounce(onClick));
          });
          useEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          React.useEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          return null;
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent({ theme }) {
          useEffect(() => {
            onClick();
          });
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
        }
      `,
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        component MyComponent(theme: any) {
          useEffect(() => {
            onClick();
          });
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
        }
      `,
    },
    {
      code: normalizeIndent`
        function MyComponent({ theme }) {
          // Can receive arguments
          const onEvent = useEffectEvent((text) => {
            console.log(text);
          });

          useEffect(() => {
            onEvent('Hello world');
          });
          React.useEffect(() => {
            onEvent('Hello world');
          });
        }
      `,
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        component MyComponent(theme: any) {
          // Can receive arguments
          const onEvent = useEffectEvent((text) => {
            console.log(text);
          });

          useEffect(() => {
            onEvent('Hello world');
          });
          React.useEffect(() => {
            onEvent('Hello world');
          });
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because functions created with useEffectEvent can be called in useLayoutEffect.
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useLayoutEffect(() => {
            onClick();
          });
          React.useLayoutEffect(() => {
            onClick();
          });
        }
      `,
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // Valid because functions created with useEffectEvent can be called in useLayoutEffect.
        component MyComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useLayoutEffect(() => {
            onClick();
          });
          React.useLayoutEffect(() => {
            onClick();
          });
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because functions created with useEffectEvent can be called in useInsertionEffect.
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useInsertionEffect(() => {
            onClick();
          });
          React.useInsertionEffect(() => {
            onClick();
          });
        }
      `,
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // Valid because functions created with useEffectEvent can be called in useInsertionEffect.
        component MyComponent(theme) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useInsertionEffect(() => {
            onClick();
          });
          React.useInsertionEffect(() => {
            onClick();
          });
        }
      `,
    },
    {
      code: normalizeIndent`
        // Valid because functions created with useEffectEvent can be passed by reference in useLayoutEffect 
        // and useInsertionEffect.
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          const onClick2 = useEffectEvent(() => {
            debounce(onClick);
            debounce(() => onClick());
            debounce(() => { onClick() });
            deboucne(() => debounce(onClick));
          });
          useLayoutEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          React.useLayoutEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          useInsertionEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          React.useInsertionEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          return null;
        }
      `,
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // Valid because functions created with useEffectEvent can be passed by reference in useLayoutEffect.
        // and useInsertionEffect.
        component MyComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          const onClick2 = useEffectEvent(() => {
            debounce(onClick);
            debounce(() => onClick());
            debounce(() => { onClick() });
            deboucne(() => debounce(onClick));
          });
          useLayoutEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          React.useLayoutEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          useInsertionEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          React.useInsertionEffect(() => {
            let id = setInterval(() => onClick(), 100);
            return () => clearInterval(onClick);
          }, []);
          return null;
        }
      `,
    },
  ],
  invalid: [
    {
      syntax: 'flow',
      code: normalizeIndent`
        component Button(cond: boolean) {
          if (cond) {
            useConditionalHook();
          }
        }
      `,
      errors: [conditionalError('useConditionalHook')],
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        hook useTest(cond: boolean) {
          if (cond) {
            useConditionalHook();
          }
        }
      `,
      errors: [conditionalError('useConditionalHook')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function ComponentWithConditionalHook() {
          if (cond) {
            useConditionalHook();
          }
        }
      `,
      errors: [conditionalError('useConditionalHook')],
    },
    {
      code: normalizeIndent`
        Hook.useState();
        Hook._useState();
        Hook.use42();
        Hook.useHook();
        Hook.use_hook();
      `,
      errors: [
        topLevelError('Hook.useState'),
        topLevelError('Hook.use42'),
        topLevelError('Hook.useHook'),
      ],
    },
    {
      code: normalizeIndent`
        class C {
          m() {
            This.useHook();
            Super.useHook();
          }
        }
      `,
      errors: [classError('This.useHook'), classError('Super.useHook')],
    },
    {
      code: normalizeIndent`
        // This is a false positive (it's valid) that unfortunately
        // we cannot avoid. Prefer to rename it to not start with "use"
        class Foo extends Component {
          render() {
            if (cond) {
              FooStore.useFeatureFlag();
            }
          }
        }
      `,
      errors: [classError('FooStore.useFeatureFlag')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function ComponentWithConditionalHook() {
          if (cond) {
            Namespace.useConditionalHook();
          }
        }
      `,
      errors: [conditionalError('Namespace.useConditionalHook')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function createComponent() {
          return function ComponentWithConditionalHook() {
            if (cond) {
              useConditionalHook();
            }
          }
        }
      `,
      errors: [conditionalError('useConditionalHook')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHookWithConditionalHook() {
          if (cond) {
            useConditionalHook();
          }
        }
      `,
      errors: [conditionalError('useConditionalHook')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function createHook() {
          return function useHookWithConditionalHook() {
            if (cond) {
              useConditionalHook();
            }
          }
        }
      `,
      errors: [conditionalError('useConditionalHook')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function ComponentWithTernaryHook() {
          cond ? useTernaryHook() : null;
        }
      `,
      errors: [conditionalError('useTernaryHook')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's a common misunderstanding.
        // We *could* make it valid but the runtime error could be confusing.
        function ComponentWithHookInsideCallback() {
          useEffect(() => {
            useHookInsideCallback();
          });
        }
      `,
      errors: [genericError('useHookInsideCallback')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's a common misunderstanding.
        // We *could* make it valid but the runtime error could be confusing.
        function createComponent() {
          return function ComponentWithHookInsideCallback() {
            useEffect(() => {
              useHookInsideCallback();
            });
          }
        }
      `,
      errors: [genericError('useHookInsideCallback')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's a common misunderstanding.
        // We *could* make it valid but the runtime error could be confusing.
        const ComponentWithHookInsideCallback = React.forwardRef((props, ref) => {
          useEffect(() => {
            useHookInsideCallback();
          });
          return <button {...props} ref={ref} />
        });
      `,
      errors: [genericError('useHookInsideCallback')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's a common misunderstanding.
        // We *could* make it valid but the runtime error could be confusing.
        const ComponentWithHookInsideCallback = React.memo(props => {
          useEffect(() => {
            useHookInsideCallback();
          });
          return <button {...props} />
        });
      `,
      errors: [genericError('useHookInsideCallback')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's a common misunderstanding.
        // We *could* make it valid but the runtime error could be confusing.
        function ComponentWithHookInsideCallback() {
          function handleClick() {
            useState();
          }
        }
      `,
      errors: [functionError('useState', 'handleClick')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's a common misunderstanding.
        // We *could* make it valid but the runtime error could be confusing.
        function createComponent() {
          return function ComponentWithHookInsideCallback() {
            function handleClick() {
              useState();
            }
          }
        }
      `,
      errors: [functionError('useState', 'handleClick')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function ComponentWithHookInsideLoop() {
          while (cond) {
            useHookInsideLoop();
          }
        }
      `,
      errors: [loopError('useHookInsideLoop')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function ComponentWithHookInsideLoop() {
          do {
            useHookInsideLoop();
          } while (cond);
        }
      `,
      errors: [loopError('useHookInsideLoop')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function ComponentWithHookInsideLoop() {
          do {
            foo();
          } while (useHookInsideLoop());
        }
      `,
      errors: [loopError('useHookInsideLoop')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function renderItem() {
          useState();
        }

        function List(props) {
          return props.items.map(renderItem);
        }
      `,
      errors: [functionError('useState', 'renderItem')],
    },
    {
      code: normalizeIndent`
        // Currently invalid because it violates the convention and removes the "taint"
        // from a hook. We *could* make it valid to avoid some false positives but let's
        // ensure that we don't break the "renderItem" and "normalFunctionWithConditionalHook"
        // cases which must remain invalid.
        function normalFunctionWithHook() {
          useHookInsideNormalFunction();
        }
      `,
      errors: [
        functionError('useHookInsideNormalFunction', 'normalFunctionWithHook'),
      ],
    },
    {
      code: normalizeIndent`
        // These are neither functions nor hooks.
        function _normalFunctionWithHook() {
          useHookInsideNormalFunction();
        }
        function _useNotAHook() {
          useHookInsideNormalFunction();
        }
      `,
      errors: [
        functionError('useHookInsideNormalFunction', '_normalFunctionWithHook'),
        functionError('useHookInsideNormalFunction', '_useNotAHook'),
      ],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function normalFunctionWithConditionalHook() {
          if (cond) {
            useHookInsideNormalFunction();
          }
        }
      `,
      errors: [
        functionError(
          'useHookInsideNormalFunction',
          'normalFunctionWithConditionalHook'
        ),
      ],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHookInLoops() {
          while (a) {
            useHook1();
            if (b) return;
            useHook2();
          }
          while (c) {
            useHook3();
            if (d) return;
            useHook4();
          }
        }
      `,
      errors: [
        loopError('useHook1'),
        loopError('useHook2'),
        loopError('useHook3'),
        loopError('useHook4'),
      ],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHookInLoops() {
          while (a) {
            useHook1();
            if (b) continue;
            useHook2();
          }
        }
      `,
      errors: [loopError('useHook1'), loopError('useHook2', true)],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHookInLoops() {
          do {
            useHook1();
            if (a) return;
            useHook2();
          } while (b);

          do {
            useHook3();
            if (c) return;
            useHook4();
          } while (d)
        }
      `,
      errors: [
        loopError('useHook1'),
        loopError('useHook2'),
        loopError('useHook3'),
        loopError('useHook4'),
      ],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHookInLoops() {
          do {
            useHook1();
            if (a) continue;
            useHook2();
          } while (b);
        }
      `,
      errors: [loopError('useHook1'), loopError('useHook2', true)],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useLabeledBlock() {
          label: {
            if (a) break label;
            useHook();
          }
        }
      `,
      errors: [conditionalError('useHook')],
    },
    {
      code: normalizeIndent`
        // Currently invalid.
        // These are variations capturing the current heuristic--
        // we only allow hooks in PascalCase or useFoo functions.
        // We *could* make some of these valid. But before doing it,
        // consider specific cases documented above that contain reasoning.
        function a() { useState(); }
        const whatever = function b() { useState(); };
        const c = () => { useState(); };
        let d = () => useState();
        e = () => { useState(); };
        ({f: () => { useState(); }});
        ({g() { useState(); }});
        const {j = () => { useState(); }} = {};
        ({k = () => { useState(); }} = {});
      `,
      errors: [
        functionError('useState', 'a'),
        functionError('useState', 'b'),
        functionError('useState', 'c'),
        functionError('useState', 'd'),
        functionError('useState', 'e'),
        functionError('useState', 'f'),
        functionError('useState', 'g'),
        functionError('useState', 'j'),
        functionError('useState', 'k'),
      ],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHook() {
          if (a) return;
          useState();
        }
      `,
      errors: [conditionalError('useState', true)],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHook() {
          if (a) return;
          if (b) {
            console.log('true');
          } else {
            console.log('false');
          }
          useState();
        }
      `,
      errors: [conditionalError('useState', true)],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHook() {
          if (b) {
            console.log('true');
          } else {
            console.log('false');
          }
          if (a) return;
          useState();
        }
      `,
      errors: [conditionalError('useState', true)],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHook() {
          a && useHook1();
          b && useHook2();
        }
      `,
      errors: [conditionalError('useHook1'), conditionalError('useHook2')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHook() {
          try {
            f();
            useState();
          } catch {}
        }
      `,
      errors: [
        // NOTE: This is an error since `f()` could possibly throw.
        conditionalError('useState'),
      ],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function useHook({ bar }) {
          let foo1 = bar && useState();
          let foo2 = bar || useState();
          let foo3 = bar ?? useState();
        }
      `,
      errors: [
        conditionalError('useState'),
        conditionalError('useState'),
        conditionalError('useState'),
      ],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        const FancyButton = React.forwardRef((props, ref) => {
          if (props.fancy) {
            useCustomHook();
          }
          return <button ref={ref}>{props.children}</button>;
        });
      `,
      errors: [conditionalError('useCustomHook')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        const FancyButton = forwardRef(function(props, ref) {
          if (props.fancy) {
            useCustomHook();
          }
          return <button ref={ref}>{props.children}</button>;
        });
      `,
      errors: [conditionalError('useCustomHook')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        const MemoizedButton = memo(function(props) {
          if (props.fancy) {
            useCustomHook();
          }
          return <button>{props.children}</button>;
        });
      `,
      errors: [conditionalError('useCustomHook')],
    },
    {
      code: normalizeIndent`
        // This is invalid because "use"-prefixed functions used in named
        // functions are assumed to be hooks.
        React.unknownFunction(function notAComponent(foo, bar) {
          useProbablyAHook(bar)
        });
      `,
      errors: [functionError('useProbablyAHook', 'notAComponent')],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous.
        // Normally, this would crash, but not if you use inline requires.
        // This *must* be invalid.
        // It's expected to have some false positives, but arguably
        // they are confusing anyway due to the use*() convention
        // already being associated with Hooks.
        useState();
        if (foo) {
          const foo = React.useCallback(() => {});
        }
        useCustomHook();
      `,
      errors: [
        topLevelError('useState'),
        topLevelError('React.useCallback'),
        topLevelError('useCustomHook'),
      ],
    },
    {
      code: normalizeIndent`
        // Technically this is a false positive.
        // We *could* make it valid (and it used to be).
        //
        // However, top-level Hook-like calls can be very dangerous
        // in environments with inline requires because they can mask
        // the runtime error by accident.
        // So we prefer to disallow it despite the false positive.

        const {createHistory, useBasename} = require('history-2.1.2');
        const browserHistory = useBasename(createHistory)({
          basename: '/',
        });
      `,
      errors: [topLevelError('useBasename')],
    },
    {
      code: normalizeIndent`
        class ClassComponentWithFeatureFlag extends React.Component {
          render() {
            if (foo) {
              useFeatureFlag();
            }
          }
        }
      `,
      errors: [classError('useFeatureFlag')],
    },
    {
      code: normalizeIndent`
        class ClassComponentWithHook extends React.Component {
          render() {
            React.useState();
          }
        }
      `,
      errors: [classError('React.useState')],
    },
    {
      code: normalizeIndent`
        (class {useHook = () => { useState(); }});
      `,
      errors: [classError('useState')],
    },
    {
      code: normalizeIndent`
        (class {useHook() { useState(); }});
      `,
      errors: [classError('useState')],
    },
    {
      code: normalizeIndent`
        (class {h = () => { useState(); }});
      `,
      errors: [classError('useState')],
    },
    {
      code: normalizeIndent`
        (class {i() { useState(); }});
      `,
      errors: [classError('useState')],
    },
    {
      code: normalizeIndent`
        async function AsyncComponent() {
          useState();
        }
      `,
      errors: [asyncComponentHookError('useState')],
    },
    {
      code: normalizeIndent`
        async function useAsyncHook() {
          useState();
        }
      `,
      errors: [asyncComponentHookError('useState')],
    },
    {
      code: normalizeIndent`
        async function Page() {
          useId();
          React.useId();
        }
      `,
      errors: [
        asyncComponentHookError('useId'),
        asyncComponentHookError('React.useId'),
      ],
    },
    {
      code: normalizeIndent`
        async function useAsyncHook() {
          useId();
        }
      `,
      errors: [asyncComponentHookError('useId')],
    },
    {
      code: normalizeIndent`
        async function notAHook() {
          useId();
        }
      `,
      errors: [functionError('useId', 'notAHook')],
    },
    {
      code: normalizeIndent`
        Hook.use();
        Hook._use();
        Hook.useState();
        Hook._useState();
        Hook.use42();
        Hook.useHook();
        Hook.use_hook();
      `,
      errors: [
        topLevelError('Hook.use'),
        topLevelError('Hook.useState'),
        topLevelError('Hook.use42'),
        topLevelError('Hook.useHook'),
      ],
    },
    {
      code: normalizeIndent`
        function notAComponent() {
          use(promise);
        }
      `,
      errors: [functionError('use', 'notAComponent')],
    },
    {
      code: normalizeIndent`
        const text = use(promise);
        function App() {
          return <Text text={text} />
        }
      `,
      errors: [topLevelError('use')],
    },
    {
      code: normalizeIndent`
        class C {
          m() {
            use(promise);
          }
        }
      `,
      errors: [classError('use')],
    },
    {
      code: normalizeIndent`
        async function AsyncComponent() {
          use();
        }
      `,
      errors: [asyncComponentHookError('use')],
    },
    {
      code: normalizeIndent`
        function App({p1, p2}) {
          try {
            use(p1);
          } catch (error) {
            console.error(error);
          }
          use(p2);
          return <div>App</div>;
        }
      `,
      errors: [tryCatchUseError('use')],
    },
    {
      code: normalizeIndent`
        function App({p1, p2}) {
          try {
            doSomething();
          } catch {
            use(p1);
          }
          use(p2);
          return <div>App</div>;
        }
      `,
      errors: [tryCatchUseError('use')],
    },
    {
      code: normalizeIndent`
        // Invalid: useEffectEvent should not be callable in regular custom hooks without additional configuration
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useCustomHook(() => {
            onClick();
          });
        }
      `,
      errors: [useEffectEventError('onClick', true)],
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
      // Component syntax version
      // Invalid: useEffectEvent should not be callable in regular custom hooks without additional configuration
      component MyComponent() {
        const onClick = useEffectEvent(() => {
          showNotification(theme);
        });
        useCustomHook(() => {
          onClick();
        });
      }
      `,
      errors: [useEffectEventError('onClick', true)],
    },
    {
      code: normalizeIndent`
        // Invalid: useEffectEvent should not be callable in hooks not matching the settings regex
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useWrongHook(() => {
            onClick();
          });
        }
      `,
      settings: {
        'react-hooks': {
          additionalEffectHooks: 'useMyEffect',
        },
      },
      errors: [useEffectEventError('onClick', true)],
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // Invalid: useEffectEvent should not be callable in hooks not matching the settings regex
        component MyComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          useWrongHook(() => {
            onClick();
          });
        }
      `,
      settings: {
        'react-hooks': {
          additionalEffectHooks: 'useMyEffect',
        },
      },
      errors: [useEffectEventError('onClick', true)],
    },
    {
      code: normalizeIndent`
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          return <Child onClick={onClick}></Child>;
        }
      `,
      errors: [useEffectEventError('onClick', false)],
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        component MyComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          return <Child onClick={onClick}></Child>;
        }
      `,
      errors: [useEffectEventError('onClick', false)],
    },
    {
      code: normalizeIndent`
        // Invalid because useEffectEvent is being passed down
        function MyComponent({ theme }) {
          return <Child onClick={useEffectEvent(() => {
            showNotification(theme);
          })} />;
        }
      `,
      errors: [{...useEffectEventError(null, false), line: 4}],
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // Invalid because useEffectEvent is being passed down
        component MyComponent(theme: any) {
          return <Child onClick={useEffectEvent(() => {
            showNotification(theme);
          })} />;
        }
      `,
      errors: [{...useEffectEventError(null, false), line: 5}],
    },
    {
      code: normalizeIndent`
        // This should error even though it shares an identifier name with the below
        function MyComponent({theme}) {
          const onClick = useEffectEvent(() => {
            showNotification(theme)
          });
          return <Child onClick={onClick} />
        }

        // The useEffectEvent function shares an identifier name with the above
        function MyOtherComponent({theme}) {
          const onClick = useEffectEvent(() => {
            showNotification(theme)
          });
          return <Child onClick={() => onClick()} />
        }

        // The useEffectEvent function shares an identifier name with the above
        function MyLastComponent({theme}) {
          const onClick = useEffectEvent(() => {
            showNotification(theme)
          });
          useEffect(() => {
            onClick(); // No error here, errors on all other uses
            onClick;
          })
          return <Child />
        }
      `,
      errors: [
        {...useEffectEventError('onClick', false), line: 7},
        {...useEffectEventError('onClick', true), line: 15},
      ],
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // This should error even though it shares an identifier name with the below
        component MyComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme)
          });
          return <Child onClick={onClick} />
        }

        // The useEffectEvent function shares an identifier name with the above
        component MyOtherComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme)
          });
          return <Child onClick={() => onClick()} />
        }

        // The useEffectEvent function shares an identifier name with the above
        component MyLastComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme)
          });
          useEffect(() => {
            onClick(); // No error here, errors on all other uses
            onClick;
          })
          return <Child />
        }
      `,
      errors: [
        {...useEffectEventError('onClick', false), line: 8},
        {...useEffectEventError('onClick', true), line: 16},
      ],
    },
    {
      code: normalizeIndent`
        const MyComponent = ({ theme }) => {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          return <Child onClick={onClick}></Child>;
        }
      `,
      errors: [useEffectEventError('onClick', false)],
    },
    {
      code: normalizeIndent`
        // Invalid because onClick is being aliased to foo but not invoked
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          let foo = onClick;
          return <Bar onClick={foo} />
        }
      `,
      errors: [{...useEffectEventError('onClick', false), line: 7}],
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // Invalid because onClick is being aliased to foo but not invoked
        component MyComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          let foo = onClick;
          return <Bar onClick={foo} />
        }
      `,
      errors: [{...useEffectEventError('onClick', false), line: 8}],
    },
    {
      code: normalizeIndent`
        // Should error because it's being passed down to JSX, although it's been referenced once
        // in an effect
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(them);
          });
          useEffect(() => {
            setTimeout(onClick, 100);
          });
          return <Child onClick={onClick} />
        }
      `,
      errors: [useEffectEventError('onClick', false)],
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Component syntax version
        // Should error because it's being passed down to JSX, although it's been referenced once
        // in an effect
        component MyComponent(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(them);
          });
          useEffect(() => {
            setTimeout(onClick, 100);
          });
          return <Child onClick={onClick} />
        }
      `,
      errors: [useEffectEventError('onClick', false)],
    },
    {
      code: normalizeIndent`
        // Invalid because functions created with useEffectEvent cannot be called in arbitrary closures.
        function MyComponent({ theme }) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          // error message 1
          const onClick2 = () => { onClick() };
          // error message 2
          const onClick3 = useCallback(() => onClick(), []);
          // error message 3
          const onClick4 = onClick;
          return <>
            {/** error message 4 */}
            <Child onClick={onClick}></Child>
            <Child onClick={onClick2}></Child>
            <Child onClick={onClick3}></Child>
          </>;
        }
      `,
      // Explicitly test error messages here for various cases
      errors: [
        `\`onClick\` is a function created with React Hook "useEffectEvent", and can only be called from ` +
          'Effects and Effect Events in the same component.',
        `\`onClick\` is a function created with React Hook "useEffectEvent", and can only be called from ` +
          'Effects and Effect Events in the same component.',
        `\`onClick\` is a function created with React Hook "useEffectEvent", and can only be called from ` +
          `Effects and Effect Events in the same component. ` +
          `It cannot be assigned to a variable or passed down.`,
        `\`onClick\` is a function created with React Hook "useEffectEvent", and can only be called from ` +
          `Effects and Effect Events in the same component. ` +
          `It cannot be assigned to a variable or passed down.`,
      ],
    },
    {
      syntax: 'flow',
      code: normalizeIndent`
        // Hook syntax version
        // Invalid because functions created with useEffectEvent cannot be called in arbitrary closures.
        hook useMyHook(theme: any) {
          const onClick = useEffectEvent(() => {
            showNotification(theme);
          });
          // error message 1
          const onClick2 = () => { onClick() };
          // error message 2
          const onClick3 = useCallback(() => onClick(), []);
          // error message 3
          const onClick4 = onClick;
          return <>
            {/** error message 4 */}
            <Child onClick={onClick}></Child>
            <Child onClick={onClick2}></Child>
            <Child onClick={onClick3}></Child>
          </>;
        }
      `,
      // Explicitly test error messages here for various cases
      errors: [
        `\`onClick\` is a function created with React Hook "useEffectEvent", and can only be called from ` +
          'Effects and Effect Events in the same component.',
        `\`onClick\` is a function created with React Hook "useEffectEvent", and can only be called from ` +
          'Effects and Effect Events in the same component.',
        `\`onClick\` is a function created with React Hook "useEffectEvent", and can only be called from ` +
          `Effects and Effect Events in the same component. ` +
          `It cannot be assigned to a variable or passed down.`,
        `\`onClick\` is a function created with React Hook "useEffectEvent", and can only be called from ` +
          `Effects and Effect Events in the same component. ` +
          `It cannot be assigned to a variable or passed down.`,
      ],
    },
  ],
};

function conditionalError(hook, hasPreviousFinalizer = false) {
  return {
    message:
      `React Hook "${hook}" is called conditionally. React Hooks must be ` +
      'called in the exact same order in every component render.' +
      (hasPreviousFinalizer
        ? ' Did you accidentally call a React Hook after an early return?'
        : ''),
  };
}

function loopError(hook) {
  return {
    message:
      `React Hook "${hook}" may be executed more than once. Possibly ` +
      'because it is called in a loop. React Hooks must be called in the ' +
      'exact same order in every component render.',
  };
}

function functionError(hook, fn) {
  return {
    message:
      `React Hook "${hook}" is called in function "${fn}" that is neither ` +
      'a React function component nor a custom React Hook function.' +
      ' React component names must start with an uppercase letter.' +
      ' React Hook names must start with the word "use".',
  };
}

function genericError(hook) {
  return {
    message:
      `React Hook "${hook}" cannot be called inside a callback. React Hooks ` +
      'must be called in a React function component or a custom React ' +
      'Hook function.',
  };
}

function topLevelError(hook) {
  return {
    message:
      `React Hook "${hook}" cannot be called at the top level. React Hooks ` +
      'must be called in a React function component or a custom React ' +
      'Hook function.',
  };
}

function classError(hook) {
  return {
    message:
      `React Hook "${hook}" cannot be called in a class component. React Hooks ` +
      'must be called in a React function component or a custom React ' +
      'Hook function.',
  };
}

function useEffectEventError(fn, called) {
  if (fn === null) {
    return {
      message:
        `React Hook "useEffectEvent" can only be called at the top level of your component.` +
        ` It cannot be passed down.`,
    };
  }

  return {
    message:
      `\`${fn}\` is a function created with React Hook "useEffectEvent", and can only be called from ` +
      'Effects and Effect Events in the same component.' +
      (called ? '' : ' It cannot be assigned to a variable or passed down.'),
  };
}

function asyncComponentHookError(fn) {
  return {
    message: `React Hook "${fn}" cannot be called in an async function.`,
  };
}

function tryCatchUseError(fn) {
  return {
    message: `React Hook "${fn}" cannot be called in a try/catch block.`,
  };
}

// For easier local testing
if (!process.env.CI) {
  let only = [];
  let skipped = [];
  [...allTests.valid, ...allTests.invalid].forEach(t => {
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
  allTests.valid = allTests.valid.filter(predicate);
  allTests.invalid = allTests.invalid.filter(predicate);
}

function filteredTests(predicate) {
  return {
    valid: allTests.valid.filter(predicate),
    invalid: allTests.invalid.filter(predicate),
  };
}

const flowTests = filteredTests(t => t.syntax == null || t.syntax === 'flow');
const tests = filteredTests(t => t.syntax !== 'flow');

allTests.valid.forEach(t => delete t.syntax);
allTests.invalid.forEach(t => delete t.syntax);

describe('rules-of-hooks/rules-of-hooks', () => {
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

  new ESLintTesterV7({
    parser: require.resolve('babel-eslint'),
    parserOptions: parserOptionsV7,
  }).run('eslint: v7, parser: babel-eslint', ReactHooksESLintRule, tests);

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('@babel/eslint-parser'),
    },
  }).run(
    'eslint: v9, parser: @babel/eslint-parser',
    ReactHooksESLintRule,
    tests
  );

  new ESLintTesterV7({
    parser: require.resolve('hermes-eslint'),
    parserOptions: {
      sourceType: 'module',
      enableExperimentalComponentSyntax: true,
    },
  }).run('eslint: v7, parser: hermes-eslint', ReactHooksESLintRule, flowTests);

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('hermes-eslint'),
      parserOptions: {
        sourceType: 'module',
        enableExperimentalComponentSyntax: true,
      },
    },
  }).run('eslint: v9, parser: hermes-eslint', ReactHooksESLintRule, flowTests);

  new ESLintTesterV7({
    parser: require.resolve('@typescript-eslint/parser-v2'),
    parserOptions: parserOptionsV7,
  }).run(
    'eslint: v7, parser: @typescript-eslint/parser@2.x',
    ReactHooksESLintRule,
    tests
  );

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('@typescript-eslint/parser-v2'),
    },
  }).run(
    'eslint: v9, parser: @typescript-eslint/parser@2.x',
    ReactHooksESLintRule,
    tests
  );

  new ESLintTesterV7({
    parser: require.resolve('@typescript-eslint/parser-v3'),
    parserOptions: parserOptionsV7,
  }).run(
    'eslint: v7, parser: @typescript-eslint/parser@3.x',
    ReactHooksESLintRule,
    tests
  );

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('@typescript-eslint/parser-v3'),
    },
  }).run(
    'eslint: v9, parser: @typescript-eslint/parser@3.x',
    ReactHooksESLintRule,
    tests
  );

  new ESLintTesterV7({
    parser: require.resolve('@typescript-eslint/parser-v4'),
    parserOptions: parserOptionsV7,
  }).run(
    'eslint: v7, parser: @typescript-eslint/parser@4.x',
    ReactHooksESLintRule,
    tests
  );

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('@typescript-eslint/parser-v4'),
    },
  }).run(
    'eslint: v9, parser: @typescript-eslint/parser@4.x',
    ReactHooksESLintRule,
    tests
  );

  new ESLintTesterV7({
    parser: require.resolve('@typescript-eslint/parser-v5'),
    parserOptions: parserOptionsV7,
  }).run(
    'eslint: v7, parser: @typescript-eslint/parser@^5.0.0-0',
    ReactHooksESLintRule,
    tests
  );

  new ESLintTesterV9({
    languageOptions: {
      ...languageOptionsV9,
      parser: require('@typescript-eslint/parser-v5'),
    },
  }).run(
    'eslint: v9, parser: @typescript-eslint/parser@^5.0.0',
    ReactHooksESLintRule,
    tests
  );
});
