
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

function Component({prop}) {
  const [s, setS] = useState(0);
  useEffect(() => {
    setS(prop);
  }, [prop, setS]);

  return <div>{prop}</div>;
}

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

function Component({ prop }) {
  const [s, setS] = useState(0);
  useEffect(() => {
    setS(prop);
  }, [prop, setS]);

  return <div>{prop}</div>;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectDerivationsOfState","reason":"You might not need an effect. Derive values in render, not effects.","description":"Using an effect triggers an additional render which can hurt performance and user experience, potentially briefly showing stale values to the user\n\nThis setState call is setting a derived value that depends on the following reactive sources:\n\nProps: [prop]\n\nData Flow Tree:\n└── prop (Prop)\n\nSee: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":6,"column":4,"index":169},"end":{"line":6,"column":8,"index":173},"filename":"effect-used-in-dep-array-still-errors.ts","identifierName":"setS"},"message":"This should be computed during render, not in an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":3,"column":0,"index":83},"end":{"line":10,"column":1,"index":231},"filename":"effect-used-in-dep-array-still-errors.ts"},"fnName":"Component","memoSlots":5,"memoBlocks":2,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented