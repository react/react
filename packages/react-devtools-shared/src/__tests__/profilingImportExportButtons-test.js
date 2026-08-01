/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

jest.mock('react-devtools-shared/src/devtools/views/Button', () => {
  return function Button({children, ...props}) {
    return require('react').createElement('button', props, children);
  };
});

jest.mock('react-devtools-shared/src/devtools/views/ButtonIcon', () => {
  return function ButtonIcon() {
    return null;
  };
});

describe('ProfilingImportExportButtons', () => {
  let React;
  let ReactDOMClient;
  let ProfilingImportExportButtons;
  let ModalDialogContext;
  let ProfilerContext;
  let StoreContext;
  let TimelineContext;
  let container;
  let root;
  let utils;
  let originalFileReader;

  beforeEach(() => {
    utils = require('./utils');
    utils.beforeEachProfiling();

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ProfilingImportExportButtons =
      require('react-devtools-shared/src/devtools/views/Profiler/ProfilingImportExportButtons').default;
    ModalDialogContext =
      require('react-devtools-shared/src/devtools/views/ModalDialog').ModalDialogContext;
    ProfilerContext =
      require('react-devtools-shared/src/devtools/views/Profiler/ProfilerContext').ProfilerContext;
    StoreContext =
      require('react-devtools-shared/src/devtools/views/context').StoreContext;
    TimelineContext =
      require('react-devtools-timeline/src/TimelineContext').TimelineContext;

    originalFileReader = global.FileReader;
    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
  });

  afterEach(() => {
    utils.act(() => root.unmount());
    global.FileReader = originalFileReader;
  });

  it('shows an import error when the selected file cannot be read', () => {
    let fileReader;

    class MockFileReader {
      error = new DOMException('The selected file could not be read.');
      listeners = {};

      constructor() {
        fileReader = this;
      }

      addEventListener(type, listener) {
        this.listeners[type] = listener;
      }

      readAsText() {}

      triggerError() {
        const listener = this.listeners.error;
        if (listener) {
          listener();
        }
      }
    }

    global.FileReader = MockFileReader;

    const modalDialogDispatch = jest.fn();
    const setFile = jest.fn();

    utils.act(() => {
      root.render(
        <StoreContext.Provider value={global.store}>
          <ProfilerContext.Provider
            value={
              ({isProfiling: false, profilingData: null, rootID: null}: any)
            }>
            <TimelineContext.Provider value={({setFile}: any)}>
              <ModalDialogContext.Provider
                value={({dialogs: [], dispatch: modalDialogDispatch}: any)}>
                <ProfilingImportExportButtons />
              </ModalDialogContext.Provider>
            </TimelineContext.Provider>
          </ProfilerContext.Provider>
        </StoreContext.Provider>,
      );
    });

    const input = container.querySelector('input[type="file"]');
    const file = new File(['profile'], 'profile.json', {
      type: 'application/json',
    });
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    });

    utils.act(() => {
      input.dispatchEvent(new Event('change', {bubbles: true}));
    });
    utils.act(() => fileReader.triggerError());

    expect(modalDialogDispatch).toHaveBeenCalledTimes(1);
    expect(modalDialogDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ProfilingImportExportButtons',
        type: 'SHOW',
        title: 'Import failed',
      }),
    );
  });
});
