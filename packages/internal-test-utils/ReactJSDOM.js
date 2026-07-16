const JSDOMModule = jest.requireActual('jsdom');

const OriginalJSDOM = JSDOMModule.JSDOM;

module.exports = JSDOMModule;
module.exports.JSDOM = function JSDOM() {
  let result;
  if (new.target) {
    result = Reflect.construct(OriginalJSDOM, arguments);
  } else {
    result = JSDOM.apply(undefined, arguments);
  }

  const {
    setupDocumentReadyState,
    setupCSPNonceHiding,
  } = require('./ReactJSDOMUtils');
  setupDocumentReadyState(result.window.document, result.window.Event);
  setupCSPNonceHiding(result.window.Element);

  return result;
};
