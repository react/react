/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOMInvalidARIAHook', () => {
  let React;
  let ReactDOMClient;
  let mountComponent;
  let act;
  let assertConsoleErrorDev;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    mountComponent = async function (props) {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div {...props} />);
      });
    };
  });

  describe('aria-* props', () => {
    it('should allow valid aria-* props', async () => {
      await mountComponent({'aria-label': 'Bumble bees'});
    });

    it('should allow new ARIA 1.3 attributes', async () => {
      // Test aria-braillelabel
      await mountComponent({'aria-braillelabel': 'Braille label text'});

      // Test aria-brailleroledescription
      await mountComponent({'aria-brailleroledescription': 'Navigation menu'});

      // Test aria-colindextext
      await mountComponent({'aria-colindextext': 'Column A'});

      // Test aria-rowindextext
      await mountComponent({'aria-rowindextext': 'Row 1'});

      // Test multiple ARIA 1.3 attributes together
      await mountComponent({
        'aria-braillelabel': 'Braille text',
        'aria-colindextext': 'First column',
        'aria-rowindextext': 'First row',
      });
    });
    it('should warn for one invalid aria-* prop', async () => {
      await mountComponent({'aria-badprop': 'maybe'});
      assertConsoleErrorDev([
        'Invalid aria prop `aria-badprop` on <div> tag. ' +
          'For details, see https://react.dev/link/invalid-aria-props\n' +
          '    in div (at **)',
      ]);
    });
    it('should warn for many invalid aria-* props', async () => {
      await mountComponent({
        'aria-badprop': 'Very tall trees',
        'aria-malprop': 'Turbulent seas',
      });
      assertConsoleErrorDev([
        'Invalid aria props `aria-badprop`, `aria-malprop` on <div> ' +
          'tag. For details, see https://react.dev/link/invalid-aria-props\n' +
          '    in div (at **)',
      ]);
    });
    it('should warn for an improperly cased aria-* prop', async () => {
      // The valid attribute name is aria-haspopup.
      await mountComponent({'aria-hasPopup': 'true'});
      assertConsoleErrorDev([
        'Unknown ARIA attribute `aria-hasPopup`. ' +
          'Did you mean `aria-haspopup`?\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn for use of recognized camel case aria attributes', async () => {
      // The valid attribute name is aria-haspopup.
      await mountComponent({ariaHasPopup: 'true'});
      assertConsoleErrorDev([
        'Invalid ARIA attribute `ariaHasPopup`. ' +
          'Did you mean `aria-haspopup`?\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn for use of unrecognized camel case aria attributes', async () => {
      // The valid attribute name is aria-haspopup.
      await mountComponent({ariaSomethingInvalid: 'true'});
      assertConsoleErrorDev([
        'Invalid ARIA attribute `ariaSomethingInvalid`. ARIA ' +
          'attributes follow the pattern aria-* and must be lowercase.\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn when a valid aria-* attribute receives a NaN value', async () => {
      await mountComponent({'aria-valuenow': NaN});
      assertConsoleErrorDev([
        'Received `NaN` for the `aria-valuenow` attribute. If this is expected, cast ' +
          'the value to a string.\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn when a string-type aria-* attribute receives a NaN value', async () => {
      await mountComponent({'aria-label': NaN});
      assertConsoleErrorDev([
        'Received `NaN` for the `aria-label` attribute. If this is expected, cast ' +
          'the value to a string.\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn when a valid aria-* attribute receives an Infinity value', async () => {
      await mountComponent({'aria-valuenow': Infinity});
      assertConsoleErrorDev([
        'Received `Infinity` for the `aria-valuenow` attribute. If this is expected, cast ' +
          'the value to a string.\n' +
          '    in div (at **)',
      ]);
    });

    it('should warn when a valid aria-* attribute receives a -Infinity value', async () => {
      await mountComponent({'aria-valuemin': -Infinity});
      assertConsoleErrorDev([
        'Received `-Infinity` for the `aria-valuemin` attribute. If this is expected, cast ' +
          'the value to a string.\n' +
          '    in div (at **)',
      ]);
    });

    it('should not warn for valid numeric values in aria-* attributes', async () => {
      await mountComponent({'aria-valuenow': 42});
      await mountComponent({'aria-level': 3});
      await mountComponent({'aria-colcount': -1});
    });
  });
});
