
## Input

```javascript
type Status = 'pending' | 'success' | 'error';

const StatusIndicator = ({status}: {status: Status}) => {
  return <div className={`status-${status}`}>Status: {status}</div>;
};

const Component = ({status = 'pending' as Status}) => {
  return <StatusIndicator status={status} />;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{status: 'success'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
type Status = "pending" | "success" | "error";

const StatusIndicator = (t0) => {
  const $ = _c(3);
  const { status } = t0;
  const t1 = `status-${status}`;
  let t2;
  if ($[0] !== status || $[1] !== t1) {
    t2 = <div className={t1}>Status: {status}</div>;
    $[0] = status;
    $[1] = t1;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  return t2;
};

const Component = (t0) => {
  const $ = _c(2);
  const { status: t1 } = t0;
  const status = t1 === undefined ? ("pending" as Status) : t1;
  let t2;
  if ($[0] !== status) {
    t2 = <StatusIndicator status={status} />;
    $[0] = status;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  return t2;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ status: "success" }],
};

```
      
### Eval output
(kind: ok) <div class="status-success">Status: success</div>