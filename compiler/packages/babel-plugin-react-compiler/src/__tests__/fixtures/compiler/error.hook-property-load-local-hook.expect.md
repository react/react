
## Input

```javascript
function useFoo() {}
useFoo.useBar = function () {
  return 'foo';
};

function Foo() {
  let bar = useFoo.useBar;
  return bar();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```


## Error

```
Found 2 errors:

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.hook-property-load-local-hook.ts:7:12
   5 |
   6 | function Foo() {
>  7 |   let bar = useFoo.useBar;
     |             ^^^^^^^^^^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
   8 |   return bar();
   9 | }
  10 |

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.hook-property-load-local-hook.ts:8:9
   6 | function Foo() {
   7 |   let bar = useFoo.useBar;
>  8 |   return bar();
     |          ^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
   9 | }
  10 |
  11 | export const FIXTURE_ENTRYPOINT = {
```
          
      