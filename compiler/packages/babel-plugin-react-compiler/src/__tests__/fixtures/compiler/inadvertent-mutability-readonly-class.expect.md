
## Input

```javascript
function Component(props) {
  const env = useRelayEnvironment();
  // Note: this is a class has no mutable methods, ie it always treats `this` as readonly
  const mutator = new Mutator(env);

  useOtherHook();

  // `x` should be independently memoizeable, since foo(x, mutator) cannot mutate
  // the mutator.
  const x = {};
  foo(x, mutator);
  return x;
}

class Mutator {}

```

## Code

```javascript
function Component(props) {
  const env = useRelayEnvironment();

  const mutator = new Mutator(env);

  useOtherHook();

  const x = {};
  foo(x, mutator);
  return x;
}

class Mutator {}

```
      