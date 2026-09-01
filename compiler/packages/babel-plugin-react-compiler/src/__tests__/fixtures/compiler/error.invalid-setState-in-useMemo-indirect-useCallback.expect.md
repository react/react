
## Input

```javascript
import {useCallback} from 'react';

function useKeyedState({key, init}) {
  const [prevKey, setPrevKey] = useState(key);
  const [state, setState] = useState(init);

  const fn = useCallback(() => {
    setPrevKey(key);
    setState(init);
  });

  useMemo(() => {
    fn();
  }, [key, init]);

  return state;
}

```


## Error

```
Found 3 errors:

Error: Calling setState from useMemo may trigger an infinite loop

Each time the memo callback is evaluated it will change state. This can cause a memoization dependency to change, running the memo function again and causing an infinite loop. Instead of setting state in useMemo(), prefer deriving the value during render. (https://react.dev/reference/react/useState).

error.invalid-setState-in-useMemo-indirect-useCallback.ts:13:4
  11 |
  12 |   useMemo(() => {
> 13 |     fn();
     |     ^^ Found setState() within useMemo()
  14 |   }, [key, init]);
  15 |
  16 |   return state;

Error: Found missing memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI.

error.invalid-setState-in-useMemo-indirect-useCallback.ts:9:13
   7 |   const fn = useCallback(() => {
   8 |     setPrevKey(key);
>  9 |     setState(init);
     |              ^^^^ Missing dependency `init`
  10 |   });
  11 |
  12 |   useMemo(() => {

error.invalid-setState-in-useMemo-indirect-useCallback.ts:8:15
   6 |
   7 |   const fn = useCallback(() => {
>  8 |     setPrevKey(key);
     |                ^^^ Missing dependency `key`
   9 |     setState(init);
  10 |   });
  11 |

Error: Found missing/extra memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI. Extra dependencies can cause a value to update more often than it should, resulting in performance problems such as excessive renders or effects firing too often.

error.invalid-setState-in-useMemo-indirect-useCallback.ts:13:4
  11 |
  12 |   useMemo(() => {
> 13 |     fn();
     |     ^^ Missing dependency `fn`
  14 |   }, [key, init]);
  15 |
  16 |   return state;

error.invalid-setState-in-useMemo-indirect-useCallback.ts:14:6
  12 |   useMemo(() => {
  13 |     fn();
> 14 |   }, [key, init]);
     |       ^^^ Unnecessary dependency `key`
  15 |
  16 |   return state;
  17 | }

error.invalid-setState-in-useMemo-indirect-useCallback.ts:14:11
  12 |   useMemo(() => {
  13 |     fn();
> 14 |   }, [key, init]);
     |            ^^^^ Unnecessary dependency `init`
  15 |
  16 |   return state;
  17 | }

Inferred dependencies: `[fn]`
```
          
      