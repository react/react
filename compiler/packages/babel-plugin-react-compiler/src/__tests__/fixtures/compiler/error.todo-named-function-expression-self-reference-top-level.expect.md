
## Input

```javascript
const Component = function Self() {
  return <div onClick={() => consume(Self)} />;
};

```


## Error

```
Found 1 error:

Todo: References to a named function expression from within its own body are not yet supported

error.todo-named-function-expression-self-reference-top-level.ts:2:37
  1 | const Component = function Self() {
> 2 |   return <div onClick={() => consume(Self)} />;
    |                                      ^^^^ References to a named function expression from within its own body are not yet supported
  3 | };
  4 |
```
          
      