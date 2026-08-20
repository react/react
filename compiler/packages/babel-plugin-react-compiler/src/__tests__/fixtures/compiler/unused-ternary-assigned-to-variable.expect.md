
## Input

```javascript
function Component(props) {
  // unused!
  const obj = makeObject();
  const _ = obj.a ? props.b : props.c;
  return null;
}

```

## Code

```javascript
function Component(props) {
  const obj = makeObject();
  obj.a ? props.b : props.c;
  return null;
}

```
      