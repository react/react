
## Input

```javascript
function Component(props) {
  // This is a violation of using a hook as a normal value rule:
  const getUser = props.cond ? useGetUser : emptyFunction;

  // Ideally we would report a "conditional hook call" error here.
  // It's an unconditional call, but the value may or may not be a hook.
  // TODO: report a conditional hook call error here
  return getUser();
}

```


## Error

```
Found 3 errors:

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-call-phi-possibly-hook.ts:3:31
  1 | function Component(props) {
  2 |   // This is a violation of using a hook as a normal value rule:
> 3 |   const getUser = props.cond ? useGetUser : emptyFunction;
    |                                ^^^^^^^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  4 |
  5 |   // Ideally we would report a "conditional hook call" error here.
  6 |   // It's an unconditional call, but the value may or may not be a hook.

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-call-phi-possibly-hook.ts:3:18
  1 | function Component(props) {
  2 |   // This is a violation of using a hook as a normal value rule:
> 3 |   const getUser = props.cond ? useGetUser : emptyFunction;
    |                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  4 |
  5 |   // Ideally we would report a "conditional hook call" error here.
  6 |   // It's an unconditional call, but the value may or may not be a hook.

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.invalid-call-phi-possibly-hook.ts:8:9
   6 |   // It's an unconditional call, but the value may or may not be a hook.
   7 |   // TODO: report a conditional hook call error here
>  8 |   return getUser();
     |          ^^^^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
   9 | }
  10 |
```
          
      