
## Input

```javascript
const useCases = ['Going to the store', 'Picking up the kids', 'Watching TV'];

const thisIsSafeBut = {
  useCases: ['but this is not'],
};

export default function MyApp() {
  return (
    <>
      {useCases.map(useCase => (
        <div key={useCase}>{useCase}</div>
      ))}

      {thisIsSafeBut.useCases.map(useCase => (
        <div key={useCase}>{useCase}</div>
      ))}
    </>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const useCases = ["Going to the store", "Picking up the kids", "Watching TV"];

const thisIsSafeBut = {
  useCases: ["but this is not"],
};

export default function MyApp() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (
      <>
        {useCases.map(_temp)}

        {thisIsSafeBut.useCases.map(_temp2)}
      </>
    );
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp2(useCase_0) {
  return <div key={useCase_0}>{useCase_0}</div>;
}
function _temp(useCase) {
  return <div key={useCase}>{useCase}</div>;
}

```
      
### Eval output
(kind: exception) Fixture not implemented