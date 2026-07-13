
## Input

```javascript
function Component() {
  const x = 4;

  const get4 = () => {
    while (bar()) {
      if (baz) {
        bar();
      }
    }
    return () => x;
  };

  return get4;
}

```

## Code

```javascript
function Component() {
  const get4 = _temp2;

  return get4;
}
function _temp2() {
  while (bar()) {
    if (baz) {
      bar();
    }
  }
  return _temp;
}
function _temp() {
  return 4;
}

```
      