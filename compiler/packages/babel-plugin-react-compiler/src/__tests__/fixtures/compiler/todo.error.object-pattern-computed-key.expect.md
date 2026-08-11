
## Input

```javascript
import {identity} from 'shared-runtime';

const SCALE = 2;
function Component(props) {
  const {[props.name]: value} = props;
  return value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Sathya'}],
};

```


## Error

```
Found 1 error:

Invariant: [InferMutationAliasingEffects] Expected value kind to be initialized

<unknown> value$3.

todo.error.object-pattern-computed-key.ts:6:9
  4 | function Component(props) {
  5 |   const {[props.name]: value} = props;
> 6 |   return value;
    |          ^^^^^ this is uninitialized
  7 | }
  8 |
  9 | export const FIXTURE_ENTRYPOINT = {
```
          
      