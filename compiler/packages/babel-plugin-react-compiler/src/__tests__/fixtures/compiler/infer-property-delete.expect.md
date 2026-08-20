
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
function Component(props) {
  const x = makeObject();
  const y = delete x.value;
  return y;
}

```

## Code

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
function Component(props) {
  const x = makeObject();
  const y = delete x.value;
  return y;
}

```
      