
## Input

```javascript
function foo([a, b], {c, d, e = 'e'}, f = 'f', ...args) {
  let i = 0;
  var x = [];

  class Bar {
    #secretSauce = 42;
    constructor() {
      console.log(this.#secretSauce);
    }
  }

  const g = {b() {}, c: () => {}};
  const {z, aa = 'aa'} = useCustom();

  <Button haha={1}></Button>;
  <Button>{/** empty */}</Button>;

  const j = function bar([quz, qux], ...args) {};

  for (; i < 3; i += 1) {
    x.push(i);
  }
  for (; i < 3; ) {
    break;
  }
  for (;;) {
    break;
  }

  graphql`
    ${g}
  `;

  graphql`\\t\n`;

  for (c of [1, 2]) {
  }
  for ([v] of [[1], [2]]) {
  }
  for ({v} of [{v: 1}, {v: 2}]) {
  }

  for (let x in {a: 1}) {
  }

  let updateIdentifier = 0;
  --updateIdentifier;
  ++updateIdentifier;
  updateIdentifier.y++;
  updateIdentifier.y--;

  switch (i) {
    case 1 + 1: {
    }
    case foo(): {
    }
    case x.y: {
    }
    default: {
    }
  }

  function component(a) {
    // Add support for function declarations once we support `var` hoisting.
    function t() {}
    t();
  }
}

let moduleLocal = false;

```


## Error

```
Found 10 errors:

Todo: (BuildHIR::lowerStatement) Handle var kinds in VariableDeclaration

error.todo-kitchensink.ts:3:2
  1 | function foo([a, b], {c, d, e = 'e'}, f = 'f', ...args) {
  2 |   let i = 0;
> 3 |   var x = [];
    |   ^^^^^^^^^^^ (BuildHIR::lowerStatement) Handle var kinds in VariableDeclaration
  4 |
  5 |   class Bar {
  6 |     #secretSauce = 42;

Compilation Skipped: Inline `class` declarations are not supported

Move class declarations outside of components/hooks.

error.todo-kitchensink.ts:5:2
   3 |   var x = [];
   4 |
>  5 |   class Bar {
     |   ^^^^^^^^^^^
>  6 |     #secretSauce = 42;
     | ^^^^^^^^^^^^^^^^^^^^^^
>  7 |     constructor() {
     | ^^^^^^^^^^^^^^^^^^^^^^
>  8 |       console.log(this.#secretSauce);
     | ^^^^^^^^^^^^^^^^^^^^^^
>  9 |     }
     | ^^^^^^^^^^^^^^^^^^^^^^
> 10 |   }
     | ^^^^ Inline `class` declarations are not supported
  11 |
  12 |   const g = {b() {}, c: () => {}};
  13 |   const {z, aa = 'aa'} = useCustom();

Todo: (BuildHIR::lowerExpression) Handle tagged template with interpolations

error.todo-kitchensink.ts:30:2
  28 |   }
  29 |
> 30 |   graphql`
     |   ^^^^^^^^
> 31 |     ${g}
     | ^^^^^^^^
> 32 |   `;
     | ^^^^ (BuildHIR::lowerExpression) Handle tagged template with interpolations
  33 |
  34 |   graphql`\\t\n`;
  35 |

Todo: (BuildHIR::lowerExpression) Handle tagged template where cooked value is different from raw value

error.todo-kitchensink.ts:34:2
  32 |   `;
  33 |
> 34 |   graphql`\\t\n`;
     |   ^^^^^^^^^^^^^^ (BuildHIR::lowerExpression) Handle tagged template where cooked value is different from raw value
  35 |
  36 |   for (c of [1, 2]) {
  37 |   }

Todo: (BuildHIR::node.lowerReorderableExpression) Expression type `MemberExpression` cannot be safely reordered

error.todo-kitchensink.ts:57:9
  55 |     case foo(): {
  56 |     }
> 57 |     case x.y: {
     |          ^^^ (BuildHIR::node.lowerReorderableExpression) Expression type `MemberExpression` cannot be safely reordered
  58 |     }
  59 |     default: {
  60 |     }

Todo: (BuildHIR::node.lowerReorderableExpression) Expression type `BinaryExpression` cannot be safely reordered

error.todo-kitchensink.ts:53:9
  51 |
  52 |   switch (i) {
> 53 |     case 1 + 1: {
     |          ^^^^^ (BuildHIR::node.lowerReorderableExpression) Expression type `BinaryExpression` cannot be safely reordered
  54 |     }
  55 |     case foo(): {
  56 |     }

Error: Cannot reassign variables declared outside of the component/hook

Variable `v` is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render).

error.todo-kitchensink.ts:38:8
  36 |   for (c of [1, 2]) {
  37 |   }
> 38 |   for ([v] of [[1], [2]]) {
     |         ^ `v` cannot be reassigned
  39 |   }
  40 |   for ({v} of [{v: 1}, {v: 2}]) {
  41 |   }

Error: Cannot reassign variables declared outside of the component/hook

Variable `v` is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render).

error.todo-kitchensink.ts:40:8
  38 |   for ([v] of [[1], [2]]) {
  39 |   }
> 40 |   for ({v} of [{v: 1}, {v: 2}]) {
     |         ^ `v` cannot be reassigned
  41 |   }
  42 |
  43 |   for (let x in {a: 1}) {

Todo: Support non-trivial for..of inits

error.todo-kitchensink.ts:38:2
  36 |   for (c of [1, 2]) {
  37 |   }
> 38 |   for ([v] of [[1], [2]]) {
     |   ^^^^^^^^^^^^^^^^^^^^^^^^^
> 39 |   }
     | ^^^^ Support non-trivial for..of inits
  40 |   for ({v} of [{v: 1}, {v: 2}]) {
  41 |   }
  42 |

Todo: Support non-trivial for..of inits

error.todo-kitchensink.ts:40:2
  38 |   for ([v] of [[1], [2]]) {
  39 |   }
> 40 |   for ({v} of [{v: 1}, {v: 2}]) {
     |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 41 |   }
     | ^^^^ Support non-trivial for..of inits
  42 |
  43 |   for (let x in {a: 1}) {
  44 |   }
```
          
      