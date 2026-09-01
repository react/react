
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @enableTreatSetIdentifiersAsStateSetters @loggerTestOnly @outputMode:"lint"

function Component({setParentState, prop}) {
  useEffect(() => {
    setParentState(prop);
  }, [prop]);

  return <div>{prop}</div>;
}

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @enableTreatSetIdentifiersAsStateSetters @loggerTestOnly @outputMode:"lint"

function Component({ setParentState, prop }) {
  useEffect(() => {
    setParentState(prop);
  }, [prop]);

  return <div>{prop}</div>;
}

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":3,"column":0,"index":124},"end":{"line":9,"column":1,"index":259},"filename":"from-props-setstate-in-effect-no-error.ts"},"fnName":"Component","memoSlots":7,"memoBlocks":3,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented