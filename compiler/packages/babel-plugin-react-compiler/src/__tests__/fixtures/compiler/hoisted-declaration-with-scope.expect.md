
## Input

```javascript
import {StaticText1, Stringify, identity, useHook} from 'shared-runtime';

/**
 * `button` and `dispatcher` must end up in the same memo block. It would be
 * invalid for `button` to take a dependency on `dispatcher` as dispatcher
 * is created later.
 */
function useFoo({onClose}) {
  const button = StaticText1 ?? (
    <Stringify
      primary={{
        label: identity('label'),
        onPress: onClose,
      }}
      secondary={{
        onPress: () => {
          dispatcher.go('route2');
        },
      }}
    />
  );

  const dispatcher = useHook();

  return button;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{onClose: identity()}],
};

```

## Code

```javascript
import { StaticText1, Stringify, identity, useHook } from "shared-runtime";

/**
 * `button` and `dispatcher` must end up in the same memo block. It would be
 * invalid for `button` to take a dependency on `dispatcher` as dispatcher
 * is created later.
 */
function useFoo(t0) {
  const { onClose } = t0;
  const button = StaticText1 ?? (
    <Stringify
      primary={{ label: identity("label"), onPress: onClose }}
      secondary={{
        onPress: () => {
          dispatcher.go("route2");
        },
      }}
    />
  );

  const dispatcher = useHook();

  return button;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ onClose: identity() }],
};

```
      
### Eval output
(kind: ok) "[[ function params=1 ]]"