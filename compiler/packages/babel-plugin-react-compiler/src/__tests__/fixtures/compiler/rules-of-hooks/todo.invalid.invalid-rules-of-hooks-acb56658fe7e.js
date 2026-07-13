// @expectNothingCompiled @skip
// Passed but should have failed

class C {
  m() {
    This.useHook();
    Super.useHook();
  }
}
