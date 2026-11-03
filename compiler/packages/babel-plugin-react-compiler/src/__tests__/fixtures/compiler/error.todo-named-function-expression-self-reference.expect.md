
## Input

```javascript
// Regression for #37058: passing a named function's self-reference to a call.
export function MyComponent() {
  return (
    <HelloWorld
      onClick={() => {
        foo(function bar() {
          if (Math.random() > 0.5) {
            baz();
          } else {
            qux(bar);
          }
        });
      }}
    />
  );
}

```


## Error

```
Found 1 error:

Todo: References to a named function expression from within its own body are not yet supported

error.todo-named-function-expression-self-reference.ts:10:16
   8 |             baz();
   9 |           } else {
> 10 |             qux(bar);
     |                 ^^^ References to a named function expression from within its own body are not yet supported
  11 |           }
  12 |         });
  13 |       }}
```
          
      