
## Input

```javascript
//@flow @validatePreserveExistingMemoizationGuarantees @enableNewMutationAliasingModel
component Component(
  onAsyncSubmit?: (() => void) => void,
  onClose: (isConfirmed: boolean) => void
) {
  // When running inferReactiveScopeVariables,
  // onAsyncSubmit and onClose update to share
  // a mutableRange instance.
  const onSubmit = useCallback(() => {
    if (onAsyncSubmit) {
      onAsyncSubmit(() => {
        onClose(true);
      });
      return;
    }
  }, [onAsyncSubmit, onClose]);
  // When running inferReactiveScopeVariables here,
  // first the existing range gets updated (affecting
  // onAsyncSubmit) and then onClose gets assigned a
  // different mutable range instance, which is the
  // one reset after AnalyzeFunctions.
  // The fix is to fully reset mutable ranges *instances*
  // after AnalyzeFunctions visit a function expression
  return <Dialog onSubmit={onSubmit} onClose={() => onClose(false)} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(8);
  const { onAsyncSubmit, onClose } = t0;
  let t1;
  if ($[0] !== onAsyncSubmit || $[1] !== onClose) {
    t1 = () => {
      if (onAsyncSubmit) {
        onAsyncSubmit(() => {
          onClose(true);
        });
        return;
      }
    };
    $[0] = onAsyncSubmit;
    $[1] = onClose;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const onSubmit = t1;
  let t2;
  if ($[3] !== onClose) {
    t2 = () => onClose(false);
    $[3] = onClose;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  let t3;
  if ($[5] !== onSubmit || $[6] !== t2) {
    t3 = <Dialog onSubmit={onSubmit} onClose={t2} />;
    $[5] = onSubmit;
    $[6] = t2;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  return t3;
}

```
      
### Eval output
(kind: exception) Fixture not implemented