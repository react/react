
## Input

```javascript
function component() {
  let x = {};
  let p = {};
  let q = {};
  let y = {};

  x.y = y;
  p.y = x.y;
  q.y = p.y;

  mutate(q);
}

```

## Code

```javascript
function component() {
  const x = {};
  const p = {};
  const q = {};
  const y = {};

  x.y = y;
  p.y = x.y;
  q.y = p.y;

  mutate(q);
}

```
      