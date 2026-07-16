'use strict';

const {TestEnvironment: JSDOMEnvironment} = require('jest-environment-jsdom');
const {
  setupDocumentReadyState,
  setupCSPNonceHiding,
} = require('internal-test-utils/ReactJSDOMUtils');

/**
 * Test environment for testing integration of react-dom (browser) with react-dom/server (node)
 */
class ReactJSDOMEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);

    setupDocumentReadyState(this.global.document, this.global.Event);
    setupCSPNonceHiding(this.global.Element);
  }
}

module.exports = ReactJSDOMEnvironment;
