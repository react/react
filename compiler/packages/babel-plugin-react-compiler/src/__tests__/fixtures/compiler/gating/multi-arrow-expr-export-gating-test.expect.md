
## Input

```javascript
// @gating
import {Stringify} from 'shared-runtime';

const ErrorView = (error, _retry) => <Stringify error={error}></Stringify>;

export const Renderer = props => (
  <div>
    <span></span>
    <ErrorView></ErrorView>
  </div>
);

export const FIXTURE_ENTRYPOINT = {
  fn: eval('Renderer'),
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating
import { Stringify } from "shared-runtime";

const ErrorView = isForgetEnabled_Fixtures()
  ? (error, _retry) => {
      const $ = _c(2);
      let t0;
      if ($[0] !== error) {
        t0 = <Stringify error={error} />;
        $[0] = error;
        $[1] = t0;
      } else {
        t0 = $[1];
      }
      return t0;
    }
  : (error, _retry) => <Stringify error={error}></Stringify>;

export const Renderer = isForgetEnabled_Fixtures()
  ? (props) => {
      const $ = _c(1);
      let t0;
      if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = (
          <div>
            <span />
            <ErrorView />
          </div>
        );
        $[0] = t0;
      } else {
        t0 = $[0];
      }
      return t0;
    }
  : (props) => (
      <div>
        <span></span>
        <ErrorView></ErrorView>
      </div>
    );
export const FIXTURE_ENTRYPOINT = {
  fn: eval("Renderer"),
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div><span></span><div>{"error":{}}</div></div>