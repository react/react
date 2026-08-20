
## Input

```javascript
function Component(props) {
  // unused!
  const obj = makeObject();
  const obj2 = makeObject();
  const _ = (obj.a ?? obj2.b) || props.c;
  return null;
}

```

## Code

```javascript
function Component(props) {
  const obj = makeObject();
  const obj2 = makeObject();
  (obj.a ?? obj2.b) || props.c;
  return null;
}

```
      