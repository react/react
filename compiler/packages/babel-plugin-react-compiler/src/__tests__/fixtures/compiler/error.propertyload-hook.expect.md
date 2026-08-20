
## Input

```javascript
function Component() {
  const x = Foo.useFoo;
  return x();
}

```


## Error

```
Found 2 errors:

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.propertyload-hook.ts:2:12
  1 | function Component() {
> 2 |   const x = Foo.useFoo;
    |             ^^^^^^^^^^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  3 |   return x();
  4 | }
  5 |

Error: Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values

error.propertyload-hook.ts:3:9
  1 | function Component() {
  2 |   const x = Foo.useFoo;
> 3 |   return x();
    |          ^ Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values
  4 | }
  5 |
```
          
      