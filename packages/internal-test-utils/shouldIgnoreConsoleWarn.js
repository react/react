'use strict';

module.exports = function shouldIgnoreConsoleWarn(format) {
  if (
    typeof format === 'string' &&
    format.startsWith(
      'Throwing a Promise to cause it to suspend is deprecated in React',
    )
  ) {
    return true;
  }
  return false;
};
