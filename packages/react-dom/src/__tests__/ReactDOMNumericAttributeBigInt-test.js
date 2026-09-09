/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactDOMClient;
let ReactDOMServer;
let act;
let container;

describe('numeric attributes with bigint values', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // isNaN() throws a TypeError on a BigInt, so a bigint value for one of these
  // numeric attributes used to crash the render. They are otherwise coerced to
  // a string like every other attribute (setValueForAttribute path).
  it('does not crash and coerces bigint on positive numeric attributes', async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(<textarea cols={80n} rows={10n} defaultValue="" />),
    );
    const textarea = container.querySelector('textarea');
    expect(textarea.getAttribute('cols')).toBe('80');
    expect(textarea.getAttribute('rows')).toBe('10');
  });

  it('does not crash and coerces bigint on numeric attributes (start)', async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() =>
      root.render(
        <ol start={5n}>
          <li />
        </ol>,
      ),
    );
    expect(container.querySelector('ol').getAttribute('start')).toBe('5');
  });

  it('removes a positive numeric attribute when the bigint is below 1', async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<textarea cols={0n} defaultValue="" />));
    expect(container.querySelector('textarea').hasAttribute('cols')).toBe(
      false,
    );
  });

  it('does not crash and coerces bigint when server rendering (Fizz)', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ol start={5n}>
        <li />
      </ol>,
    );
    expect(html).toContain('start="5"');
  });

  it('does not crash when hydrating bigint numeric attributes', async () => {
    container.innerHTML = ReactDOMServer.renderToString(
      <ol start={5n}>
        <li />
      </ol>,
    );
    await act(() =>
      ReactDOMClient.hydrateRoot(
        container,
        <ol start={5n}>
          <li />
        </ol>,
      ),
    );
    expect(container.querySelector('ol').getAttribute('start')).toBe('5');
  });

  it('does not crash and coerces bigint on the positive Fizz path (cols/rows)', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <textarea cols={80n} rows={10n} defaultValue="" />,
    );
    expect(html).toContain('cols="80"');
    expect(html).toContain('rows="10"');
  });

  it('does not crash hydrating the positive numeric path (cols/rows)', async () => {
    container.innerHTML = ReactDOMServer.renderToString(
      <textarea cols={80n} rows={10n} defaultValue="" />,
    );
    await act(() =>
      ReactDOMClient.hydrateRoot(
        container,
        <textarea cols={80n} rows={10n} defaultValue="" />,
      ),
    );
    const textarea = container.querySelector('textarea');
    expect(textarea.getAttribute('cols')).toBe('80');
    expect(textarea.getAttribute('rows')).toBe('10');
  });
});
