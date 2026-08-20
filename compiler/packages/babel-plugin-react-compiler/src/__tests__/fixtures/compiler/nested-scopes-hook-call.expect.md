
## Input

```javascript
function component(props) {
  let x = [];
  let y = [];
  y.push(useHook(props.foo));
  x.push(y);
  return x;
}

```

## Code

```javascript
function component(props) {
  const x = [];
  const y = [];
  y.push(useHook(props.foo));
  x.push(y);
  return x;
}

```
      