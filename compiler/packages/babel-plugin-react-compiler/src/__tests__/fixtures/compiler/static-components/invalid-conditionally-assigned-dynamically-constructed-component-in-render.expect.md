
## Input

```javascript
// @loggerTestOnly @validateStaticComponents @outputMode:"lint"
function Example(props) {
  let Component;
  if (props.cond) {
    Component = createComponent();
  } else {
    Component = DefaultComponent;
  }
  return <Component />;
}

```

## Code

```javascript
// @loggerTestOnly @validateStaticComponents @outputMode:"lint"
function Example(props) {
  let Component;
  if (props.cond) {
    Component = createComponent();
  } else {
    Component = DefaultComponent;
  }
  return <Component />;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"StaticComponents","reason":"Cannot create components during render","description":"Components created during render will reset their state each time they are created. Declare components outside of render","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":9,"column":10,"index":221},"end":{"line":9,"column":19,"index":230},"filename":"invalid-conditionally-assigned-dynamically-constructed-component-in-render.ts"},"message":"This component is created during render"},{"kind":"error","loc":{"start":{"line":5,"column":16,"index":143},"end":{"line":5,"column":33,"index":160},"filename":"invalid-conditionally-assigned-dynamically-constructed-component-in-render.ts"},"message":"The component is created during render here"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":2,"column":0,"index":64},"end":{"line":10,"column":1,"index":236},"filename":"invalid-conditionally-assigned-dynamically-constructed-component-in-render.ts"},"fnName":"Example","memoSlots":3,"memoBlocks":2,"memoValues":2,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented