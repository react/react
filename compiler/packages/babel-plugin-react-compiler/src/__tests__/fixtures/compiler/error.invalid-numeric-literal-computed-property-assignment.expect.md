
## Input

```javascript
// Computed property assignment with numeric literals should use
// precise_value() to avoid float precision loss from JSON parsing.

function Component({obj}) {
  obj[0] = 'first';
  obj[1] = 'second';
  return obj;
}

```


## Error

```
Found 2 errors:

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.invalid-numeric-literal-computed-property-assignment.ts:5:2
  3 |
  4 | function Component({obj}) {
> 5 |   obj[0] = 'first';
    |   ^^^ value cannot be modified
  6 |   obj[1] = 'second';
  7 |   return obj;
  8 | }

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.invalid-numeric-literal-computed-property-assignment.ts:6:2
  4 | function Component({obj}) {
  5 |   obj[0] = 'first';
> 6 |   obj[1] = 'second';
    |   ^^^ value cannot be modified
  7 |   return obj;
  8 | }
  9 |
```
          
      