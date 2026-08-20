
## Input

```javascript
// @loggerTestOnly @validateStaticComponents @outputMode:"lint"
function Example(props) {
  const Component = createComponent();
  return <Component />;
}

```

## Code

```javascript
// @loggerTestOnly @validateStaticComponents @outputMode:"lint"
function Example(props) {
  const Component = createComponent();
  return <Component />;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"StaticComponents","reason":"Cannot create components during render","description":"Components created during render will reset their state each time they are created. Declare components outside of render","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":4,"column":10,"index":139},"end":{"line":4,"column":19,"index":148},"filename":"invalid-dynamically-construct-component-in-render.ts"},"message":"This component is created during render"},{"kind":"error","loc":{"start":{"line":3,"column":20,"index":110},"end":{"line":3,"column":37,"index":127},"filename":"invalid-dynamically-construct-component-in-render.ts"},"message":"The component is created during render here"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":2,"column":0,"index":64},"end":{"line":5,"column":1,"index":154},"filename":"invalid-dynamically-construct-component-in-render.ts"},"fnName":"Example","memoSlots":1,"memoBlocks":1,"memoValues":1,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented