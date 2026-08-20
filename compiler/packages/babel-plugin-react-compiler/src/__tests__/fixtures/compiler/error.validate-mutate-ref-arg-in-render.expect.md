
## Input

```javascript
// @validateRefAccessDuringRender:true
import {mutate} from 'shared-runtime';

function Foo(props, ref) {
  mutate(ref.current);
  return <div>{props.bar}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{bar: 'foo'}, {ref: {cuurrent: 1}}],
  isComponent: true,
};

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.validate-mutate-ref-arg-in-render.ts:5:9
  3 |
  4 | function Foo(props, ref) {
> 5 |   mutate(ref.current);
    |          ^^^^^^^^^^^ Passing a ref to a function may read its value during render
  6 |   return <div>{props.bar}</div>;
  7 | }
  8 |
```
          
      