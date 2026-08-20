
## Input

```javascript
function component() {
  let a = some();
  let b = someOther();
  if (a > b) {
    let m = {};
  }
}

```

## Code

```javascript
function component() {
  const a = some();
  const b = someOther();
  if (a > b) {
  }
}

```
      