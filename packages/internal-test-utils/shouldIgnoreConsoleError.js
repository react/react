'use strict';

module.exports = function shouldIgnoreConsoleError(format, args) {
  if (__DEV__) {
    if (typeof format === 'string') {
      if (format.startsWith('%c%s')) {
        // Looks like a badged error message
        args.splice(0, 3);
      }
      if (
        args[0] != null &&
        ((typeof args[0] === 'object' &&
          typeof args[0].message === 'string' &&
          // This specific log has the same signature as error logging.
          // The trick is to get rid of this whole file.
          !format.includes('Failed to serialize an action') &&
          typeof args[0].stack === 'string') ||
          (typeof args[0] === 'string' &&
            args[0].indexOf('An error occurred in ') === 0))
      ) {
        // This looks like an error with addendum from ReactFiberErrorLogger.
        // They are noisy too so we'll try to ignore them.
        return true;
      }
      if (
        format.indexOf('ReactDOM.render was removed in React 19') !== -1 ||
        format.indexOf('ReactDOM.hydrate was removed in React 19') !== -1 ||
        format.indexOf(
          'ReactDOM.render has not been supported since React 18',
        ) !== -1 ||
        format.indexOf(
          'ReactDOM.hydrate has not been supported since React 18',
        ) !== -1 ||
        format.indexOf('react-test-renderer is deprecated.') !== -1
      ) {
        // We haven't finished migrating our tests to use createRoot.
        return true;
      }
    }
  } else {
    if (
      format != null &&
      typeof format.message === 'string' &&
      typeof format.stack === 'string' &&
      args.length === 0
    ) {
      // In production, ReactFiberErrorLogger logs error objects directly.
      // They are noisy too so we'll try to ignore them.
      return true;
    }
  }
  // Looks legit
  return false;
};
