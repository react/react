// Valid because functions can call functions.
function functionThatStartsWithUseButIsntAHook() {
  if (cond) {
    userFetch();
  }
}
