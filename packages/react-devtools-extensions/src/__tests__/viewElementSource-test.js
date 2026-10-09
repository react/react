/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

jest.mock('../main/evalInInspectedWindow', () => ({
  evalInInspectedWindow: jest.fn(),
}));

const {evalInInspectedWindow} = require('../main/evalInInspectedWindow');
const {createViewElementSource} = require('../main/viewElementSource');
const url = 'https://example.com/src/Component.tsx';
const raw = ['DictItemLabelGroupRender', url, 114, 14];
const mapped = ['', url, 151, 14];

describe('Chrome source links with identical generated and original URLs', () => {
  let openResource, getRenderer, view;
  beforeEach(() => {
    jest.clearAllMocks();
    openResource = jest.fn();
    global.chrome = {devtools: {panels: {openResource}}};
    getRenderer = jest.fn(() => 2);
    view = createViewElementSource(getRenderer);
  });
  afterEach(() => {
    delete global.chrome;
  });
  it('inspects the selected component function to let Chrome choose the original TSX', () => {
    view(raw, mapped, 17);
    expect(evalInInspectedWindow).toHaveBeenCalledWith(
      'viewElementSource',
      [{rendererID: 2, elementID: 17}],
      expect.any(Function),
    );
    evalInInspectedWindow.mock.calls[0][2](true, null);
    expect(openResource).not.toHaveBeenCalled();
  });
  it('falls back to generated coordinates if the selected function is unavailable', () => {
    view(raw, mapped, 17);
    evalInInspectedWindow.mock.calls[0][2](false, null);
    expect(openResource).toHaveBeenCalledWith(url, 113, 13);
  });
  it('falls back after an eval failure without opening compiled code at a TSX line', () => {
    view(raw, mapped, 17);
    evalInInspectedWindow.mock.calls[0][2](null, {isError: true});
    expect(openResource).toHaveBeenCalledWith(url, 113, 13);
  });
  it('uses generated coordinates for a stack frame without a component identity', () => {
    view(raw, mapped);
    expect(openResource).toHaveBeenCalledWith(url, 113, 13);
    expect(evalInInspectedWindow).not.toHaveBeenCalled();
  });
  it('uses generated coordinates if the component has unmounted', () => {
    getRenderer.mockReturnValue(null);
    view(raw, mapped, 17);
    expect(openResource).toHaveBeenCalledWith(url, 113, 13);
    expect(evalInInspectedWindow).not.toHaveBeenCalled();
  });
  it('opens a distinct original URL at mapped coordinates', () => {
    const originalURL = 'webpack://app/src/Component.tsx';
    view(raw, ['', originalURL, 151, 14], 17);
    expect(openResource).toHaveBeenCalledWith(originalURL, 150, 13);
    expect(evalInInspectedWindow).not.toHaveBeenCalled();
  });
  it('opens an unmapped location at its original coordinates', () => {
    view(raw, null, 17);
    expect(openResource).toHaveBeenCalledWith(url, 113, 13);
  });
  it('compares normalized URLs for a generated/original collision', () => {
    view(
      ['', 'https://example.com:443/src/Component.tsx', 114, 14],
      mapped,
      17,
    );
    expect(evalInInspectedWindow).toHaveBeenCalledTimes(1);
    expect(openResource).not.toHaveBeenCalled();
  });
});

describe('native function inspection eval script', () => {
  const {evalScripts} = require('../evalScripts');
  const {runInNewContext} = require('vm');
  function inspectValue(value) {
    const inspect = jest.fn();
    const result = runInNewContext(
      evalScripts.viewElementSource.code({rendererID: 2, elementID: 17}),
      {
        window: {
          __REACT_DEVTOOLS_GLOBAL_HOOK__: {
            rendererInterfaces: new Map([
              [2, {getElementSourceFunctionById: () => value}],
            ]),
          },
        },
        inspect,
      },
    );
    return {result, inspect};
  }
  it('only reports success when inspecting a real component function', () => {
    const fn = () => null;
    const {result, inspect} = inspectValue(fn);
    expect(result).toBe(true);
    expect(inspect).toHaveBeenCalledWith(fn);
  });
  it('rejects a memo/forwardRef wrapper object so generated source fallback can run', () => {
    const {result, inspect} = inspectValue({render: () => null});
    expect(result).toBe(false);
    expect(inspect).not.toHaveBeenCalled();
  });
});
