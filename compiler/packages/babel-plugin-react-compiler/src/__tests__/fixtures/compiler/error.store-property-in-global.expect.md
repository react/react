
## Input

```javascript
let wat = {};

function Foo() {
  wat.test = 1;
  return wat;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a variable defined outside a component or hook is not allowed. Consider using an effect.

error.store-property-in-global.ts:4:2
  2 |
  3 | function Foo() {
> 4 |   wat.test = 1;
    |   ^^^ value cannot be modified
  5 |   return wat;
  6 | }
  7 |
```
          
      