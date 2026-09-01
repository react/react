
## Input

```javascript
import fbt from 'fbt';

function Component(props) {
  const element = (
    <fbt desc={'Dialog to show to user'}>
      Hello{' '}
      <fbt:param
        name="a really long description
      that got split into multiple lines">
        {props.name}
      </fbt:param>
    </fbt>
  );
  return element.toString();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Jason'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";

function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.name) {
    const element = fbt._(
      "Hello {a really long description that got split into multiple lines}",
      [
        fbt._param(
          "a really long description that got split into multiple lines",
          props.name,
        ),
      ],
      { hk: "1euPUp" },
    );
    t0 = element.toString();
    $[0] = props.name;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ name: "Jason" }],
};

```
      
### Eval output
(kind: ok) "Hello Jason"