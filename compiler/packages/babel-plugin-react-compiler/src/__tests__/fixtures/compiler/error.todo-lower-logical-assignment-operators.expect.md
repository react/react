
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({value}) {
  let nullish = value;
  nullish ??= 'fallback';
  let and = value;
  and &&= 'replaced';
  let or = value;
  or ||= 'default';
  return <Stringify nullish={nullish} and={and} or={or} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: null}],
};

```


## Error

```
Found 3 errors:

Todo: (BuildHIR::lowerExpression) Handle ??= operators in AssignmentExpression

error.todo-lower-logical-assignment-operators.ts:5:2
  3 | function Component({value}) {
  4 |   let nullish = value;
> 5 |   nullish ??= 'fallback';
    |   ^^^^^^^^^^^^^^^^^^^^^^ (BuildHIR::lowerExpression) Handle ??= operators in AssignmentExpression
  6 |   let and = value;
  7 |   and &&= 'replaced';
  8 |   let or = value;

Todo: (BuildHIR::lowerExpression) Handle &&= operators in AssignmentExpression

error.todo-lower-logical-assignment-operators.ts:7:2
   5 |   nullish ??= 'fallback';
   6 |   let and = value;
>  7 |   and &&= 'replaced';
     |   ^^^^^^^^^^^^^^^^^^ (BuildHIR::lowerExpression) Handle &&= operators in AssignmentExpression
   8 |   let or = value;
   9 |   or ||= 'default';
  10 |   return <Stringify nullish={nullish} and={and} or={or} />;

Todo: (BuildHIR::lowerExpression) Handle ||= operators in AssignmentExpression

error.todo-lower-logical-assignment-operators.ts:9:2
   7 |   and &&= 'replaced';
   8 |   let or = value;
>  9 |   or ||= 'default';
     |   ^^^^^^^^^^^^^^^^ (BuildHIR::lowerExpression) Handle ||= operators in AssignmentExpression
  10 |   return <Stringify nullish={nullish} and={and} or={or} />;
  11 | }
  12 |
```
          
      