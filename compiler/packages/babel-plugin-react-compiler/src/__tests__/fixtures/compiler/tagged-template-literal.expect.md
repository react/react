
## Input

```javascript
function component() {
  let t = graphql`
    fragment F on T {
      id
    }
  `;

  return t;
}

```

## Code

```javascript
function component() {
  const t = graphql`
    fragment F on T {
      id
    }
  `;

  return t;
}

```
      