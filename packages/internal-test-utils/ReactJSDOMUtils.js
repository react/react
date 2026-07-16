export function setupDocumentReadyState(
  document: Document,
  Event: typeof Event,
) {
  let readyState: 0 | 1 | 2 = 0;
  Object.defineProperty(document, 'readyState', {
    get() {
      switch (readyState) {
        case 0:
          return 'loading';
        case 1:
          return 'interactive';
        case 2:
          return 'complete';
      }
    },
    set(value) {
      if (value === 'interactive' && readyState < 1) {
        readyState = 1;
        document.dispatchEvent(new Event('readystatechange'));
      } else if (value === 'complete' && readyState < 2) {
        readyState = 2;
        document.dispatchEvent(new Event('readystatechange'));
        document.dispatchEvent(new Event('DOMContentLoaded'));
      } else if (value === 'loading') {
        // We allow resetting the readyState to loading mostly for pragamtism.
        // tests that use this environment don't reset the document between tests.
        readyState = 0;
      }
    },
    configurable: true,
  });
}

/**
 * When CSP is enabled, browsers hide the nonce content attribute for security
 * (getAttribute("nonce") returns "") while the .nonce IDL property remains
 * accessible. JSDOM does not implement this, so we simulate it.
 * https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cryptographicnonce
 */
export function setupCSPNonceHiding(Element: typeof Element) {
  const originalGetAttribute = Element.prototype.getAttribute;
  Element.prototype.getAttribute = function (name: string) {
    if (
      (Element: any)._hideNonceAttribute &&
      typeof name === 'string' &&
      name.toLowerCase() === 'nonce'
    ) {
      return '';
    }
    return originalGetAttribute.call(this, name);
  };
}

export function setHideNonceAttribute(enabled: boolean) {
  const ElementCtor =
    typeof window !== 'undefined' ? window.Element : global.Element;
  (ElementCtor: any)._hideNonceAttribute = enabled;
}
