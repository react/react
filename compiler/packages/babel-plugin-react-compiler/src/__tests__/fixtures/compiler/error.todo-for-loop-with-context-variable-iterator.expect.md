
## Input

```javascript
import {Stringify, useIdentity} from 'shared-runtime';

function Component() {
  const data = useIdentity(
    new Map([
      [0, 'value0'],
      [1, 'value1'],
    ])
  );
  const items = [];
  // NOTE: `i` is a context variable because it's reassigned and also referenced
  // within a closure, the `onClick` handler of each item
  // TODO: for loops create a unique environment on each iteration, which means
  // that if the iteration variable is only updated in the updater, the variable
  // is effectively const within the body and the "update" acts more like
  // a re-initialization than a reassignment.
  // Until we model this "new environment" semantic, we allow this case to error
  for (let i = MIN; i <= MAX; i += INCREMENT) {
    items.push(
      <Stringify key={i} onClick={() => data.get(i)} shouldInvokeFns={true} />
    );
  }
  return <>{items}</>;
}

const MIN = 0;
const MAX = 3;
const INCREMENT = 1;

export const FIXTURE_ENTRYPOINT = {
  params: [],
  fn: Component,
};

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value used previously in JSX is not allowed. Consider moving the modification before the JSX.

error.todo-for-loop-with-context-variable-iterator.ts:18:30
  16 |   // a re-initialization than a reassignment.
  17 |   // Until we model this "new environment" semantic, we allow this case to error
> 18 |   for (let i = MIN; i <= MAX; i += INCREMENT) {
     |                               ^ `i` cannot be modified
  19 |     items.push(
  20 |       <Stringify key={i} onClick={() => data.get(i)} shouldInvokeFns={true} />
  21 |     );
```
          
      