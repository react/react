
## Input

```javascript
// @gating
import {Stringify} from 'shared-runtime';
const ErrorView = ({error, _retry}) => <Stringify error={error}></Stringify>;

export default ErrorView;

export const FIXTURE_ENTRYPOINT = {
  fn: eval('ErrorView'),
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating
import { Stringify } from "shared-runtime";
const ErrorView = isForgetEnabled_Fixtures()
  ? (t0) => {
      const $ = _c(2);
      const { error } = t0;
      let t1;
      if ($[0] !== error) {
        t1 = <Stringify error={error} />;
        $[0] = error;
        $[1] = t1;
      } else {
        t1 = $[1];
      }
      return t1;
    }
  : ({ error, _retry }) => <Stringify error={error}></Stringify>;

export default ErrorView;

export const FIXTURE_ENTRYPOINT = {
  fn: eval("ErrorView"),
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>{}</div>