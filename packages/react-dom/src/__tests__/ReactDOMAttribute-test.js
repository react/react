/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// Fix JSDOM. setAttribute is supposed to throw on things that can't be implicitly toStringed.
const setAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function (name, value) {
  // eslint-disable-next-line react-internal/safe-string-coercion
  return setAttribute.call(this, name, '' + value);
};

describe('ReactDOM unknown attribute', () => {
  let React;
  let ReactDOMClient;
  let act;
  let assertConsoleErrorDev;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
  });

  async function testUnknownAttributeRemoval(givenValue) {
    const el = document.createElement('div');
    const root = ReactDOMClient.createRoot(el);

    await act(() => {
      root.render(<div unknown="something" />);
    });

    expect(el.firstChild.getAttribute('unknown')).toBe('something');

    await act(() => {
      root.render(<div unknown={givenValue} />);
    });

    expect(el.firstChild.hasAttribute('unknown')).toBe(false);
  }

  async function testUnknownAttributeAssignment(givenValue, expectedDOMValue) {
    const el = document.createElement('div');
    const root = ReactDOMClient.createRoot(el);

    await act(() => {
      root.render(<div unknown="something" />);
    });

    expect(el.firstChild.getAttribute('unknown')).toBe('something');

    await act(() => {
      root.render(<div unknown={givenValue} />);
    });

    expect(el.firstChild.getAttribute('unknown')).toBe(expectedDOMValue);
  }

  describe('unknown attributes', () => {
    it('removes values null and undefined', async () => {
      await testUnknownAttributeRemoval(null);
      await testUnknownAttributeRemoval(undefined);
    });

    it('changes values true, false to null, and also warns once', async () => {
      await testUnknownAttributeAssignment(true, null);
      assertConsoleErrorDev([
        'Received `true` for a non-boolean attribute `unknown`.\n\n' +
          'If you want to write it to the DOM, pass a string instead: ' +
          'unknown="true" or unknown={value.toString()}.\n' +
          '    in div (at **)',
      ]);
      await testUnknownAttributeAssignment(false, null);
    });

    it('removes unknown attributes that were rendered but are now missing', async () => {
      const el = document.createElement('div');
      const root = ReactDOMClient.createRoot(el);

      await act(() => {
        root.render(<div unknown="something" />);
      });

      expect(el.firstChild.getAttribute('unknown')).toBe('something');

      await act(() => {
        root.render(<div />);
      });

      expect(el.firstChild.hasAttribute('unknown')).toBe(false);
    });

    it('removes new boolean props', async () => {
      const el = document.createElement('div');
      const root = ReactDOMClient.createRoot(el);

      await act(() => {
        root.render(<div inert={true} />);
      });

      expect(el.firstChild.getAttribute('inert')).toBe(true ? '' : null);
    });

    it('warns once for empty strings in new boolean props', async () => {
      const el = document.createElement('div');
      const root = ReactDOMClient.createRoot(el);

      await act(() => {
        root.render(<div inert="" />);
      });
      assertConsoleErrorDev([
        'Received an empty string for a boolean attribute `inert`. ' +
          'This will treat the attribute as if it were false. ' +
          'Either pass `false` to silence this warning, or ' +
          'pass `true` if you used an empty string in earlier versions of React to indicate this attribute is true.\n' +
          '    in div (at **)',
      ]);

      expect(el.firstChild.getAttribute('inert')).toBe(true ? null : '');

      // The warning is only printed once.
      await act(() => {
        root.render(<div inert="" />);
      });
    });

    it('passes through strings', async () => {
      await testUnknownAttributeAssignment('a string', 'a string');
    });

    it('coerces numbers to strings', async () => {
      await testUnknownAttributeAssignment(0, '0');
      await testUnknownAttributeAssignment(-1, '-1');
      await testUnknownAttributeAssignment(42, '42');
      await testUnknownAttributeAssignment(9000.99, '9000.99');
    });

    it('coerces NaN to strings and warns', async () => {
      await testUnknownAttributeAssignment(NaN, 'NaN');
      assertConsoleErrorDev([
        'Received NaN for the `unknown` attribute. ' +
          'If this is expected, cast the value to a string.\n' +
          '    in div (at **)',
      ]);
    });

    it('coerces objects to strings and warns', async () => {
      const lol = {
        toString() {
          return 'lol';
        },
      };

      await testUnknownAttributeAssignment({hello: 'world'}, '[object Object]');
      await testUnknownAttributeAssignment(lol, 'lol');
    });

    it('throws with Temporal-like objects', async () => {
      class TemporalLike {
        valueOf() {
          // Throwing here is the behavior of ECMAScript "Temporal" date/time API.
          // See https://tc39.es/proposal-temporal/docs/plaindate.html#valueOf
          throw new TypeError('prod message');
        }
        toString() {
          return '2020-01-01';
        }
      }
      const test = () =>
        testUnknownAttributeAssignment(new TemporalLike(), null);

      await expect(test).rejects.toThrowError(new TypeError('prod message'));
      assertConsoleErrorDev([
        'The provided `unknown` attribute is an unsupported type TemporalLike.' +
          ' This value must be coerced to a string before using it here.\n' +
          '    in div (at **)',
      ]);
    });

    it('removes symbols and warns', async () => {
      await testUnknownAttributeRemoval(Symbol('foo'));
      assertConsoleErrorDev([
        'Invalid value for prop `unknown` on <div> tag. Either remove it ' +
          'from the element, or pass a string or number value to keep it ' +
          'in the DOM. For details, see https://react.dev/link/attribute-behavior \n' +
          '    in div (at **)',
      ]);
    });

    it('removes functions and warns', async () => {
      await testUnknownAttributeRemoval(function someFunction() {});
      assertConsoleErrorDev([
        'Invalid value for prop `unknown` on <div> tag. Either remove ' +
          'it from the element, or pass a string or number value to ' +
          'keep it in the DOM. For details, see ' +
          'https://react.dev/link/attribute-behavior \n' +
          '    in div (at **)',
      ]);
    });

    it('allows camelCase unknown attributes and warns', async () => {
      const el = document.createElement('div');

      const root = ReactDOMClient.createRoot(el);

      await act(() => {
        root.render(<div helloWorld="something" />);
      });
      assertConsoleErrorDev([
        'React does not recognize the `helloWorld` prop on a DOM element. ' +
          'If you intentionally want it to appear in the DOM as a custom ' +
          'attribute, spell it as lowercase `helloworld` instead. ' +
          'If you accidentally passed it from a parent component, remove ' +
          'it from the DOM element.\n' +
          '    in div (at **)',
      ]);

      expect(el.firstChild.getAttribute('helloworld')).toBe('something');
    });
  });
});
