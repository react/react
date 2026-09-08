
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

function Component({prop}) {
  const [s, setS] = useState();
  const [second, setSecond] = useState(prop);

  /*
   * `second` is a source of state. It will inherit the value of `prop` in
   * the first render, but after that it will no longer be updated when
   * `prop` changes. So we shouldn't consider `second` as being derived from
   * `prop`
   */
  useEffect(() => {
    setS(second);
  }, [second]);

  return <div>{s}</div>;
}

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

function Component({ prop }) {
  const [s, setS] = useState();
  const [second, setSecond] = useState(prop);

  /*
   * `second` is a source of state. It will inherit the value of `prop` in
   * the first render, but after that it will no longer be updated when
   * `prop` changes. So we shouldn't consider `second` as being derived from
   * `prop`
   */
  useEffect(() => {
    setS(second);
  }, [second]);

  return <div>{s}</div>;
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectDerivationsOfState","reason":"You might not need an effect. Derive values in render, not effects.","description":"Using an effect triggers an additional render which can hurt performance and user experience, potentially briefly showing stale values to the user\n\nThis setState call is setting a derived value that depends on the following reactive sources:\n\nState: [second]\n\nData Flow Tree:\n└── second (State)\n\nSee: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":14,"column":4,"index":462},"end":{"line":14,"column":8,"index":466},"filename":"usestate-derived-from-prop-no-show-in-data-flow-tree.ts","identifierName":"setS"},"message":"This should be computed during render, not in an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":3,"column":0,"index":83},"end":{"line":18,"column":1,"index":519},"filename":"usestate-derived-from-prop-no-show-in-data-flow-tree.ts"},"fnName":"Component","memoSlots":5,"memoBlocks":2,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented