/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOMCustomElementHydration', () => {
  let React;
  let ReactDOM;
  let ReactDOMClient;
  let ReactDOMServer;
  let act;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('custom element event listener hydration', () => {
    it('should attach custom element event listeners during hydration', async () => {
      const container = document.createElement('div');
      const myEventHandler = jest.fn();

      // Mock custom element class
      class CustomElement extends HTMLElement {}
      customElements.define('ce-event-test', CustomElement);

      // Server-side render
      const serverHTML = ReactDOMServer.renderToString(
        <ce-event-test onmy-event={myEventHandler} />,
      );

      // Inject markup
      container.innerHTML = serverHTML;
      const customElement = container.querySelector('ce-event-test');

      // Try to dispatch custom event before hydration (should not fire)
      customElement.dispatchEvent(new CustomEvent('my-event'));
      expect(myEventHandler).not.toHaveBeenCalled();

      // Hydrate with event handler
      await act(async () => {
        ReactDOMClient.hydrateRoot(
          container,
          <ce-event-test onmy-event={myEventHandler} />,
        );
      });

      // Dispatch event after hydration
      customElement.dispatchEvent(new CustomEvent('my-event'));

      // Event handler should be attached during hydration
      expect(myEventHandler).toHaveBeenCalledTimes(1);
    });

    it('should attach multiple custom event listeners during hydration', async () => {
      const container = document.createElement('div');
      const moduleLoadedHandler = jest.fn();
      const moduleErrorHandler = jest.fn();
      const moduleUpdatedHandler = jest.fn();

      class CustomElement extends HTMLElement {}
      customElements.define('ce-multi-event', CustomElement);

      // Server-side render
      const serverHTML = ReactDOMServer.renderToString(
        <ce-multi-event
          onmodule-loaded={moduleLoadedHandler}
          onmodule-error={moduleErrorHandler}
          onmodule-updated={moduleUpdatedHandler}
        />,
      );

      container.innerHTML = serverHTML;
      const customElement = container.querySelector('ce-multi-event');

      // Hydrate with event handlers
      await act(async () => {
        ReactDOMClient.hydrateRoot(
          container,
          <ce-multi-event
            onmodule-loaded={moduleLoadedHandler}
            onmodule-error={moduleErrorHandler}
            onmodule-updated={moduleUpdatedHandler}
          />,
        );
      });

      customElement.dispatchEvent(new CustomEvent('module-loaded'));
      customElement.dispatchEvent(new CustomEvent('module-error'));
      customElement.dispatchEvent(new CustomEvent('module-updated'));

      expect(moduleLoadedHandler).toHaveBeenCalledTimes(1);
      expect(moduleErrorHandler).toHaveBeenCalledTimes(1);
      expect(moduleUpdatedHandler).toHaveBeenCalledTimes(1);
    });

    it('should hydrate primitive prop types on custom elements', async () => {
      const container = document.createElement('div');

      class CustomElementWithProps extends HTMLElement {}
      customElements.define('ce-primitive-props', CustomElementWithProps);

      // Server-side render with primitive props
      const serverHTML = ReactDOMServer.renderToString(
        <ce-primitive-props
          stringValue="test"
          numberValue={42}
          trueProp={true}
        />,
      );

      container.innerHTML = serverHTML;
      const customElement = container.querySelector('ce-primitive-props');

      // Hydrate
      await act(async () => {
        ReactDOMClient.hydrateRoot(
          container,
          <ce-primitive-props
            stringValue="test"
            numberValue={42}
            trueProp={true}
          />,
        );
      });

      // After hydration, primitive attributes should be present
      expect(customElement.hasAttribute('stringValue')).toBe(true);
      expect(customElement.getAttribute('stringValue')).toBe('test');
      expect(customElement.hasAttribute('numberValue')).toBe(true);
      expect(customElement.getAttribute('numberValue')).toBe('42');
      expect(customElement.hasAttribute('trueProp')).toBe(true);
    });

    it('should not set non-primitive props as attributes during SSR', async () => {
      // Server-side render with non-primitive props
      const serverHTML = ReactDOMServer.renderToString(
        <ce-advanced-props
          objectProp={{key: 'value'}}
          functionProp={() => {}}
          falseProp={false}
        />,
      );

      // Non-primitive values should not appear as attributes in server HTML
      expect(serverHTML).not.toContain('objectProp');
      expect(serverHTML).not.toContain('functionProp');
      expect(serverHTML).not.toContain('falseProp');
    });

    it('should handle updating custom element event listeners after hydration', async () => {
      const container = document.createElement('div');
      const initialHandler = jest.fn();
      const updatedHandler = jest.fn();

      class CustomElementForUpdate extends HTMLElement {}
      customElements.define('ce-update-test', CustomElementForUpdate);

      // Server-side render with initial event handler
      const serverHTML = ReactDOMServer.renderToString(
        <ce-update-test onmyevent={initialHandler} />,
      );

      container.innerHTML = serverHTML;
      const customElement = container.querySelector('ce-update-test');

      // Hydrate
      let root;
      await act(async () => {
        root = ReactDOMClient.hydrateRoot(
          container,
          <ce-update-test onmyevent={initialHandler} />,
        );
      });

      customElement.dispatchEvent(new CustomEvent('myevent'));
      expect(initialHandler).toHaveBeenCalledTimes(1);

      // Update the event handler
      await act(async () => {
        root.render(<ce-update-test onmyevent={updatedHandler} />);
      });

      customElement.dispatchEvent(new CustomEvent('myevent'));

      // The updated handler should be called, not the initial one
      expect(updatedHandler).toHaveBeenCalledTimes(1);
      expect(initialHandler).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should handle custom element registered after hydration', async () => {
      const container = document.createElement('div');
      const myEventHandler = jest.fn();

      // Server-side render with event handler for element not yet registered
      const serverHTML = ReactDOMServer.renderToString(
        <ce-registered-after-hydration onmy-event={myEventHandler} />,
      );

      container.innerHTML = serverHTML;
      const customElement = container.querySelector(
        'ce-registered-after-hydration',
      );

      // Hydrate - the element is not yet registered
      // Event listeners should still be attached
      await act(async () => {
        ReactDOMClient.hydrateRoot(
          container,
          <ce-registered-after-hydration onmy-event={myEventHandler} />,
        );
      });

      // Register the element after hydration
      class CustomElementRegisteredAfterHydration extends HTMLElement {}
      customElements.define(
        'ce-registered-after-hydration',
        CustomElementRegisteredAfterHydration,
      );

      // Dispatch event after registration
      customElement.dispatchEvent(new CustomEvent('my-event'));

      // Event listener should work even if element wasn't registered during hydration
      expect(myEventHandler).toHaveBeenCalledTimes(1);
    });

    it('should properly hydrate custom elements with mixed props', async () => {
      const container = document.createElement('div');
      const myEventHandler = jest.fn();

      class MixedPropsElement extends HTMLElement {}
      customElements.define('ce-mixed-props', MixedPropsElement);

      // Server-side render with mixed prop types
      const serverHTML = ReactDOMServer.renderToString(
        <ce-mixed-props
          stringAttr="value"
          numberAttr={123}
          onmyevent={myEventHandler}
          className="custom-class"
        />,
      );

      container.innerHTML = serverHTML;
      const customElement = container.querySelector('ce-mixed-props');

      // Hydrate
      await act(async () => {
        ReactDOMClient.hydrateRoot(
          container,
          <ce-mixed-props
            stringAttr="value"
            numberAttr={123}
            onmyevent={myEventHandler}
            className="custom-class"
          />,
        );
      });

      customElement.dispatchEvent(new CustomEvent('myevent'));

      // Event should be fired
      expect(myEventHandler).toHaveBeenCalledTimes(1);
      // Attributes should be present
      expect(customElement.hasAttribute('stringAttr')).toBe(true);
      expect(customElement.getAttribute('stringAttr')).toBe('value');
      expect(customElement.hasAttribute('numberAttr')).toBe(true);
      expect(customElement.getAttribute('numberAttr')).toBe('123');
      expect(customElement.hasAttribute('class')).toBe(true);
      expect(customElement.getAttribute('class')).toBe('custom-class');
    });

    it('should remove custom element event listeners when prop is removed', async () => {
      const container = document.createElement('div');
      const myEventHandler = jest.fn();

      class CustomElementRemovalTest extends HTMLElement {}
      customElements.define('ce-removal-test', CustomElementRemovalTest);

      // Server-side render with event handler
      const serverHTML = ReactDOMServer.renderToString(
        <ce-removal-test onmyevent={myEventHandler} />,
      );

      container.innerHTML = serverHTML;
      const customElement = container.querySelector('ce-removal-test');

      // Hydrate
      let root;
      await act(async () => {
        root = ReactDOMClient.hydrateRoot(
          container,
          <ce-removal-test onmyevent={myEventHandler} />,
        );
      });

      // Remove the event handler
      await act(async () => {
        root.render(<ce-removal-test />);
      });

      customElement.dispatchEvent(new CustomEvent('myevent'));

      // Event should not fire after handler removal
      expect(myEventHandler).not.toHaveBeenCalled();
    });
  });

  describe('custom element property hydration', () => {
    it('should handle custom properties during hydration when element is defined', async () => {
      const container = document.createElement('div');

      // Create and register a custom element with a writable property
      class CustomElementWithProperty extends HTMLElement {
        constructor() {
          super();
          this._internalValue = 'unset';
        }

        set customProperty(value) {
          this._internalValue = value;
        }

        get customProperty() {
          return this._internalValue;
        }
      }
      customElements.define('ce-with-property', CustomElementWithProperty);

      // Server-side render (attribute emitted; property applied during hydration)
      const serverHTML = ReactDOMServer.renderToString(
        <ce-with-property data-attr="test" customProperty="hydrated-value" />,
      );

      container.innerHTML = serverHTML;
      const customElement = container.querySelector('ce-with-property');

      // Before hydration, the attribute exists but the property is still default
      expect(customElement.getAttribute('customProperty')).toBe('hydrated-value');
      expect(customElement.customProperty).toBe('unset');

      // Hydrate and apply the custom property
      await act(async () => {
        ReactDOMClient.hydrateRoot(
          container,
          <ce-with-property
            data-attr="test"
            customProperty="hydrated-value"
          />,
        );
      });

      // Verify hydration applied both attributes and property setter
      expect(customElement.getAttribute('data-attr')).toBe('test');
      expect(customElement.getAttribute('customProperty')).toBe(
        'hydrated-value',
      );
      expect(customElement.customProperty).toBe('hydrated-value');
      expect(customElement._internalValue).toBe('hydrated-value');
    });
  });
});
