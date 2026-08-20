
## Input

```javascript
function a() {
  return import.meta.url;
}

function b() {
  let a = 0;
  if (import.meta.url) {
    a = 1;
  }
  return a;
}

function c() {
  let a = 0;
  if (import.meta.foo) {
    a = 1;
  }
  return a;
}

function d() {
  let a = 0;
  if (import.meta) {
    a = 1;
  }
  return a;
}

```

## Code

```javascript
function a() {
  return import.meta.url;
}

function b() {
  let a = 0;
  if (import.meta.url) {
    a = 1;
  }

  return a;
}

function c() {
  let a = 0;
  if (import.meta.foo) {
    a = 1;
  }

  return a;
}

function d() {
  let a = 0;
  if (import.meta) {
    a = 1;
  }

  return a;
}

```
      