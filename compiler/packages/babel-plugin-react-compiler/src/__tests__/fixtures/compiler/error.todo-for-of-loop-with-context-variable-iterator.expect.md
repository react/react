
## Input

```javascript
import {useHook} from 'shared-runtime';

function Component(props) {
  const data = useHook();
  const items = [];
  // NOTE: `item` is a context variable because it's reassigned and also referenced
  // within a closure, the `onClick` handler of each item
  for (let item of props.data) {
    item = item ?? {}; // reassignment to force a context variable
    items.push(
      <div key={item.id} onClick={() => data.set(item)}>
        {item.id}
      </div>
    );
  }
  return <div>{items}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: [{id: '1'}, {id: '2'}]}],
};

```


## Error

```
Found 1 error:

Todo: Support non-trivial for..of inits

error.todo-for-of-loop-with-context-variable-iterator.ts:8:2
   6 |   // NOTE: `item` is a context variable because it's reassigned and also referenced
   7 |   // within a closure, the `onClick` handler of each item
>  8 |   for (let item of props.data) {
     |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
>  9 |     item = item ?? {}; // reassignment to force a context variable
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 10 |     items.push(
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 11 |       <div key={item.id} onClick={() => data.set(item)}>
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 12 |         {item.id}
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 13 |       </div>
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 14 |     );
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 15 |   }
     | ^^^^ Support non-trivial for..of inits
  16 |   return <div>{items}</div>;
  17 | }
  18 |
```
          
      