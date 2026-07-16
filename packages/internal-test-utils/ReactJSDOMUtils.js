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
