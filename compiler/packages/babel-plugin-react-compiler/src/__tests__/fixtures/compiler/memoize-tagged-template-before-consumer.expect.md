
## Input

```javascript
// @compilationMode:"all" @panicThreshold:"none"
export function Component({tag, consume}) {
  return consume(tag`value`);
}

```

## Code

```javascript
// @compilationMode:"all" @panicThreshold:"none"
export function Component(t0) {
  const { tag, consume } = t0;
  return consume(tag`value`);
}

```
      
### Eval output
(kind: exception) Fixture not implemented