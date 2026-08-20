/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// NOTE: Extracted from https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/__tests__/ESLintRulesOfHooks-test.js

/**
 * A string template tag that removes padding from the left side of multi-line strings
 */
function normalizeIndent(strings) {
  const codeLines = strings[0].split('\n');
  const leftPadding = codeLines[1].match(/\s+/)[0];
  return codeLines.map(line => line.slice(leftPadding.length)).join('\n');
}

module.exports.tests = {
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
  ],
  invalid: [
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
      errors: [],
    },
    {
      code: normalizeIndent`
        Hook.useState();
        Hook._useState();
        Hook.use42();
        Hook.useHook();
        Hook.use_hook();
      `,
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
    },
    {
      code: normalizeIndent`
        // Invalid because it's dangerous and might not warn otherwise.
        // This *must* be invalid.
        function ComponentWithTernaryHook() {
          cond ? useTernaryHook() : null;
        }
      `,
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
    },
    {
      code: normalizeIndent`
        // This is invalid because "use"-prefixed functions used in named
        // functions are assumed to be hooks.
        React.unknownFunction(function notAComponent(foo, bar) {
          useProbablyAHook(bar)
        });
      `,
      errors: [],
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
      errors: [],
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
      errors: [],
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
      errors: [],
    },
    {
      code: normalizeIndent`
        class ClassComponentWithHook extends React.Component {
          render() {
            React.useState();
          }
        }
      `,
      errors: [],
    },
    {
      code: normalizeIndent`
        (class {useHook = () => { useState(); }});
      `,
      errors: [],
    },
    {
      code: normalizeIndent`
        (class {useHook() { useState(); }});
      `,
      errors: [],
    },
    {
      code: normalizeIndent`
        (class {h = () => { useState(); }});
      `,
      errors: [],
    },
    {
      code: normalizeIndent`
        (class {i() { useState(); }});
      `,
      errors: [],
    },
  ],
};
