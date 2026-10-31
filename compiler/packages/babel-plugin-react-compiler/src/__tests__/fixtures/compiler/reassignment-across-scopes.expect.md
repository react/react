
## Input

```javascript
function Component(props) {
  let hasErrors = false;

  const nameErrors = [];
  if (props.name === 'taken') {
    hasErrors = true;
    nameErrors.push('That name is already taken');
  }

  const settingsErrors = [];
  if (props.missingVariable) {
    hasErrors = true;
    settingsErrors.push('Pick an X variable');
  }

  return [hasErrors, nameErrors, settingsErrors];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: '', missingVariable: false}],
  sequentialRenders: [
    {name: '', missingVariable: false},
    {name: 'taken', missingVariable: false},
    {name: '', missingVariable: false},
    {name: '', missingVariable: true},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(11);
  let hasErrors = false;
  let nameErrors;
  if ($[0] !== props.name) {
    nameErrors = [];
    if (props.name === "taken") {
      hasErrors = true;
      nameErrors.push("That name is already taken");
    }
    $[0] = props.name;
    $[1] = nameErrors;
    $[2] = hasErrors;
  } else {
    nameErrors = $[1];
    hasErrors = $[2];
  }
  let settingsErrors;
  if ($[3] !== hasErrors || $[4] !== props.missingVariable) {
    $[3] = hasErrors;
    settingsErrors = [];
    if (props.missingVariable) {
      hasErrors = true;
      settingsErrors.push("Pick an X variable");
    }
    $[4] = props.missingVariable;
    $[5] = settingsErrors;
    $[6] = hasErrors;
  } else {
    settingsErrors = $[5];
    hasErrors = $[6];
  }
  let t0;
  if ($[7] !== hasErrors || $[8] !== nameErrors || $[9] !== settingsErrors) {
    t0 = [hasErrors, nameErrors, settingsErrors];
    $[7] = hasErrors;
    $[8] = nameErrors;
    $[9] = settingsErrors;
    $[10] = t0;
  } else {
    t0 = $[10];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "", missingVariable: false }],
  sequentialRenders: [
    { name: "", missingVariable: false },
    { name: "taken", missingVariable: false },
    { name: "", missingVariable: false },
    { name: "", missingVariable: true },
  ],
};

```
      
### Eval output
(kind: ok) [false,[],[]]
[true,["That name is already taken"],[]]
[false,[],[]]
[true,[],["Pick an X variable"]]