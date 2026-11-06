
## Input

```javascript
function lower(value) {
  if (value == null) {
    throw new Error('lower: missing value');
  }
  return value.toLowerCase();
}

function upper(value) {
  if (value == null) {
    throw new Error('upper: missing value');
  }
  return value.toUpperCase();
}

function Component({value}) {
  const labels = [];
  switch (value) {
    case null:
      labels.push('empty');
      break;
    case lower(value):
      labels.push('lowercase');
      break;
    case upper(value):
      labels.push('uppercase');
      break;
  }
  return labels;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: null}],
};

```


## Error

```
Found 2 errors:

Todo: (BuildHIR::node.lowerReorderableExpression) Expression type `CallExpression` cannot be safely reordered

error.todo-switch-case-test-call.ts:24:9
  22 |       labels.push('lowercase');
  23 |       break;
> 24 |     case upper(value):
     |          ^^^^^^^^^^^^ (BuildHIR::node.lowerReorderableExpression) Expression type `CallExpression` cannot be safely reordered
  25 |       labels.push('uppercase');
  26 |       break;
  27 |   }

Todo: (BuildHIR::node.lowerReorderableExpression) Expression type `CallExpression` cannot be safely reordered

error.todo-switch-case-test-call.ts:21:9
  19 |       labels.push('empty');
  20 |       break;
> 21 |     case lower(value):
     |          ^^^^^^^^^^^^ (BuildHIR::node.lowerReorderableExpression) Expression type `CallExpression` cannot be safely reordered
  22 |       labels.push('lowercase');
  23 |       break;
  24 |     case upper(value):
```
          
      