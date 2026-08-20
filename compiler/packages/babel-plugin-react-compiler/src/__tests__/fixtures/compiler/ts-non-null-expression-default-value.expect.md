
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
const THEME_MAP: ReadonlyMap<string, string> = new Map([
  ['default', 'light'],
  ['dark', 'dark'],
]);

export const Component = ({theme = THEME_MAP.get('default')!}) => {
  return <div className={`theme-${theme}`}>User preferences</div>;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{status: 'success'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false
const THEME_MAP: ReadonlyMap<string, string> = new Map([
  ["default", "light"],
  ["dark", "dark"],
]);

export const Component = (t0) => {
  const $ = _c(2);
  const { theme: t1 } = t0;
  const theme = t1 === undefined ? THEME_MAP.get("default") : t1;
  const t2 = `theme-${theme}`;
  let t3;
  if ($[0] !== t2) {
    t3 = <div className={t2}>User preferences</div>;
    $[0] = t2;
    $[1] = t3;
  } else {
    t3 = $[1];
  }
  return t3;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ status: "success" }],
};

```
      
### Eval output
(kind: ok) <div class="theme-light">User preferences</div>