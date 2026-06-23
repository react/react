
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

function Component() {
  const [foo, setFoo] = useState({});
  const [bar, setBar] = useState(new Set());

  /*
   * isChanged is considered context of the effect's function expression,
   * if we don't bail out of effect mutation derivation tracking, isChanged
   * will inherit the sources of the effect's function expression.
   *
   * This is innacurate and with the multiple passes ends up causing an infinite loop.
   */
  useEffect(() => {
    let isChanged = false;

    const newData = foo.map(val => {
      bar.someMethod(val);
      isChanged = true;
    });

    if (isChanged) {
      setFoo(newData);
    }
  }, [foo, bar]);

  return (
    <div>
      {foo}, {bar}
    </div>
  );
}

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

function Component() {
  const [foo, setFoo] = useState({});
  const [bar, setBar] = useState(new Set());

  /*
   * isChanged is considered context of the effect's function expression,
   * if we don't bail out of effect mutation derivation tracking, isChanged
   * will inherit the sources of the effect's function expression.
   *
   * This is innacurate and with the multiple passes ends up causing an infinite loop.
   */
  useEffect(() => {
    let isChanged = false;

    const newData = foo.map((val) => {
      bar.someMethod(val);
      isChanged = true;
    });

    if (isChanged) {
      setFoo(newData);
    }
  }, [foo, bar]);

  return (
    <div>
      {foo}, {bar}
    </div>
  );
}

```

## Logs

```
{"kind":"CompileError","detail":{"category":"EffectDerivationsOfState","reason":"You might not need an effect. Derive values in render, not effects.","description":"Using an effect triggers an additional render which can hurt performance and user experience, potentially briefly showing stale values to the user\n\nThis setState call is setting a derived value that depends on the following reactive sources:\n\nState: [foo, bar]\n\nData Flow Tree:\n└── newData\n    ├── foo (State)\n    └── bar (State)\n\nSee: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state","severity":"Error","suggestions":null,"details":[{"kind":"error","loc":{"start":{"line":23,"column":6,"index":682},"end":{"line":23,"column":12,"index":688},"filename":"function-expression-mutation-edge-case.ts","identifierName":"setFoo"},"message":"This should be computed during render, not in an effect"}]},"fnLoc":null}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":3,"column":0,"index":83},"end":{"line":32,"column":1,"index":781},"filename":"function-expression-mutation-edge-case.ts"},"fnName":"Component","memoSlots":9,"memoBlocks":4,"memoValues":5,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented