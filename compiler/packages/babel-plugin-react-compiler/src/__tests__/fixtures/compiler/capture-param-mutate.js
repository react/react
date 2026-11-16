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
