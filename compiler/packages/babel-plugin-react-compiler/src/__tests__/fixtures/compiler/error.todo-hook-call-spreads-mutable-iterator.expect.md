
## Input

```javascript
import {useIdentity} from 'shared-runtime';

function Component() {
  const items = makeArray(0, 1, 2, null, 4, false, 6);
  return useIdentity(...items.values());
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [{}, {}],
};

```


## Error

```
Found 1 error:

Todo: Support spread syntax for hook arguments

error.todo-hook-call-spreads-mutable-iterator.ts:5:24
  3 | function Component() {
  4 |   const items = makeArray(0, 1, 2, null, 4, false, 6);
> 5 |   return useIdentity(...items.values());
    |                         ^^^^^^^^^^^^^^ Support spread syntax for hook arguments
  6 | }
  7 |
  8 | export const FIXTURE_ENTRYPOINT = {
```
          
      