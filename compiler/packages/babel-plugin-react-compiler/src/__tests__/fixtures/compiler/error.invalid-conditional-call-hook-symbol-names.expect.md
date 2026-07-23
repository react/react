
## Input

```javascript
import {use$, use_} from 'shared-runtime';

function Component(props) {
  if (props.cond) {
    use$();
  }
  if (props.otherCond) {
    use_();
  }
  return null;
}

```


## Error

```
Found 2 errors:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-conditional-call-hook-symbol-names.ts:5:4
  3 | function Component(props) {
  4 |   if (props.cond) {
> 5 |     use$();
    |     ^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  6 |   }
  7 |   if (props.otherCond) {
  8 |     use_();

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-conditional-call-hook-symbol-names.ts:8:4
   6 |   }
   7 |   if (props.otherCond) {
>  8 |     use_();
     |     ^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   9 |   }
  10 |   return null;
  11 | }
```
