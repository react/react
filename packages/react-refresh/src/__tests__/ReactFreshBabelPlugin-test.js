/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const babel = require('@babel/core');
const {wrap} = require('jest-snapshot-serializer-raw');
const freshPlugin = require('react-refresh/babel');

function transform(input, options = {}) {
  return wrap(
    babel.transform(input, {
      babelrc: false,
      configFile: false,
      envName: options.envName,
      plugins: [
        '@babel/syntax-jsx',
        '@babel/syntax-dynamic-import',
        [
          freshPlugin,
          {
            skipEnvCheck:
              options.skipEnvCheck === undefined ? true : options.skipEnvCheck,
            // To simplify debugging tests:
            emitFullSignatures: true,
            ...options.freshOptions,
          },
        ],
        ...(options.plugins || []),
      ],
    }).code,
  );
}

describe('ReactFreshBabelPlugin', () => {
  it('registers top-level function declarations', () => {
    // Hello and Bar should be registered, handleClick shouldn't.
    expect(
      transform(`
        function Hello() {
          function handleClick() {}
          return <h1 onClick={handleClick}>Hi</h1>;
        }

        function Bar() {
          return <Hello />;
        }
    `),
    ).toMatchSnapshot();
  });

  it('registers top-level exported function declarations', () => {
    expect(
      transform(`
        export function Hello() {
          function handleClick() {}
          return <h1 onClick={handleClick}>Hi</h1>;
        }

        export default function Bar() {
          return <Hello />;
        }

        function Baz() {
          return <h1>OK</h1>;
        }

        const NotAComp = 'hi';
        export { Baz, NotAComp };

        export function sum() {}
        export const Bad = 42;
    `),
    ).toMatchSnapshot();
  });

  it('registers top-level exported named arrow functions', () => {
    expect(
      transform(`
        export const Hello = () => {
          function handleClick() {}
          return <h1 onClick={handleClick}>Hi</h1>;
        };

        export let Bar = (props) => <Hello />;

        export default () => {
          // This one should be ignored.
          // You should name your components.
          return <Hello />;
        };
    `),
    ).toMatchSnapshot();
  });

  it('uses original function declaration if it get reassigned', () => {
    // This should register the original version.
    // TODO: in the future, we may *also* register the wrapped one.
    expect(
      transform(`
        function Hello() {
          return <h1>Hi</h1>;
        }
        Hello = connect(Hello);
    `),
    ).toMatchSnapshot();
  });

  it('only registers pascal case functions', () => {
    // Should not get registered.
    expect(
      transform(`
        function hello() {
          return 2 * 2;
        }
    `),
    ).toMatchSnapshot();
  });

  it('registers top-level variable declarations with function expressions', () => {
    // Hello and Bar should be registered; handleClick, sum, Baz, and Qux shouldn't.
    expect(
      transform(`
        let Hello = function() {
          function handleClick() {}
          return <h1 onClick={handleClick}>Hi</h1>;
        };
        const Bar = function Baz() {
          return <Hello />;
        };
        function sum() {}
        let Baz = 10;
        var Qux;
    `),
    ).toMatchSnapshot();
  });

  it('registers top-level variable declarations with arrow functions', () => {
    // Hello, Bar, and Baz should be registered; handleClick and sum shouldn't.
    expect(
      transform(`
        let Hello = () => {
          const handleClick = () => {};
          return <h1 onClick={handleClick}>Hi</h1>;
        }
        const Bar = () => {
          return <Hello />;
        };
        var Baz = () => <div />;
        var sum = () => {};
    `),
    ).toMatchSnapshot();
  });

  it('ignores HOC definitions', () => {
    // TODO: we might want to handle HOCs at usage site, however.
    // TODO: it would be nice if we could always avoid registering
    // a function that is known to return a function or other non-node.
    expect(
      transform(`
        let connect = () => {
          function Comp() {
            const handleClick = () => {};
            return <h1 onClick={handleClick}>Hi</h1>;
          }
          return Comp;
        };
        function withRouter() {
          return function Child() {
            const handleClick = () => {};
            return <h1 onClick={handleClick}>Hi</h1>;
          }
        };
    `),
    ).toMatchSnapshot();
  });

  it('ignores complex definitions', () => {
    expect(
      transform(`
        let A = foo ? () => {
          return <h1>Hi</h1>;
        } : null
        const B = (function Foo() {
          return <h1>Hi</h1>;
        })();
        let C = () => () => {
          return <h1>Hi</h1>;
        };
        let D = bar && (() => {
          return <h1>Hi</h1>;
        });
    `),
    ).toMatchSnapshot();
  });

  it('ignores unnamed function declarations', () => {
    expect(
      transform(`
        export default function() {}
    `),
    ).toMatchSnapshot();
  });

  it('registers memo default export', () => {
    expect(
      transform(`
        function Component() {}
        export default React.memo(Component);
    `),
    ).toMatchSnapshot();
  });

  it('registers forwardRef default export', () => {
    expect(
      transform(`
        function Component() {}
        export default React.forwardRef(Component);
    `),
    ).toMatchSnapshot();
  });

  it('registers memo default export', () => {
    expect(
      transform(`
        import {memo} from 'react';
        function Component() {}
        export default memo(Component);
    `),
    ).toMatchSnapshot();
  });

  it('registers forwardRef default export', () => {
    expect(
      transform(`
        import {forwardRef} from 'react';
        function Component() {}
        export default forwardRef(Component);
    `),
    ).toMatchSnapshot();
  });

  it('registers likely HOCs with inline functions', () => {
    expect(
      transform(`
        const A = forwardRef(function() {
          return <h1>Foo</h1>;
        });
        const B = memo(React.forwardRef(() => {
          return <h1>Foo</h1>;
        }));
        export default React.memo(forwardRef((props, ref) => {
          return <h1>Foo</h1>;
        }));
    `),
    ).toMatchSnapshot();
    expect(
      transform(`
        export default React.memo(forwardRef(function (props, ref) {
          return <h1>Foo</h1>;
        }));
    `),
    ).toMatchSnapshot();
    expect(
      transform(`
        export default React.memo(forwardRef(function Named(props, ref) {
          return <h1>Foo</h1>;
        }));
    `),
    ).toMatchSnapshot();
  });

  it('ignores higher-order functions that are not HOCs', () => {
    expect(
      transform(`
        const throttledAlert = throttle(function() {
          alert('Hi');
        });
        const TooComplex = (function() { return hello })(() => {});
        if (cond) {
          const Foo = thing(() => {});
        }
    `),
    ).toMatchSnapshot();
  });

  it('registers identifiers used in JSX at definition site', () => {
    // When in doubt, register variables that were used in JSX.
    // Foo, Header, and B get registered.
    // A doesn't get registered because it's not declared locally.
    // Alias doesn't get registered because its definition is just an identifier.
    expect(
      transform(`
        import A from './A';
        import Store from './Store';

        Store.subscribe();

        const Header = styled.div\`color: red\`
        const StyledFactory1 = styled('div')\`color: hotpink\`
        const StyledFactory2 = styled('div')({ color: 'hotpink' })
        const StyledFactory3 = styled(A)({ color: 'hotpink' })
        const FunnyFactory = funny.factory\`\`;

        let Alias1 = A;
        let Alias2 = A.Foo;
        const Dict = {};

        function Foo() {
          return (
            <div><A /><B /><StyledFactory1 /><StyledFactory2 /><StyledFactory3 /><Alias1 /><Alias2 /><Header /><Dict.X /></div>
          );
        }

        const B = hoc(A);
        // This is currently registered as a false positive:
        const NotAComponent = wow(A);
        // We could avoid it but it also doesn't hurt.
    `),
    ).toMatchSnapshot();
  });

  it('registers identifiers used in React.createElement at definition site', () => {
    // When in doubt, register variables that were used in JSX.
    // Foo, Header, and B get registered.
    // A doesn't get registered because it's not declared locally.
    // Alias doesn't get registered because its definition is just an identifier.
    expect(
      transform(`
        import A from './A';
        import Store from './Store';

        Store.subscribe();

        const Header = styled.div\`color: red\`
        const StyledFactory1 = styled('div')\`color: hotpink\`
        const StyledFactory2 = styled('div')({ color: 'hotpink' })
        const StyledFactory3 = styled(A)({ color: 'hotpink' })
        const FunnyFactory = funny.factory\`\`;

        let Alias1 = A;
        let Alias2 = A.Foo;
        const Dict = {};

        function Foo() {
          return [
            React.createElement(A),
            React.createElement(B),
            React.createElement(StyledFactory1),
            React.createElement(StyledFactory2),
            React.createElement(StyledFactory3),
            React.createElement(Alias1),
            React.createElement(Alias2),
            jsx(Header),
            React.createElement(Dict.X),
          ];
        }

        React.createContext(Store);

        const B = hoc(A);
        // This is currently registered as a false positive:
        const NotAComponent = wow(A);
        // We could avoid it but it also doesn't hurt.
    `),
    ).toMatchSnapshot();
  });

  it('registers capitalized identifiers in HOC calls', () => {
    expect(
      transform(`
        function Foo() {
          return <h1>Hi</h1>;
        }

        export default hoc(Foo);
        export const A = hoc(Foo);
        const B = hoc(Foo);
    `),
    ).toMatchSnapshot();
  });

  it('generates signatures for function declarations calling hooks', () => {
    expect(
      transform(`
        export default function App() {
          const [foo, setFoo] = useState(0);
          React.useEffect(() => {});
          return <h1>{foo}</h1>;
        }
    `),
    ).toMatchSnapshot();
  });

  it('generates signatures for function expressions calling hooks', () => {
    // Unlike __register__, we want to sign all functions -- not just top level.
    // This lets us support editing HOCs better.
    // For function declarations, __signature__ is called on next line.
    // For function expressions, it wraps the expression.
    // In order for this to work, __signature__ returns its first argument.
    expect(
      transform(`
        export const A = React.memo(React.forwardRef((props, ref) => {
          const [foo, setFoo] = useState(0);
          React.useEffect(() => {});
          return <h1 ref={ref}>{foo}</h1>;
        }));

        export const B = React.memo(React.forwardRef(function(props, ref) {
          const [foo, setFoo] = useState(0);
          React.useEffect(() => {});
          return <h1 ref={ref}>{foo}</h1>;
        }));

        function hoc() {
          return function Inner() {
            const [foo, setFoo] = useState(0);
            React.useEffect(() => {});
            return <h1 ref={ref}>{foo}</h1>;
          };
        }

        export let C = hoc();
    `),
    ).toMatchSnapshot();
  });

  it('includes custom hooks into the signatures', () => {
    expect(
      transform(`
        function useFancyState() {
          const [foo, setFoo] = React.useState(0);
          useFancyEffect();
          return foo;
        }

        const useFancyEffect = () => {
          React.useEffect(() => {});
        };

        export default function App() {
          const bar = useFancyState();
          return <h1>{bar}</h1>;
        }
    `),
    ).toMatchSnapshot();
  });

  it('includes custom hooks into the signatures when commonjs target is used', () => {
    // this test is passing with Babel 6
    // but would fail for Babel 7 _without_ custom hook node being cloned for signature
    expect(
      transform(
        `
        import {useFancyState} from './hooks';

        export default function App() {
          const bar = useFancyState();
          return <h1>{bar}</h1>;
        }
    `,
        {
          plugins: ['@babel/transform-modules-commonjs'],
        },
      ),
    ).toMatchSnapshot();
  });

  it('generates valid signature for exotic ways to call Hooks', () => {
    expect(
      transform(`
        import FancyHook from 'fancy';

        export default function App() {
          function useFancyState() {
            const [foo, setFoo] = React.useState(0);
            useFancyEffect();
            return foo;
          }
          const bar = useFancyState();
          const baz = FancyHook.useThing();
          React.useState();
          useThePlatform();
          return <h1>{bar}{baz}</h1>;
        }
    `),
    ).toMatchSnapshot();
  });

  it('does not consider require-like methods to be HOCs', () => {
    // None of these were declared in this file.
    // It's bad to register them because that would trigger
    // modules to execute in an environment with inline requires.
    // So we expect the transform to skip all of them even though
    // they are used in JSX.
    expect(
      transform(`
        const A = require('A');
        const B = foo ? require('X') : require('Y');
        const C = requireCond(gk, 'C');
        const D = import('D');

        export default function App() {
          return (
            <div>
              <A />
              <B />
              <C />
              <D />
            </div>
          );
        }
    `),
    ).toMatchSnapshot();
  });

  it('can handle implicit arrow returns', () => {
    expect(
      transform(`
        export default () => useContext(X);
        export const Foo = () => useContext(X);
        module.exports = () => useContext(X);
        const Bar = () => useContext(X);
        const Baz = memo(() => useContext(X));
        const Qux = () => (0, useContext(X));
      `),
    ).toMatchSnapshot();
  });

  it('uses custom identifiers for $RefreshReg$ and $RefreshSig$', () => {
    expect(
      transform(
        `export default function Bar () {
        useContext(X)
        return <Foo />
      };`,
        {
          freshOptions: {
            refreshReg: 'import.meta.refreshReg',
            refreshSig: 'import.meta.refreshSig',
          },
        },
      ),
    ).toMatchSnapshot();
  });

  it("respects Babel's envName option", () => {
    const envName = 'random';
    expect(() =>
      transform(`export default function BabelEnv () { return null };`, {
        envName,
        skipEnvCheck: false,
      }),
    ).toThrowError(
      'React Refresh Babel transform should only be enabled in development environment. ' +
        'Instead, the environment is: "' +
        envName +
        '". If you want to override this check, pass {skipEnvCheck: true} as plugin options.',
    );
  });

  it('does not get tripped by IIFEs', () => {
    expect(
      transform(`
        while (item) {
          (item => {
            useFoo();
          })(item);
        }
      `),
    ).toMatchSnapshot();
  });

  it('supports typescript namespace syntax', () => {
    expect(
      transform(
        `
        namespace Foo {
          export namespace Bar {
            export const A = () => {};

            function B() {};
            export const B1 = B;
          }

          export const C = () => {};
          export function D() {};

          namespace NotExported {
            export const E = () => {};
          }
        }
      `,
        {plugins: [['@babel/plugin-syntax-typescript', {isTSX: true}]]},
      ),
    ).toMatchSnapshot();
  });
});
