
## Input

```javascript
// @outputMode:"ssr"
function Component() {
  const [, startTransition] = useTransition();
  const [state, setState] = useState(0);
  const ref = useRef(null);
  const onChange = e => {
    // The known startTransition call allows us to infer this as an event handler
    // and prune it
    startTransition(() => {
      setState.call(null, e.target.value);
    });
  };
  useEffect(() => {
    log(ref.current.value);
  });
  return <CustomInput value={state} onChange={onChange} ref={ref} />;
}

```

## Code

```javascript
// @outputMode:"ssr"
function Component() {
  useTransition();
  const state = 0;
  const ref = useRef(null);
  const onChange = undefined;

  return <CustomInput value={state} onChange={onChange} ref={ref} />;
}

```
      
### Eval output
(kind: exception) Fixture not implemented