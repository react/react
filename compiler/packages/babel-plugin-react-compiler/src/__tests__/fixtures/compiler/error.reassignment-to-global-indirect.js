function Component() {
  const foo = () => {
    // Cannot assign to globals
    someUnknownGlobal = true;
    moduleLocal = true;
  };
  foo();
}
