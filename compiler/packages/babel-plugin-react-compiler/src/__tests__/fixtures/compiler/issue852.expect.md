
## Input

```javascript
function Component(c) {
  let x = {c};
  mutate(x);
  let a = x;
  let b = a;
}

```

## Code

```javascript
function Component(c) {
  const x = { c };
  mutate(x);
}

```
      