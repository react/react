
## Input

```javascript
// @enableJsxOutlining
function Component() {
  const [isSubmitting] = useState(false);

  return ssoProviders.map(provider => {
    return (
      <div key={provider.providerId}>
        <Switch
          disabled={isSubmitting}
          aria-label={`Toggle ${provider.displayName}`}
        />
      </div>
    );
  });
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableJsxOutlining
function Component() {
  const $ = _c(2);
  const [isSubmitting] = useState(false);
  let t0;
  if ($[0] !== isSubmitting) {
    t0 = ssoProviders.map((provider) => {
      const T0 = _temp;
      return (
        <T0
          disabled={isSubmitting}
          aria-label={`Toggle ${provider.displayName}`}
          key={provider.providerId}
        />
      );
    });
    $[0] = isSubmitting;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function _temp(t0) {
  const $ = _c(3);
  const { disabled, "aria-label": ariaLabel } = t0;
  let t1;
  if ($[0] !== ariaLabel || $[1] !== disabled) {
    t1 = (
      <div>
        <Switch disabled={disabled} aria-label={ariaLabel} />
      </div>
    );
    $[0] = ariaLabel;
    $[1] = disabled;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented