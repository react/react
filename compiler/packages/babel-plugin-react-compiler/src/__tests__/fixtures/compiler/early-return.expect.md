
## Input

```javascript
function MyApp(props) {
  let res;
  if (props.cond) {
    return;
  } else {
    res = 1;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
function MyApp(props) {
  if (props.cond) {
    return;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      