
## Input

```javascript
import {useHook} from 'shared-runtime';

function Component(props) {
  const data = useHook();
  const items = [];
  // NOTE: `item` is a context variable because it's reassigned and also referenced
  // within a closure, the `onClick` handler of each item
  for (let key in props.data) {
    key = key ?? null; // no-op reassignment to force a context variable
    items.push(
      <div key={key} onClick={() => data.set(key)}>
        {key}
      </div>
    );
  }
  return <div>{items}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: {a: 'a', b: true, c: 'hello'}}],
};

```


## Error

```
Found 1 error:

Todo: Support non-trivial for..in inits

error.todo-for-in-loop-with-context-variable-iterator.ts:8:2
   6 |   // NOTE: `item` is a context variable because it's reassigned and also referenced
   7 |   // within a closure, the `onClick` handler of each item
>  8 |   for (let key in props.data) {
     |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
>  9 |     key = key ?? null; // no-op reassignment to force a context variable
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 10 |     items.push(
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 11 |       <div key={key} onClick={() => data.set(key)}>
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 12 |         {key}
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 13 |       </div>
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 14 |     );
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 15 |   }
     | ^^^^ Support non-trivial for..in inits
  16 |   return <div>{items}</div>;
  17 | }
  18 |
```
          
      