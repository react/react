/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('when Trusted Types are available in global object', () => {
  let React;
  let ReactDOMClient;
  let act;
  let assertConsoleErrorDev;
  let container;
  let ttObject1;
  let ttObject2;

  beforeEach(() => {
    jest.resetModules();
    container = document.createElement('div');
    const fakeTTObjects = new Set();
    window.trustedTypes = {
      isHTML: function (value) {
        if (this !== window.trustedTypes) {
          throw new Error(this);
        }
        return fakeTTObjects.has(value);
      },
      isScript: () => false,
      isScriptURL: () => false,
    };
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
    ttObject1 = {
      toString() {
        return '<b>Hi</b>';
      },
    };
    ttObject2 = {
      toString() {
        return '<b>Bye</b>';
      },
    };
    fakeTTObjects.add(ttObject1);
    fakeTTObjects.add(ttObject2);
  });

  afterEach(() => {
    delete window.trustedTypes;
  });

  it('should not stringify trusted values for dangerouslySetInnerHTML', async () => {
    const innerHTMLDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'innerHTML',
    );
    try {
      const innerHTMLCalls = [];
      Object.defineProperty(Element.prototype, 'innerHTML', {
        get() {
          return innerHTMLDescriptor.get.apply(this, arguments);
        },
        set(value) {
          innerHTMLCalls.push(value);
          return innerHTMLDescriptor.set.apply(this, arguments);
        },
      });
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: ttObject1}} />);
      });

      expect(container.innerHTML).toBe('<div><b>Hi</b></div>');
      expect(innerHTMLCalls.length).toBe(1);
      // Ensure it didn't get stringified when passed to a DOM sink:
      expect(innerHTMLCalls[0]).toBe(ttObject1);

      innerHTMLCalls.length = 0;
      await act(() => {
        root.render(<div dangerouslySetInnerHTML={{__html: ttObject2}} />);
      });

      expect(container.innerHTML).toBe('<div><b>Bye</b></div>');
      expect(innerHTMLCalls.length).toBe(1);
      // Ensure it didn't get stringified when passed to a DOM sink:
      expect(innerHTMLCalls[0]).toBe(ttObject2);
    } finally {
      Object.defineProperty(
        Element.prototype,
        'innerHTML',
        innerHTMLDescriptor,
      );
    }
  });

  it('should not stringify trusted values for setAttribute (unknown attribute)', async () => {
    const setAttribute = Element.prototype.setAttribute;
    try {
      const setAttributeCalls = [];
      Element.prototype.setAttribute = function (name, value) {
        setAttributeCalls.push([this, name.toLowerCase(), value]);
        return setAttribute.apply(this, arguments);
      };
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div data-foo={ttObject1} />);
      });

      expect(container.innerHTML).toBe('<div data-foo="<b>Hi</b>"></div>');
      expect(setAttributeCalls.length).toBe(1);
      expect(setAttributeCalls[0][0]).toBe(container.firstChild);
      expect(setAttributeCalls[0][1]).toBe('data-foo');
      // Ensure it didn't get stringified when passed to a DOM sink:
      if (gate('enableTrustedTypesIntegration')) {
        expect(setAttributeCalls[0][2]).toBe(ttObject1);
      } else {
        expect(setAttributeCalls[0][2]).toBe('<b>Hi</b>');
      }

      setAttributeCalls.length = 0;
      await act(() => {
        root.render(<div data-foo={ttObject2} />);
      });

      expect(setAttributeCalls.length).toBe(1);
      expect(setAttributeCalls[0][0]).toBe(container.firstChild);
      expect(setAttributeCalls[0][1]).toBe('data-foo');
      // Ensure it didn't get stringified when passed to a DOM sink:
      if (gate('enableTrustedTypesIntegration')) {
        expect(setAttributeCalls[0][2]).toBe(ttObject2);
      } else {
        expect(setAttributeCalls[0][2]).toBe('<b>Bye</b>');
      }
    } finally {
      Element.prototype.setAttribute = setAttribute;
    }
  });

  it('should not stringify trusted values for setAttribute (known attribute)', async () => {
    const setAttribute = Element.prototype.setAttribute;
    try {
      const setAttributeCalls = [];
      Element.prototype.setAttribute = function (name, value) {
        setAttributeCalls.push([this, name.toLowerCase(), value]);
        return setAttribute.apply(this, arguments);
      };
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div className={ttObject1} />);
      });

      expect(container.innerHTML).toBe('<div class="<b>Hi</b>"></div>');
      expect(setAttributeCalls.length).toBe(1);
      expect(setAttributeCalls[0][0]).toBe(container.firstChild);
      expect(setAttributeCalls[0][1]).toBe('class');
      // Ensure it didn't get stringified when passed to a DOM sink:
      if (gate('enableTrustedTypesIntegration')) {
        expect(setAttributeCalls[0][2]).toBe(ttObject1);
      } else {
        expect(setAttributeCalls[0][2]).toBe('<b>Hi</b>');
      }

      setAttributeCalls.length = 0;
      await act(() => {
        root.render(<div className={ttObject2} />);
      });

      expect(setAttributeCalls.length).toBe(1);
      expect(setAttributeCalls[0][0]).toBe(container.firstChild);
      expect(setAttributeCalls[0][1]).toBe('class');
      // Ensure it didn't get stringified when passed to a DOM sink:
      if (gate('enableTrustedTypesIntegration')) {
        expect(setAttributeCalls[0][2]).toBe(ttObject2);
      } else {
        expect(setAttributeCalls[0][2]).toBe('<b>Bye</b>');
      }
    } finally {
      Element.prototype.setAttribute = setAttribute;
    }
  });

  it('should not stringify trusted values for setAttributeNS', async () => {
    const setAttributeNS = Element.prototype.setAttributeNS;
    try {
      const setAttributeNSCalls = [];
      Element.prototype.setAttributeNS = function (ns, name, value) {
        setAttributeNSCalls.push([this, ns, name, value]);
        return setAttributeNS.apply(this, arguments);
      };
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<svg xlinkHref={ttObject1} />);
      });

      expect(container.innerHTML).toBe('<svg xlink:href="<b>Hi</b>"></svg>');
      expect(setAttributeNSCalls.length).toBe(1);
      expect(setAttributeNSCalls[0][0]).toBe(container.firstChild);
      expect(setAttributeNSCalls[0][1]).toBe('http://www.w3.org/1999/xlink');
      expect(setAttributeNSCalls[0][2]).toBe('xlink:href');
      // Ensure it didn't get stringified when passed to a DOM sink:
      if (gate('enableTrustedTypesIntegration')) {
        expect(setAttributeNSCalls[0][3]).toBe(ttObject1);
      } else {
        expect(setAttributeNSCalls[0][3]).toBe('<b>Hi</b>');
      }

      setAttributeNSCalls.length = 0;
      await act(() => {
        root.render(<svg xlinkHref={ttObject2} />);
      });

      expect(setAttributeNSCalls.length).toBe(1);
      expect(setAttributeNSCalls[0][0]).toBe(container.firstChild);
      expect(setAttributeNSCalls[0][1]).toBe('http://www.w3.org/1999/xlink');
      expect(setAttributeNSCalls[0][2]).toBe('xlink:href');
      // Ensure it didn't get stringified when passed to a DOM sink:
      if (gate('enableTrustedTypesIntegration')) {
        expect(setAttributeNSCalls[0][3]).toBe(ttObject2);
      } else {
        expect(setAttributeNSCalls[0][3]).toBe('<b>Bye</b>');
      }
    } finally {
      Element.prototype.setAttributeNS = setAttributeNS;
    }
  });

  it('should warn once when rendering script tag in jsx on client', async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<script>alert("I am not executed")</script>);
    });
    if (gate('enableTrustedTypesIntegration')) {
      assertConsoleErrorDev([
        'Encountered a script tag while rendering React component. ' +
          'Scripts inside React components are never executed when rendering ' +
          'on the client. Consider using template tag instead ' +
          '(https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).\n' +
          '    in script (at **)',
      ]);
    }

    // check that the warning is printed only once
    await act(() => {
      root.render(<script>alert("I am not executed")</script>);
    });
  });

  it('should not warn when rendering a data block script tag', async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <script type="application/json">{'{"key": "value"}'}</script>,
      );
    });
  });

  it('should not warn when rendering a ld+json script tag', async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <script type="application/ld+json">
          {'{"@context": "https://schema.org"}'}
        </script>,
      );
    });
  });
});
