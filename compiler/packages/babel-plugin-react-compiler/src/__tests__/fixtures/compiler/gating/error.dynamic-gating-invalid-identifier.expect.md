
## Input

```javascript
// @dynamicGating:{"source":"shared-runtime"}

function Foo() {
  'use memo if(true)';
  return <div>hello world</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```


## Error

```
Found 1 error:

Error: Dynamic gating directive is not a valid JavaScript identifier

Found 'use memo if(true)'.

error.dynamic-gating-invalid-identifier.ts:4:2
  2 |
  3 | function Foo() {
> 4 |   'use memo if(true)';
    |   ^^^^^^^^^^^^^^^^^^^^ Dynamic gating directive is not a valid JavaScript identifier
  5 |   return <div>hello world</div>;
  6 | }
  7 |
```
          
      