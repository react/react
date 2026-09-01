
## Input

```javascript
function useKeyedState({key, init}) {
  const [prevKey, setPrevKey] = useState(key);
  const [state, setState] = useState(init);

  useMemo(() => {
    setPrevKey(key);
    setState(init);
  }, [key, init]);

  return state;
}

```


## Error

```
Found 2 errors:

Error: Calling setState from useMemo may trigger an infinite loop

Each time the memo callback is evaluated it will change state. This can cause a memoization dependency to change, running the memo function again and causing an infinite loop. Instead of setting state in useMemo(), prefer deriving the value during render. (https://react.dev/reference/react/useState).

error.invalid-setState-in-useMemo.ts:6:4
  4 |
  5 |   useMemo(() => {
> 6 |     setPrevKey(key);
    |     ^^^^^^^^^^ Found setState() within useMemo()
  7 |     setState(init);
  8 |   }, [key, init]);
  9 |

Error: Calling setState from useMemo may trigger an infinite loop

Each time the memo callback is evaluated it will change state. This can cause a memoization dependency to change, running the memo function again and causing an infinite loop. Instead of setting state in useMemo(), prefer deriving the value during render. (https://react.dev/reference/react/useState).

error.invalid-setState-in-useMemo.ts:7:4
   5 |   useMemo(() => {
   6 |     setPrevKey(key);
>  7 |     setState(init);
     |     ^^^^^^^^ Found setState() within useMemo()
   8 |   }, [key, init]);
   9 |
  10 |   return state;
```
          
      