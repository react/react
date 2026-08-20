
## Input

```javascript
function Component(props) {
  const x = makeObject();
  // freeze
  <div>{x}</div>;
  delete x.y;
  return x;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value used previously in JSX is not allowed. Consider moving the modification before the JSX.

error.invalid-delete-property-of-frozen-value.ts:5:9
  3 |   // freeze
  4 |   <div>{x}</div>;
> 5 |   delete x.y;
    |          ^ value cannot be modified
  6 |   return x;
  7 | }
  8 |
```
          
      