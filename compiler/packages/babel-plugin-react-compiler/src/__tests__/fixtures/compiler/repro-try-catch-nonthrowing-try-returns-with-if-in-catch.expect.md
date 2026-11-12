
## Input

```javascript
/**
 * Regression for https://github.com/facebook/react/issues/38141
 *
 * The try returns, so the join after try/catch is reachable only through the
 * catch. An if there means those predecessors are the branch blocks. Once the
 * catch is pruned they are all dead, and the join has to be deleted. Leaving
 * it used to bail out on a missing predecessor; the try's return must survive.
 */
function Component() {
  try {
    return 'from-try';
  } catch (e) {
    if (e) {
      return 'from-catch';
    }
  }
  return 'after';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
/**
 * Regression for https://github.com/facebook/react/issues/38141
 *
 * The try returns, so the join after try/catch is reachable only through the
 * catch. An if there means those predecessors are the branch blocks. Once the
 * catch is pruned they are all dead, and the join has to be deleted. Leaving
 * it used to bail out on a missing predecessor; the try's return must survive.
 */
function Component() {
  return "from-try";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) "from-try"