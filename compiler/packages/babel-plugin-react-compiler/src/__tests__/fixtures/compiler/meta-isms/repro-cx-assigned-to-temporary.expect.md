
## Input

```javascript
// @compilationMode:"infer" @enableAssumeHooksFollowRulesOfReact:false @customMacros:"cx"
import {identity} from 'shared-runtime';

const DARK = 'dark';

function Component() {
  const theme = useTheme();
  return (
    <div
      className={cx({
        'styles/light': true,
        'styles/dark': theme.getTheme() === DARK,
      })}
    />
  );
}

function cx(obj) {
  const classes = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value) {
      classes.push(key);
    }
  }
  return classes.join(' ');
}

function useTheme() {
  return {
    getTheme() {
      return DARK;
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer" @enableAssumeHooksFollowRulesOfReact:false @customMacros:"cx"
import { identity } from "shared-runtime";

const DARK = "dark";

function Component() {
  const $ = _c(2);
  const theme = useTheme();

  const t0 = cx({
    "styles/light": true,
    "styles/dark": theme.getTheme() === DARK,
  });
  let t1;
  if ($[0] !== t0) {
    t1 = <div className={t0} />;
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

function cx(obj) {
  const classes = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value) {
      classes.push(key);
    }
  }
  return classes.join(" ");
}

function useTheme() {
  return {
    getTheme() {
      return DARK;
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div class="styles/light styles/dark"></div>