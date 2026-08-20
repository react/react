
## Input

```javascript
function Foo(props) {
  props.test = 1;
  return null;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.mutate-props.ts:2:2
  1 | function Foo(props) {
> 2 |   props.test = 1;
    |   ^^^^^ value cannot be modified
  3 |   return null;
  4 | }
  5 |
```
          
      