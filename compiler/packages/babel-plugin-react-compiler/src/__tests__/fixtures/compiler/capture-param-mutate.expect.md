
## Input

```javascript
function getNativeLogFunction(level) {
  return function (...args) {
    let str;
    if (args.length === 1 && typeof args[0] === 'string') {
      str = args[0];
    } else {
      str = Array.prototype.map
        .call(args, function (arg) {
          return inspect(arg, {
            depth: 10,
          });
        })
        .join(', ');
    }
    const firstArg = args[0];
    let logLevel = level;
    if (
      typeof firstArg === 'string' &&
      firstArg.slice(0, 9) === 'Warning: ' &&
      logLevel >= LOG_LEVELS.error
    ) {
      logLevel = LOG_LEVELS.warn;
    }
    if (global.__inspectorLog) {
      global.__inspectorLog(
        INSPECTOR_LEVELS[logLevel],
        str,
        [].slice.call(args),
        INSPECTOR_FRAMES_TO_SKIP
      );
    }
    if (groupStack.length) {
      str = groupFormat('', str);
    }
    global.nativeLoggingHook(str, logLevel);
  };
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function getNativeLogFunction(level) {
  const $ = _c(2);
  let t0;
  if ($[0] !== level) {
    t0 = function (...t1) {
      const args = t1;
      let str;
      if (args.length === 1 && typeof args[0] === "string") {
        str = args[0];
      } else {
        str = Array.prototype.map.call(args, _temp).join(", ");
      }

      const firstArg = args[0];
      let logLevel = level;
      if (
        typeof firstArg === "string" &&
        firstArg.slice(0, 9) === "Warning: " &&
        logLevel >= LOG_LEVELS.error
      ) {
        logLevel = LOG_LEVELS.warn;
      }

      if (global.__inspectorLog) {
        global.__inspectorLog(
          INSPECTOR_LEVELS[logLevel],
          str,
          [].slice.call(args),
          INSPECTOR_FRAMES_TO_SKIP,
        );
      }

      if (groupStack.length) {
        str = groupFormat("", str);
      }

      global.nativeLoggingHook(str, logLevel);
    };
    $[0] = level;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function _temp(arg) {
  return inspect(arg, { depth: 10 });
}

```
      