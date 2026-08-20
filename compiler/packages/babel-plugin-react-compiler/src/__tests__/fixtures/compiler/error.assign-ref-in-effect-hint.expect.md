
## Input

```javascript
// Fixture to test that we show a hint to name as `ref` or `-Ref` when attempting
// to assign .current inside an effect
function Component({foo}) {
  useEffect(() => {
    foo.current = true;
  }, [foo]);
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.assign-ref-in-effect-hint.ts:5:4
  3 | function Component({foo}) {
  4 |   useEffect(() => {
> 5 |     foo.current = true;
    |     ^^^ `foo` cannot be modified
  6 |   }, [foo]);
  7 | }
  8 |

Hint: If this value is a Ref (value returned by `useRef()`), rename the variable to end in "Ref".
```
          
      