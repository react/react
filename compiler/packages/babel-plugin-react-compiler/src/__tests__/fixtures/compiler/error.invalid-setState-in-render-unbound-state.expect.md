
## Input

```javascript
function Component(props) {
  // Intentionally don't bind state, this repros a bug where we didn't
  // infer the type of destructured properties after a hole in the array
  let [, setState] = useState();
  setState(1);
  return props.foo;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```


## Error

```
Found 1 error:

Error: Cannot call setState during render

Calling setState during render may trigger an infinite loop.
* To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders
* To derive data from other state/props, compute the derived data during render without using state.

error.invalid-setState-in-render-unbound-state.ts:5:2
  3 |   // infer the type of destructured properties after a hole in the array
  4 |   let [, setState] = useState();
> 5 |   setState(1);
    |   ^^^^^^^^ Found setState() in render
  6 |   return props.foo;
  7 | }
  8 |
```
          
      