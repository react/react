
## Input

```javascript
// @validateExhaustiveMemoizationDependencies

function Component() {
  const ref = useRef(null);
  const onChange = useCallback(() => {
    return ref.current.value;
  }, [ref.current.value]);

  return <input ref={ref} onChange={onChange} />;
}

```


## Error

```
Found 1 error:

Error: Found extra memoization dependencies

Extra dependencies can cause a value to update more often than it should, resulting in performance problems such as excessive renders or effects firing too often.

error.invalid-dep-on-ref-current-value.ts:7:6
   5 |   const onChange = useCallback(() => {
   6 |     return ref.current.value;
>  7 |   }, [ref.current.value]);
     |       ^^^^^^^^^^^^^^^^^ Unnecessary dependency `ref.current.value`
   8 |
   9 |   return <input ref={ref} onChange={onChange} />;
  10 | }

Inferred dependencies: `[]`
```
          
      