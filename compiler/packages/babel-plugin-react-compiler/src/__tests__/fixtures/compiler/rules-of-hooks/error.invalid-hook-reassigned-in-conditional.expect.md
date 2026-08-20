
## Input

```javascript
function Component(props) {
  let y;
  props.cond ? (y = useFoo) : null;
  return y();
}

```


## Error

```
Found 3 errors:

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-hook-reassigned-in-conditional.ts:3:20
  1 | function Component(props) {
  2 |   let y;
> 3 |   props.cond ? (y = useFoo) : null;
    |                     ^^^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  4 |   return y();
  5 | }
  6 |

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-hook-reassigned-in-conditional.ts:3:16
  1 | function Component(props) {
  2 |   let y;
> 3 |   props.cond ? (y = useFoo) : null;
    |                 ^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  4 |   return y();
  5 | }
  6 |

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-hook-reassigned-in-conditional.ts:4:9
  2 |   let y;
  3 |   props.cond ? (y = useFoo) : null;
> 4 |   return y();
    |          ^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  5 | }
  6 |
```
          
      