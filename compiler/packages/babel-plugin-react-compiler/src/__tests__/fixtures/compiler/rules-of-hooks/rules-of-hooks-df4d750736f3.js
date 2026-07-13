// @expectNothingCompiled
// Valid because they're not matching use[A-Z].
fooState();
_use();
_useState();
use_hook();
// also valid because it's not matching the PascalCase namespace
jest.useFakeTimer();
