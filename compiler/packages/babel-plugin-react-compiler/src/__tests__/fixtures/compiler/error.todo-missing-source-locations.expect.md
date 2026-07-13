
## Input

```javascript
// @validateSourceLocations
import {useEffect, useCallback} from 'react';

function Component({prop1, prop2}) {
  const x = prop1 + prop2;
  const y = x * 2;
  const arr = [x, y];
  const obj = {x, y};
  let destA, destB;
  if (y > 5) {
    [destA, destB] = arr;
  }

  const [a, b] = arr;
  const {x: c, y: d} = obj;
  let sound;

  if (y > 10) {
    sound = 'woof';
  } else {
    sound = 'meow';
  }

  useEffect(() => {
    if (a > 10) {
      console.log(a);
      console.log(sound);
      console.log(destA, destB);
    }
  }, [a, sound, destA, destB]);

  const foo = useCallback(() => {
    return a + b;
  }, [a, b]);

  function bar() {
    return (c + d) * 2;
  }

  console.log('Hello, world!');

  return [y, foo, bar];
}

```


## Error

```
Found 22 errors:

Todo: Important source location missing in generated code

Source location for Identifier is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:4:9
  2 | import {useEffect, useCallback} from 'react';
  3 |
> 4 | function Component({prop1, prop2}) {
    |          ^^^^^^^^^
  5 |   const x = prop1 + prop2;
  6 |   const y = x * 2;
  7 |   const arr = [x, y];

Todo: Important source location missing in generated code

Source location for VariableDeclaration is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:9:2
   7 |   const arr = [x, y];
   8 |   const obj = {x, y};
>  9 |   let destA, destB;
     |   ^^^^^^^^^^^^^^^^^
  10 |   if (y > 5) {
  11 |     [destA, destB] = arr;
  12 |   }

Todo: Important source location missing in generated code

Source location for ExpressionStatement is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:11:4
   9 |   let destA, destB;
  10 |   if (y > 5) {
> 11 |     [destA, destB] = arr;
     |     ^^^^^^^^^^^^^^^^^^^^^
  12 |   }
  13 |
  14 |   const [a, b] = arr;

Todo: Important source location missing in generated code

Source location for Identifier is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:15:9
  13 |
  14 |   const [a, b] = arr;
> 15 |   const {x: c, y: d} = obj;
     |          ^
  16 |   let sound;
  17 |
  18 |   if (y > 10) {

Todo: Important source location missing in generated code

Source location for Identifier is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:15:15
  13 |
  14 |   const [a, b] = arr;
> 15 |   const {x: c, y: d} = obj;
     |                ^
  16 |   let sound;
  17 |
  18 |   if (y > 10) {

Todo: Important source location missing in generated code

Source location for VariableDeclaration is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:16:2
  14 |   const [a, b] = arr;
  15 |   const {x: c, y: d} = obj;
> 16 |   let sound;
     |   ^^^^^^^^^^
  17 |
  18 |   if (y > 10) {
  19 |     sound = 'woof';

Todo: Important source location missing in generated code

Source location for ExpressionStatement is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:19:4
  17 |
  18 |   if (y > 10) {
> 19 |     sound = 'woof';
     |     ^^^^^^^^^^^^^^^
  20 |   } else {
  21 |     sound = 'meow';
  22 |   }

Todo: Important source location has wrong node type in generated code

Source location for Identifier exists in the generated output but with wrong node type(s): ExpressionStatement. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:19:4
  17 |
  18 |   if (y > 10) {
> 19 |     sound = 'woof';
     |     ^^^^^
  20 |   } else {
  21 |     sound = 'meow';
  22 |   }

Todo: Important source location missing in generated code

Source location for ExpressionStatement is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:21:4
  19 |     sound = 'woof';
  20 |   } else {
> 21 |     sound = 'meow';
     |     ^^^^^^^^^^^^^^^
  22 |   }
  23 |
  24 |   useEffect(() => {

Todo: Important source location has wrong node type in generated code

Source location for Identifier exists in the generated output but with wrong node type(s): ExpressionStatement. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:21:4
  19 |     sound = 'woof';
  20 |   } else {
> 21 |     sound = 'meow';
     |     ^^^^^
  22 |   }
  23 |
  24 |   useEffect(() => {

Todo: Important source location missing in generated code

Source location for ExpressionStatement is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:24:2
  22 |   }
  23 |
> 24 |   useEffect(() => {
     |   ^^^^^^^^^^^^^^^^^
> 25 |     if (a > 10) {
     | ^^^^^^^^^^^^^^^^^
> 26 |       console.log(a);
     | ^^^^^^^^^^^^^^^^^
> 27 |       console.log(sound);
     | ^^^^^^^^^^^^^^^^^
> 28 |       console.log(destA, destB);
     | ^^^^^^^^^^^^^^^^^
> 29 |     }
     | ^^^^^^^^^^^^^^^^^
> 30 |   }, [a, sound, destA, destB]);
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  31 |
  32 |   const foo = useCallback(() => {
  33 |     return a + b;

Todo: Important source location missing in generated code

Source location for ExpressionStatement is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:26:6
  24 |   useEffect(() => {
  25 |     if (a > 10) {
> 26 |       console.log(a);
     |       ^^^^^^^^^^^^^^^
  27 |       console.log(sound);
  28 |       console.log(destA, destB);
  29 |     }

Todo: Important source location missing in generated code

Source location for Identifier is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:26:14
  24 |   useEffect(() => {
  25 |     if (a > 10) {
> 26 |       console.log(a);
     |               ^^^
  27 |       console.log(sound);
  28 |       console.log(destA, destB);
  29 |     }

Todo: Important source location missing in generated code

Source location for ExpressionStatement is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:27:6
  25 |     if (a > 10) {
  26 |       console.log(a);
> 27 |       console.log(sound);
     |       ^^^^^^^^^^^^^^^^^^^
  28 |       console.log(destA, destB);
  29 |     }
  30 |   }, [a, sound, destA, destB]);

Todo: Important source location missing in generated code

Source location for Identifier is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:27:14
  25 |     if (a > 10) {
  26 |       console.log(a);
> 27 |       console.log(sound);
     |               ^^^
  28 |       console.log(destA, destB);
  29 |     }
  30 |   }, [a, sound, destA, destB]);

Todo: Important source location missing in generated code

Source location for ExpressionStatement is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:28:6
  26 |       console.log(a);
  27 |       console.log(sound);
> 28 |       console.log(destA, destB);
     |       ^^^^^^^^^^^^^^^^^^^^^^^^^^
  29 |     }
  30 |   }, [a, sound, destA, destB]);
  31 |

Todo: Important source location missing in generated code

Source location for Identifier is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:28:14
  26 |       console.log(a);
  27 |       console.log(sound);
> 28 |       console.log(destA, destB);
     |               ^^^
  29 |     }
  30 |   }, [a, sound, destA, destB]);
  31 |

Todo: Important source location missing in generated code

Source location for Identifier is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:32:14
  30 |   }, [a, sound, destA, destB]);
  31 |
> 32 |   const foo = useCallback(() => {
     |               ^^^^^^^^^^^
  33 |     return a + b;
  34 |   }, [a, b]);
  35 |

Todo: Important source location missing in generated code

Source location for Identifier is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:34:6
  32 |   const foo = useCallback(() => {
  33 |     return a + b;
> 34 |   }, [a, b]);
     |       ^
  35 |
  36 |   function bar() {
  37 |     return (c + d) * 2;

Todo: Important source location missing in generated code

Source location for Identifier is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:34:9
  32 |   const foo = useCallback(() => {
  33 |     return a + b;
> 34 |   }, [a, b]);
     |          ^
  35 |
  36 |   function bar() {
  37 |     return (c + d) * 2;

Todo: Important source location missing in generated code

Source location for ExpressionStatement is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:40:2
  38 |   }
  39 |
> 40 |   console.log('Hello, world!');
     |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  41 |
  42 |   return [y, foo, bar];
  43 | }

Todo: Important source location missing in generated code

Source location for Identifier is missing in the generated output. This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports..

error.todo-missing-source-locations.ts:40:10
  38 |   }
  39 |
> 40 |   console.log('Hello, world!');
     |           ^^^
  41 |
  42 |   return [y, foo, bar];
  43 | }
```
          
      