/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

'use strict';

const ReactDOMServerIntegrationUtils = require('./utils/ReactDOMServerIntegrationTestUtils');

let React;
let ReactDOMClient;
let ReactDOMServer;

function initModules() {
  // Reset warning cache.
  jest.resetModules();
  React = require('react');
  ReactDOMClient = require('react-dom/client');
  ReactDOMServer = require('react-dom/server');

  // Make them available to the helpers.
  return {
    ReactDOMClient,
    ReactDOMServer,
  };
}

const {resetModules, itRenders, itThrowsWhenRendering} =
  ReactDOMServerIntegrationUtils(initModules);

describe('ReactDOMServerIntegrationSelect', () => {
  let options;
  beforeEach(() => {
    resetModules();

    options = [
      <option key={1} value="foo" id="foo">
        Foo
      </option>,
      <option key={2} value="bar" id="bar">
        Bar
      </option>,
      <option key={3} value="baz" id="baz">
        Baz
      </option>,
    ];
  });

  // a helper function to test the selected value of a <select> element.
  // takes in a <select> DOM element (element) and a value or array of
  // values that should be selected (selected).
  const expectSelectValue = (element, selected) => {
    if (!Array.isArray(selected)) {
      selected = [selected];
    }
    // the select DOM element shouldn't ever have a value or defaultValue
    // attribute; that is not how select values are expressed in the DOM.
    expect(element.getAttribute('value')).toBe(null);
    expect(element.getAttribute('defaultValue')).toBe(null);

    ['foo', 'bar', 'baz'].forEach(value => {
      const expectedValue = selected.indexOf(value) !== -1;
      const option = element.querySelector(`#${value}`);
      expect(option.selected).toBe(expectedValue);
    });
  };

  itRenders('a select with a value and an onChange', async render => {
    const e = await render(
      <select value="bar" onChange={() => {}}>
        {options}
      </select>,
    );
    expectSelectValue(e, 'bar');
  });

  itRenders('a select with a value and readOnly', async render => {
    const e = await render(
      <select value="bar" readOnly={true}>
        {options}
      </select>,
    );
    expectSelectValue(e, 'bar');
  });

  itRenders('a select with a multiple values and an onChange', async render => {
    const e = await render(
      <select value={['bar', 'baz']} multiple={true} onChange={() => {}}>
        {options}
      </select>,
    );
    expectSelectValue(e, ['bar', 'baz']);
  });

  itRenders('a select with a multiple values and readOnly', async render => {
    const e = await render(
      <select value={['bar', 'baz']} multiple={true} readOnly={true}>
        {options}
      </select>,
    );
    expectSelectValue(e, ['bar', 'baz']);
  });

  itRenders('a select with a value and no onChange/readOnly', async render => {
    // this configuration should raise a dev warning that value without
    // onChange or readOnly is a mistake.
    const e = await render(<select value="bar">{options}</select>, 1);
    expectSelectValue(e, 'bar');
  });

  itRenders('a select with a defaultValue', async render => {
    const e = await render(<select defaultValue="bar">{options}</select>);
    expectSelectValue(e, 'bar');
  });

  itRenders('a select value overriding defaultValue', async render => {
    const e = await render(
      <select value="bar" defaultValue="baz" readOnly={true}>
        {options}
      </select>,
      1,
    );
    expectSelectValue(e, 'bar');
  });

  itRenders(
    'a select with options that use dangerouslySetInnerHTML',
    async render => {
      const e = await render(
        <select defaultValue="baz" value="bar" readOnly={true}>
          <option
            id="foo"
            value="foo"
            dangerouslySetInnerHTML={{
              __html: 'Foo',
            }}>
            {undefined}
          </option>
          <option
            id="bar"
            value="bar"
            dangerouslySetInnerHTML={{
              __html: 'Bar',
            }}>
            {null}
          </option>
          <option
            id="baz"
            dangerouslySetInnerHTML={{
              __html: 'Baz', // This warns because no value prop is passed.
            }}
          />
        </select>,
        2,
      );
      expectSelectValue(e, 'bar');
    },
  );

  itThrowsWhenRendering(
    'a select with option that uses dangerouslySetInnerHTML and 0 as child',
    async render => {
      await render(
        <select defaultValue="baz" value="foo" readOnly={true}>
          <option
            id="foo"
            value="foo"
            dangerouslySetInnerHTML={{
              __html: 'Foo',
            }}>
            {0}
          </option>
        </select>,
        1,
      );
    },
    'Can only set one of `children` or `props.dangerouslySetInnerHTML`.',
  );

  itThrowsWhenRendering(
    'a select with option that uses dangerouslySetInnerHTML and empty string as child',
    async render => {
      await render(
        <select defaultValue="baz" value="foo" readOnly={true}>
          <option
            id="foo"
            value="foo"
            dangerouslySetInnerHTML={{
              __html: 'Foo',
            }}>
            {''}
          </option>
        </select>,
        1,
      );
    },
    'Can only set one of `children` or `props.dangerouslySetInnerHTML`.',
  );

  itRenders(
    'a select value overriding defaultValue no matter the prop order',
    async render => {
      const e = await render(
        <select defaultValue="baz" value="bar" readOnly={true}>
          {options}
        </select>,
        1,
      );
      expectSelectValue(e, 'bar');
    },
  );

  itRenders('a select option with flattened children', async render => {
    const e = await render(
      <select value="bar" readOnly={true}>
        <option value="bar">
          A {'B'} {5n}
        </option>
      </select>,
    );
    const option = e.options[0];
    expect(option.textContent).toBe('A B 5');
    expect(option.value).toBe('bar');
    expect(option.selected).toBe(true);
  });

  itRenders(
    'a select option with flattened children no value',
    async render => {
      const e = await render(
        <select value="A B" readOnly={true}>
          <option>A {'B'}</option>
        </select>,
      );
      const option = e.options[0];
      expect(option.textContent).toBe('A B');
      expect(option.value).toBe('A B');
      expect(option.selected).toBe(true);
    },
  );

  itRenders(
    'a boolean true select value match the string "true"',
    async render => {
      const e = await render(
        <select value={true} readOnly={true}>
          <option value="first">First</option>
          <option value="true">True</option>
        </select>,
      );
      expect(e.firstChild.selected).toBe(false);
      expect(e.lastChild.selected).toBe(true);
    },
  );

  itRenders(
    'a missing select value does not match the string "undefined"',
    async render => {
      const e = await render(
        <select readOnly={true}>
          <option value="first">First</option>
          <option value="undefined">Undefined</option>
        </select>,
      );
      expect(e.firstChild.selected).toBe(true);
      expect(e.lastChild.selected).toBe(false);
    },
  );
});
