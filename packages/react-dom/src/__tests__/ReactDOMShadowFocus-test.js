/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOM shadow root focus restoration', () => {
  let React;
  let ReactDOM;
  let ReactDOMClient;
  let act;
  let host;
  let root;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = null;
  });

  afterEach(async () => {
    if (root !== null) {
      await act(() => root.unmount());
    }
    host.remove();
  });

  function Inputs({reversed}) {
    return (reversed ? ['b', 'a'] : ['a', 'b']).map(key => (
      <input key={key} data-key={key} defaultValue={key + ' text'} />
    ));
  }

  async function expectFocusRestoration(container, focusRoot, portalContainer) {
    root = ReactDOMClient.createRoot(container);
    function App({reversed}) {
      const children = <Inputs reversed={reversed} />;
      return portalContainer
        ? ReactDOM.createPortal(children, portalContainer)
        : children;
    }
    await act(() => root.render(<App reversed={false} />));
    const input = (portalContainer || container).querySelector(
      '[data-key="a"]',
    );
    input.focus();
    input.setSelectionRange(1, 4);
    expect(focusRoot.activeElement).toBe(input);

    await act(() => root.render(<App reversed={true} />));

    expect((portalContainer || container).querySelector('[data-key="a"]')).toBe(
      input,
    );
    expect(focusRoot.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(4);
  }

  it('preserves input focus and selection when reordering in the document', async () => {
    await expectFocusRestoration(host, document);
  });

  it.each(['open', 'closed'])(
    'preserves input focus and selection when reordering in a %s shadow root',
    async mode => {
      const shadow = host.attachShadow({mode});
      await expectFocusRestoration(shadow, shadow);
    },
  );

  it.each(['open', 'closed'])(
    'preserves input focus when the container is an element in a %s shadow root',
    async mode => {
      const shadow = host.attachShadow({mode});
      const container = document.createElement('div');
      shadow.appendChild(container);
      await expectFocusRestoration(container, shadow);
    },
  );

  it('restores focus through nested open shadow roots', async () => {
    const outerShadow = host.attachShadow({mode: 'open'});
    const innerHost = document.createElement('div');
    outerShadow.appendChild(innerHost);
    const innerShadow = innerHost.attachShadow({mode: 'open'});
    const container = document.createElement('div');
    outerShadow.appendChild(container);
    // The root's container is outside the shadow tree holding the inputs.
    await expectFocusRestoration(container, innerShadow, innerShadow);
  });

  it('restores focus in a shadow root belonging to another window', async () => {
    const iframe = document.createElement('iframe');
    host.appendChild(iframe);
    const innerHost = iframe.contentDocument.createElement('div');
    iframe.contentDocument.body.appendChild(innerHost);
    const shadow = innerHost.attachShadow({mode: 'open'});
    await expectFocusRestoration(shadow, shadow);
  });

  it('does not restore focus to an input removed from a shadow root', async () => {
    const shadow = host.attachShadow({mode: 'open'});
    root = ReactDOMClient.createRoot(shadow);
    await act(() => root.render(<input defaultValue="text" />));
    const input = shadow.firstChild;
    input.focus();
    const focus = jest.spyOn(input, 'focus');

    await act(() => root.render(<span>Removed</span>));

    expect(input.isConnected).toBe(false);
    expect(focus).not.toHaveBeenCalled();
    expect(shadow.activeElement).toBe(null);
  });

  it('preserves scroll positions across shadow hosts when restoring focus', async () => {
    const outerShadow = host.attachShadow({mode: 'open'});
    const innerHost = document.createElement('div');
    outerShadow.appendChild(innerHost);
    const innerShadow = innerHost.attachShadow({mode: 'closed'});
    const container = document.createElement('div');
    innerShadow.appendChild(container);
    root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<Inputs reversed={false} />));
    const input = container.firstChild;
    input.focus();
    container.scrollTop = 10;
    container.scrollLeft = 20;
    innerHost.scrollTop = 30;
    innerHost.scrollLeft = 40;
    host.scrollTop = 50;
    host.scrollLeft = 60;

    const originalFocus = input.focus;
    const focus = jest.spyOn(input, 'focus').mockImplementation(() => {
      originalFocus.call(input);
      // JSDOM does not scroll when focusing. Simulate the browser scrolling
      // ancestors on both sides of the shadow boundaries into view.
      container.scrollTop = container.scrollLeft = 100;
      innerHost.scrollTop = innerHost.scrollLeft = 100;
      host.scrollTop = host.scrollLeft = 100;
    });

    await act(() => root.render(<Inputs reversed={true} />));

    expect(focus).toHaveBeenCalledTimes(1);
    expect(innerShadow.activeElement).toBe(input);
    expect(container.scrollTop).toBe(10);
    expect(container.scrollLeft).toBe(20);
    expect(innerHost.scrollTop).toBe(30);
    expect(innerHost.scrollLeft).toBe(40);
    expect(host.scrollTop).toBe(50);
    expect(host.scrollLeft).toBe(60);
  });
});
