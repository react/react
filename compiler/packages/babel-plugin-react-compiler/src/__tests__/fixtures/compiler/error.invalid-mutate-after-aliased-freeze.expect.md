
## Input

```javascript
function Component(props) {
  let x = [];
  let y = x;

  if (props.p1) {
    x = [];
  }

  let _ = <Component x={x} />;

  // y is MaybeFrozen at this point, since it may alias to x
  // (which is the above line freezes)
  y.push(props.p2);

  return <Component x={x} y={y} />;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value used previously in JSX is not allowed. Consider moving the modification before the JSX.

error.invalid-mutate-after-aliased-freeze.ts:13:2
  11 |   // y is MaybeFrozen at this point, since it may alias to x
  12 |   // (which is the above line freezes)
> 13 |   y.push(props.p2);
     |   ^ value cannot be modified
  14 |
  15 |   return <Component x={x} y={y} />;
  16 | }
```
          
      