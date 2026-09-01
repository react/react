
## Input

```javascript
function Component(props) {
  const x = props.cond ? useA : useB;
  return x();
}

```


## Error

```
Found 4 errors:

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-ternary-with-hook-values.ts:2:25
  1 | function Component(props) {
> 2 |   const x = props.cond ? useA : useB;
    |                          ^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  3 |   return x();
  4 | }
  5 |

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-ternary-with-hook-values.ts:2:32
  1 | function Component(props) {
> 2 |   const x = props.cond ? useA : useB;
    |                                 ^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  3 |   return x();
  4 | }
  5 |

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-ternary-with-hook-values.ts:2:12
  1 | function Component(props) {
> 2 |   const x = props.cond ? useA : useB;
    |             ^^^^^^^^^^^^^^^^^^^^^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  3 |   return x();
  4 | }
  5 |

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-ternary-with-hook-values.ts:3:9
  1 | function Component(props) {
  2 |   const x = props.cond ? useA : useB;
> 3 |   return x();
    |          ^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  4 | }
  5 |
```
          
      