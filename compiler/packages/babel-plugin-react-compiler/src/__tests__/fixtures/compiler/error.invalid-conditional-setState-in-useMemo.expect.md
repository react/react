
## Input

```javascript
function Component({item, cond}) {
  const [prevItem, setPrevItem] = useState(item);
  const [state, setState] = useState(0);

  useMemo(() => {
    if (cond) {
      setPrevItem(item);
      setState(0);
    }
  }, [cond, key, init]);

  return state;
}

```


## Error

```
Found 3 errors:

Error: Calling setState from useMemo may trigger an infinite loop

Each time the memo callback is evaluated it will change state. This can cause a memoization dependency to change, running the memo function again and causing an infinite loop. Instead of setting state in useMemo(), prefer deriving the value during render. (https://react.dev/reference/react/useState).

error.invalid-conditional-setState-in-useMemo.ts:7:6
   5 |   useMemo(() => {
   6 |     if (cond) {
>  7 |       setPrevItem(item);
     |       ^^^^^^^^^^^ Found setState() within useMemo()
   8 |       setState(0);
   9 |     }
  10 |   }, [cond, key, init]);

Error: Calling setState from useMemo may trigger an infinite loop

Each time the memo callback is evaluated it will change state. This can cause a memoization dependency to change, running the memo function again and causing an infinite loop. Instead of setting state in useMemo(), prefer deriving the value during render. (https://react.dev/reference/react/useState).

error.invalid-conditional-setState-in-useMemo.ts:8:6
   6 |     if (cond) {
   7 |       setPrevItem(item);
>  8 |       setState(0);
     |       ^^^^^^^^ Found setState() within useMemo()
   9 |     }
  10 |   }, [cond, key, init]);
  11 |

Error: Found missing/extra memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI. Extra dependencies can cause a value to update more often than it should, resulting in performance problems such as excessive renders or effects firing too often.

error.invalid-conditional-setState-in-useMemo.ts:7:18
   5 |   useMemo(() => {
   6 |     if (cond) {
>  7 |       setPrevItem(item);
     |                   ^^^^ Missing dependency `item`
   8 |       setState(0);
   9 |     }
  10 |   }, [cond, key, init]);

error.invalid-conditional-setState-in-useMemo.ts:10:12
   8 |       setState(0);
   9 |     }
> 10 |   }, [cond, key, init]);
     |             ^^^ Unnecessary dependency `key`. Values declared outside of a component/hook should not be listed as dependencies as the component will not re-render if they change
  11 |
  12 |   return state;
  13 | }

error.invalid-conditional-setState-in-useMemo.ts:10:17
   8 |       setState(0);
   9 |     }
> 10 |   }, [cond, key, init]);
     |                  ^^^^ Unnecessary dependency `init`. Values declared outside of a component/hook should not be listed as dependencies as the component will not re-render if they change
  11 |
  12 |   return state;
  13 | }

Inferred dependencies: `[cond, item]`
```
          
      