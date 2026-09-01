
## Input

```javascript
import {makeArray} from 'shared-runtime';

const other = [0, 1];
function Component({}) {
  const items = makeArray(0, 1, 2, null, 4, false, 6);
  const max = Math.max(2, items.push(5), ...other);
  return max;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```


## Error

```
Found 1 error:

Invariant: [Codegen] Internal error: MethodCall::property must be an unpromoted + unmemoized MemberExpression

error.todo-nested-method-calls-lower-property-load-into-temporary.ts:6:14
  4 | function Component({}) {
  5 |   const items = makeArray(0, 1, 2, null, 4, false, 6);
> 6 |   const max = Math.max(2, items.push(5), ...other);
    |               ^^^^^^^^ Got: 'Identifier'
  7 |   return max;
  8 | }
  9 |
```
          
      