
## Input

```javascript
//@flow @validatePreserveExistingMemoizationGuarantees @enableNewMutationAliasingModel

import {useCallback} from 'react';
import {useIdentity} from 'shared-runtime';

function Component({content, refetch}) {
  // This callback function accesses a hoisted const as a dependency,
  // but it cannot reference it as a dependency since that would be a
  // TDZ violation!
  const onRefetch = useCallback(() => {
    refetch(data);
  }, [refetch]);

  // The context variable gets frozen here since it's passed to a hook
  const onSubmit = useIdentity(onRefetch);

  // This has to error: onRefetch needs to memoize with `content` as a
  // dependency, but the dependency comes later
  const {data = null} = content;

  return <Foo data={data} onSubmit={onSubmit} />;
}

```


## Error

```
Found 2 errors:

Error: Cannot access variable before it is declared

`data` is accessed before it is declared, which prevents the earlier access from updating when this value changes over time.

   9 |   // TDZ violation!
  10 |   const onRefetch = useCallback(() => {
> 11 |     refetch(data);
     |             ^^^^ `data` accessed before it is declared
  12 |   }, [refetch]);
  13 |
  14 |   // The context variable gets frozen here since it's passed to a hook

  17 |   // This has to error: onRefetch needs to memoize with `content` as a
  18 |   // dependency, but the dependency comes later
> 19 |   const {data = null} = content;
     |          ^^^^^^^^^^^ `data` is declared here
  20 |
  21 |   return <Foo data={data} onSubmit={onSubmit} />;
  22 | }

Error: Found missing memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI.

   9 |   // TDZ violation!
  10 |   const onRefetch = useCallback(() => {
> 11 |     refetch(data);
     |             ^^^^ Missing dependency `data`
  12 |   }, [refetch]);
  13 |
  14 |   // The context variable gets frozen here since it's passed to a hook
```
          
      