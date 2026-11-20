/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

let React, createRoot, flushSync, SourcePanel, SourceButton, ViewContext;

beforeEach(() => {
  jest.resetModules();
  jest.useRealTimers();
  jest.doMock('scheduler', () => jest.requireActual('scheduler'));
  jest.doMock('../utils', () => ({
    ...jest.requireActual('../utils'),
    getAlwaysOpenInEditor: () => false,
    getOpenInEditorURL: () => '',
  }));
  jest.doMock('../frontend/utils/withPermissionsCheck', () => ({
    withPermissionsCheck: (_permissions, callback) => callback,
  }));
  jest.doMock('../devtools/views/Button', () => ({children, ...props}) => (
    <button {...props}>{children}</button>
  ));
  jest.doMock('../devtools/views/ButtonIcon', () => () => null);
  React = require('react');
  ({createRoot} = require('react-dom/client'));
  ({flushSync} = require('react-dom'));
  SourcePanel =
    require('../devtools/views/Components/InspectedElementSourcePanel').default;
  SourceButton =
    require('../devtools/views/Components/InspectedElementViewSourceButton').default;
  ViewContext =
    require('../devtools/views/Components/ViewElementSourceContext').default;
});

const url = 'https://example.com/src/Component.tsx';
const raw = ['', url, 114, 14];
const mapped = {location: ['', url, 151, 14], ignored: false};

describe('selected source links after asynchronous mapping', () => {
  let root, container, view;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    view = jest.fn();
  });
  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
  });
  function render(id, result, callback = view) {
    flushSync(() =>
      root.render(
        <ViewContext.Provider
          value={{
            viewElementSourceFunction: callback,
            canViewElementSourceFunction: () => true,
          }}>
          <SourcePanel
            source={raw}
            symbolicatedSource={result}
            elementID={id}
          />
          <SourceButton
            source={raw}
            symbolicatedSource={result}
            elementID={id}
          />
        </ViewContext.Provider>,
      ),
    );
  }
  function clickLink() {
    container
      .querySelector(
        '[data-testname="InspectedElementView-FormattedSourceString"] span',
      )
      .click();
  }
  it('forwards component identity and mapped location from the source hyperlink', () => {
    render(17, null);
    clickLink();
    expect(view).toHaveBeenLastCalledWith(raw, null, 17);
    render(17, mapped);
    clickLink();
    expect(view).toHaveBeenLastCalledWith(raw, mapped.location, 17);
    expect(container.textContent).toContain('Component.tsx:151');
  });
  it('forwards identity from the toolbar source button as well', () => {
    render(17, mapped);
    container
      .querySelector('button[title="View source for this element"]')
      .click();
    expect(view).toHaveBeenLastCalledWith(raw, mapped.location, 17);
  });
  it('uses the current selected identity when the source location is cached', () => {
    render(17, mapped);
    render(18, mapped);
    clickLink();
    expect(view).toHaveBeenLastCalledWith(raw, mapped.location, 18);
  });
  it('uses the current opening callback after a frontend reconnect', () => {
    render(17, mapped);
    const reconnected = jest.fn();
    render(17, mapped, reconnected);
    clickLink();
    expect(reconnected).toHaveBeenCalledWith(raw, mapped.location, 17);
    expect(view).not.toHaveBeenCalled();
  });
});

describe('toolbar source identity', () => {
  const getSource =
    require('../devtools/views/Components/getInspectedElementSource').default;
  it('keeps an actual component definition associated with its component', () => {
    expect(
      getSource({
        id: 17,
        source: raw,
        stack: [['creator', 'another.js', 20, 4]],
      }),
    ).toEqual({source: raw, elementID: 17});
  });
  it('does not identify a creation-stack frame as the selected component definition', () => {
    expect(getSource({id: 17, source: null, stack: [raw]})).toEqual({
      source: raw,
      elementID: null,
    });
  });
  it('keeps the source link disabled without a definition or creation frame', () => {
    expect(getSource({id: 17, source: null, stack: []})).toEqual({
      source: null,
      elementID: null,
    });
    expect(getSource(null)).toEqual({source: null, elementID: null});
  });
});
