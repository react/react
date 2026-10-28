
## Input

```javascript
function Component() {
  const {refs, floatingStyles} = useFloating();
  return (
    <>
      <div ref={refs.setReference} />
      <div ref={refs.setFloating} style={floatingStyles} />
    </>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(8);
  const { refs, floatingStyles } = useFloating();
  let t0;
  if ($[0] !== refs.setReference) {
    t0 = <div ref={refs.setReference} />;
    $[0] = refs.setReference;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== floatingStyles || $[3] !== refs.setFloating) {
    t1 = <div ref={refs.setFloating} style={floatingStyles} />;
    $[2] = floatingStyles;
    $[3] = refs.setFloating;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  let t2;
  if ($[5] !== t0 || $[6] !== t1) {
    t2 = (
      <>
        {t0}
        {t1}
      </>
    );
    $[5] = t0;
    $[6] = t1;
    $[7] = t2;
  } else {
    t2 = $[7];
  }
  return t2;
}

```
      
### Eval output
(kind: exception) Fixture not implemented