
## Input

```javascript
// @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
function Component() {
  const items = useItems();
  const filteredItems = useMemo(
    () =>
      items.filter(([item]) => {
        return item.name != null;
      }),
    [item]
  );

  if (filteredItems.length === 0) {
    // note: this must return nested JSX to create the right scope
    // shape that causes no declarations to be emitted
    return (
      <div>
        <span />
      </div>
    );
  }

  return (
    <>
      {filteredItems.map(([item]) => (
        <Stringify item={item} />
      ))}
    </>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
function Component() {
  const $ = _c(6);
  const items = useItems();
  let t0;
  let t1;
  if ($[0] !== items) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const filteredItems = items.filter(_temp);
      if (filteredItems.length === 0) {
        let t2;
        if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
          t2 = (
            <div>
              <span />
            </div>
          );
          $[3] = t2;
        } else {
          t2 = $[3];
        }
        t1 = t2;
        break bb0;
      }
      t0 = filteredItems.map(_temp2);
    }
    $[0] = items;
    $[1] = t0;
    $[2] = t1;
  } else {
    t0 = $[1];
    t1 = $[2];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }
  let t2;
  if ($[4] !== t0) {
    t2 = <>{t0}</>;
    $[4] = t0;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}
function _temp2(t0) {
  const [item_0] = t0;
  return <Stringify item={item_0} />;
}
function _temp(t0) {
  const [item] = t0;
  return item.name != null;
}

```
      
### Eval output
(kind: exception) Fixture not implemented