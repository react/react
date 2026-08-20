
## Input

```javascript
// Valid because functions can call functions.
function functionThatStartsWithUseButIsntAHook() {
  if (cond) {
    userFetch();
  }
}

```

## Code

```javascript
// Valid because functions can call functions.
function functionThatStartsWithUseButIsntAHook() {
  if (cond) {
    userFetch();
  }
}

```
      