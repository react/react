
## Input

```javascript
function Component({a}) {
  return String.raw`\n${a}`;
}

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerExpression) Handle tagged template where cooked value is different from raw value

error.todo-tagged-template-raw-cooked-mismatch.ts:2:9
  1 | function Component({a}) {
> 2 |   return String.raw`\n${a}`;
    |          ^^^^^^^^^^^^^^^^^^ (BuildHIR::lowerExpression) Handle tagged template where cooked value is different from raw value
  3 | }
  4 |
```
          
      