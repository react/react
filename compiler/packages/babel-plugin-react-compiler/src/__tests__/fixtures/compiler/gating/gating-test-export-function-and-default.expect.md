
## Input

```javascript
// @gating @compilationMode:"annotation"
export default function Bar(props) {
  'use forget';
  return <div>{props.bar}</div>;
}

function NoForget(props) {
  return <Bar>{props.noForget}</Bar>;
}

function Foo(props) {
  'use forget';
  if (props.bar < 0) {
    return props.children;
  }
  return (
    <Foo bar={props.bar - 1}>
      <NoForget />
    </Foo>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval('Bar'),
  params: [{bar: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating @compilationMode:"annotation"
const Bar = isForgetEnabled_Fixtures()
  ? function Bar(props) {
      "use forget";
      const $ = _c(2);
      let t0;
      if ($[0] !== props.bar) {
        t0 = <div>{props.bar}</div>;
        $[0] = props.bar;
        $[1] = t0;
      } else {
        t0 = $[1];
      }
      return t0;
    }
  : function Bar(props) {
      "use forget";
      return <div>{props.bar}</div>;
    };
export default Bar;

function NoForget(props) {
  return <Bar>{props.noForget}</Bar>;
}
const Foo = isForgetEnabled_Fixtures()
  ? function Foo(props) {
      "use forget";
      const $ = _c(3);

      if (props.bar < 0) {
        return props.children;
      }

      const t0 = props.bar - 1;
      let t1;
      if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = <NoForget />;
        $[0] = t1;
      } else {
        t1 = $[0];
      }
      let t2;
      if ($[1] !== t0) {
        t2 = <Foo bar={t0}>{t1}</Foo>;
        $[1] = t0;
        $[2] = t2;
      } else {
        t2 = $[2];
      }
      return t2;
    }
  : function Foo(props) {
      "use forget";
      if (props.bar < 0) {
        return props.children;
      }
      return (
        <Foo bar={props.bar - 1}>
          <NoForget />
        </Foo>
      );
    };

export const FIXTURE_ENTRYPOINT = {
  fn: eval("Bar"),
  params: [{ bar: 2 }],
};

```
      
### Eval output
(kind: ok) <div>2</div>