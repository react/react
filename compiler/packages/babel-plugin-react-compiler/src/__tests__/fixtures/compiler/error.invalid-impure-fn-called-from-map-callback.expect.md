
## Input

```javascript
// @validateNoImpureFunctionsInRender
function Component({items}) {
  function format(item) {
    return Date.now() + item.length;
  }
  return (
    <div>
      {items.map(item => (
        <span key={item}>{format(item)}</span>
      ))}
    </div>
  );
}

```


## Error

```
Found 1 error:

Error: Cannot call impure function during render

`Date.now` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

error.invalid-impure-fn-called-from-map-callback.ts:4:11
  2 | function Component({items}) {
  3 |   function format(item) {
> 4 |     return Date.now() + item.length;
    |            ^^^^^^^^^^ Cannot call impure function
  5 |   }
  6 |   return (
  7 |     <div>
```
          
      