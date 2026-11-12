
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';

/**
 * Regression test for https://github.com/facebook/react/issues/36902
 *
 * Every instruction inside a `try` block is lowered with its own
 * `maybe-throw` terminal (an edge to the `catch` handler). The optional
 * chain pattern-matching in CollectOptionalChainDependencies didn't
 * previously account for this, so a `user?.access_token` read inside a
 * `try` block failed to be recognized as an optional-chain dependency and
 * was instead widened to a dependency on the whole `user` object, which
 * did not match the manually specified `user?.access_token` dependency.
 */
function useAccessToken({user}) {
  const getAccessTokenSilently = useCallback(() => {
    try {
      console.log(user?.access_token);
    } catch (error) {
      console.error(error);
    }
  }, [user?.access_token]);

  return getAccessTokenSilently;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useAccessToken,
  params: [{user: {access_token: 'abc'}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees
import { useCallback } from "react";

/**
 * Regression test for https://github.com/facebook/react/issues/36902
 *
 * Every instruction inside a `try` block is lowered with its own
 * `maybe-throw` terminal (an edge to the `catch` handler). The optional
 * chain pattern-matching in CollectOptionalChainDependencies didn't
 * previously account for this, so a `user?.access_token` read inside a
 * `try` block failed to be recognized as an optional-chain dependency and
 * was instead widened to a dependency on the whole `user` object, which
 * did not match the manually specified `user?.access_token` dependency.
 */
function useAccessToken(t0) {
  const $ = _c(2);
  const { user } = t0;
  let t1;
  if ($[0] !== user?.access_token) {
    t1 = () => {
      try {
        console.log(user?.access_token);
      } catch (t2) {
        const error = t2;
        console.error(error);
      }
    };
    $[0] = user?.access_token;
    $[1] = t1;
  } else {
    t1 = $[1];
  }

  user?.access_token;
  const getAccessTokenSilently = t1;

  return getAccessTokenSilently;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useAccessToken,
  params: [{ user: { access_token: "abc" } }],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"