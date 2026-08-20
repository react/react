
## Input

```javascript
import {Stringify} from 'shared-runtime';

function foo() {
  const nt = new.target;
  return <Stringify value={nt} />;
}

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerExpression) Handle MetaProperty expressions other than import.meta

error.todo-new-target-meta-property.ts:4:13
  2 |
  3 | function foo() {
> 4 |   const nt = new.target;
    |              ^^^^^^^^^^ (BuildHIR::lowerExpression) Handle MetaProperty expressions other than import.meta
  5 |   return <Stringify value={nt} />;
  6 | }
  7 |
```
          
      