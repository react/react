/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type EvalScriptIds =
  | 'checkIfReactPresentInInspectedWindow'
  | 'reload'
  | 'setBrowserSelectionFromReact'
  | 'setReactSelectionFromBrowser'
  | 'viewAttributeSource'
  | 'viewElementSource';

/*
 .fn for fallback in Content Script context
 .code for chrome.devtools.inspectedWindow.eval()
*/
type EvalScriptEntry = {
  fn: (...args: any[]) => any,
  code: (...args: any[]) => string,
};

/*
  Can not access `Developer Tools Console API` (e.g., inspect(), $0) in this context.
  So some fallback functions are no-op or throw error.
*/
export const evalScripts: {[key: EvalScriptIds]: EvalScriptEntry} = {
  checkIfReactPresentInInspectedWindow: {
    fn: () =>
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ &&
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.size > 0,
    code: () =>
      'window.__REACT_DEVTOOLS_GLOBAL_HOOK__ &&' +
      'window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.size > 0',
  },
  reload: {
    fn: () => window.location.reload(),
    code: () => 'window.location.reload();',
  },
  setBrowserSelectionFromReact: {
    fn: () => {
      throw new Error('Not supported in fallback eval context');
    },
    code: () =>
      '(window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0 !== $0) ?' +
      '(inspect(window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0), true) :' +
      'false',
  },
  setReactSelectionFromBrowser: {
    fn: () => {
      throw new Error('Not supported in fallback eval context');
    },
    code: () =>
      '(window.__REACT_DEVTOOLS_GLOBAL_HOOK__ && window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0 !== $0) ?' +
      '(window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0 = $0, true) :' +
      'false',
  },
  viewAttributeSource: {
    fn: ({rendererID, elementID, path}) => {
      return false; // Not supported in fallback eval context
    },
    code: ({rendererID, elementID, path}) =>
      '{' + // The outer block is important because it means we can declare local variables.
      'const renderer = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.rendererInterfaces.get(' +
      JSON.stringify(rendererID) +
      ');' +
      'if (renderer) {' +
      '  const value = renderer.getElementAttributeByPath(' +
      JSON.stringify(elementID) +
      ',' +
      JSON.stringify(path) +
      ');' +
      '  if (value) {' +
      '    inspect(value);' +
      '    true;' +
      '  } else {' +
      '    false;' +
      '  }' +
      '} else {' +
      '  false;' +
      '}' +
      '}',
  },
  viewElementSource: {
    fn: ({rendererID, elementID}) => {
      return false; // Not supported in fallback eval context
    },
    code: ({rendererID, elementID}) =>
      '{' + // The outer block is important because it means we can declare local variables.
      'const renderer = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.rendererInterfaces.get(' +
      JSON.stringify(rendererID) +
      ');' +
      'if (renderer) {' +
      '  const value = renderer.getElementSourceFunctionById(' +
      JSON.stringify(elementID) +
      ');' +
      '  if (value) {' +
      '    inspect(value);' +
      '    true;' +
      '  } else {' +
      '    false;' +
      '  }' +
      '} else {' +
      '  false;' +
      '}' +
      '}',
  },
};
