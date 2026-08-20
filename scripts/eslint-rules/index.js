'use strict';

module.exports = {
  rules: {
    'no-primitive-constructors': require('./no-primitive-constructors'),
    'warning-args': require('./warning-args'),
    'prod-error-codes': require('./prod-error-codes'),
    'no-production-logging': require('./no-production-logging'),
    'safe-string-coercion': require('./safe-string-coercion'),
  },
};
