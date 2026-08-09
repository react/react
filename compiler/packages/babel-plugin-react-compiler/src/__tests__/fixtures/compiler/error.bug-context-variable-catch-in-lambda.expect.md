
## Input

```javascript
// @flow
function Foo() {
  try {
    doSomething();
  } catch (e) {
    foo(() => e);
  }
  return <div />;
}

```


## Error

```
Found 1 error:

Invariant: Expected all references to a variable to be consistently local or context references

Identifier <unknown> e$2 is referenced as a context variable, but was previously referenced as a local variable.

  4 |     doSomething();
  5 |   } catch (e) {
> 6 |     foo(() => e);
    |               ^ this is local
  7 |   }
  8 |   return <div />;
  9 | }
```
          
      