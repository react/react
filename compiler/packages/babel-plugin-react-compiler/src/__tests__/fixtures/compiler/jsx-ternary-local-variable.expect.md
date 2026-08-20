
## Input

```javascript
import {RenderPropAsChild, StaticText1, StaticText2} from 'shared-runtime';

function Component(props: {showText1: boolean}) {
  const Foo = props.showText1 ? StaticText1 : StaticText2;

  return <RenderPropAsChild items={[() => <Foo key="0" />]} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{showText1: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { RenderPropAsChild, StaticText1, StaticText2 } from "shared-runtime";

function Component(props) {
  const $ = _c(2);
  const Foo = props.showText1 ? StaticText1 : StaticText2;
  let t0;
  if ($[0] !== Foo) {
    t0 = <RenderPropAsChild items={[() => <Foo key="0" />]} />;
    $[0] = Foo;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ showText1: false }],
};

```
      
### Eval output
(kind: ok) <div>HigherOrderComponent<div>StaticText2</div></div>