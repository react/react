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

  require('./ReactJSDOMUtils').setupDocumentReadyState(
    result.window.document,
    result.window.Event,
  );

  return result;
};
