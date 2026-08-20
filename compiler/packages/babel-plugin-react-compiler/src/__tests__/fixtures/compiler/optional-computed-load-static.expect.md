
## Input

```javascript
function Component(props) {
  let x = a?.b.c[0];
  return x;
}

```

## Code

```javascript
function Component(props) {
  const x = a?.b.c[0];
  return x;
}

```
      