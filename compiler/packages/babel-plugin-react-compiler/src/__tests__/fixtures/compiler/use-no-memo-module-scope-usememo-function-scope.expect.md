
## Input

```javascript
// @compilationMode:"all"
'use no memo';

function TestComponent({x}) {
  'use memo';
  return <Button>{x}</Button>;
}

```

## Code

```javascript
// @compilationMode:"all"
"use no memo";

function TestComponent({ x }) {
  "use memo";
  return <Button>{x}</Button>;
}

```
      
### Eval output
(kind: exception) Fixture not implemented