
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @outputMode:"lint"

function Component({value}) {
  const [checked, setChecked] = useState('');

  useEffect(() => {
    setChecked(value === '' ? [] : value.split(','));
  }, [value]);

  return <div>{checked}</div>;
}

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @outputMode:"lint"

function Component({ value }) {
  const [checked, setChecked] = useState("");

  useEffect(() => {
    setChecked(value === "" ? [] : value.split(","));
  }, [value]);

  return <div>{checked}</div>;
}

```
      
### Eval output
(kind: exception) Fixture not implemented