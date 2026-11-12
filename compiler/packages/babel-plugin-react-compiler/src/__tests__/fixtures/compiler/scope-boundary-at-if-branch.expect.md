
## Input

```javascript
function Component(props) {
  const label = <span>Label</span>;
  if (props.type === 'link') {
    const uri = createURI(props.id);
    return (
      <a
        href={uri.toString()}
        onClick={e => {
          e.preventDefault();
          uri.navigate();
        }}>
        {label}
      </a>
    );
  } else {
    return <>{label}</>;
  }
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(10);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <span>Label</span>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const label = t0;
  if (props.type === "link") {
    let t1;
    let uri;
    if ($[1] !== props.id) {
      uri = createURI(props.id);
      t1 = uri.toString();
      $[1] = props.id;
      $[2] = t1;
      $[3] = uri;
    } else {
      t1 = $[2];
      uri = $[3];
    }
    let t2;
    if ($[4] !== uri) {
      t2 = (e) => {
        e.preventDefault();
        uri.navigate();
      };
      $[4] = uri;
      $[5] = t2;
    } else {
      t2 = $[5];
    }
    let t3;
    if ($[6] !== t1 || $[7] !== t2) {
      t3 = (
        <a href={t1} onClick={t2}>
          {label}
        </a>
      );
      $[6] = t1;
      $[7] = t2;
      $[8] = t3;
    } else {
      t3 = $[8];
    }
    return t3;
  } else {
    let t1;
    if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = <>{label}</>;
      $[9] = t1;
    } else {
      t1 = $[9];
    }
    return t1;
  }
}

```
      
### Eval output
(kind: exception) Fixture not implemented