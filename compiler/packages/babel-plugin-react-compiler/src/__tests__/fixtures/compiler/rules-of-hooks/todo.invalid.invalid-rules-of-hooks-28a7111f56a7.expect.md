
## Input

```javascript
// @expectNothingCompiled @skip
// Passed but should have failed

// Technically this is a false positive.
// We *could* make it valid (and it used to be).
//
// However, top-level Hook-like calls can be very dangerous
// in environments with inline requires because they can mask
// the runtime error by accident.
// So we prefer to disallow it despite the false positive.

const {createHistory, useBasename} = require('history-2.1.2');
const browserHistory = useBasename(createHistory)({
  basename: '/',
});

```

## Code

```javascript
// @expectNothingCompiled @skip
// Passed but should have failed

// Technically this is a false positive.
// We *could* make it valid (and it used to be).
//
// However, top-level Hook-like calls can be very dangerous
// in environments with inline requires because they can mask
// the runtime error by accident.
// So we prefer to disallow it despite the false positive.

const { createHistory, useBasename } = require("history-2.1.2");
const browserHistory = useBasename(createHistory)({
  basename: "/",
});

```
      