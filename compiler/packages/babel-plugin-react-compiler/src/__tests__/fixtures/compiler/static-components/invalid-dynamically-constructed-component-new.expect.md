
## Input

```javascript
// @loggerTestOnly @validateStaticComponents @outputMode:"lint"
function Example(props) {
  const Component = new ComponentFactory();
  return <Component />;
}

```

## Code

```javascript
// @loggerTestOnly @validateStaticComponents @outputMode:"lint"
function Example(props) {
  const Component = new ComponentFactory();
  return <Component />;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"StaticComponents","reason":"Cannot create components during render","description":"Components created during render will reset their state each time they are created. Declare components outside of render","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":4,"column":10,"index":144},"end":{"line":4,"column":19,"index":153},"filename":"invalid-dynamically-constructed-component-new.ts"},"message":"This component is created during render"},{"kind":"error","loc":{"start":{"line":3,"column":20,"index":110},"end":{"line":3,"column":42,"index":132},"filename":"invalid-dynamically-constructed-component-new.ts"},"message":"The component is created during render here"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":2,"column":0,"index":64},"end":{"line":5,"column":1,"index":159},"filename":"invalid-dynamically-constructed-component-new.ts"},"fnName":"Example","memoSlots":1,"memoBlocks":1,"memoValues":1,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented