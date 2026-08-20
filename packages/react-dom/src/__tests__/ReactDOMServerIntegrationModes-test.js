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

const {resetModules, itRenders} = ReactDOMServerIntegrationUtils(initModules);

describe('ReactDOMServerIntegration', () => {
  beforeEach(() => {
    resetModules();
  });

  describe('React.StrictMode', () => {
    itRenders('a strict mode with one child', async render => {
      const e = await render(
        <React.StrictMode>
          <div>text1</div>
        </React.StrictMode>,
      );
      const parent = e.parentNode;
      expect(parent.childNodes[0].tagName).toBe('DIV');
    });

    itRenders('a strict mode with several children', async render => {
      const Header = props => {
        return <p>header</p>;
      };
      const Footer = props => {
        return (
          <React.StrictMode>
            <h2>footer</h2>
            <h3>about</h3>
          </React.StrictMode>
        );
      };
      const e = await render(
        <React.StrictMode>
          <div>text1</div>
          <span>text2</span>
          <Header />
          <Footer />
        </React.StrictMode>,
      );
      const parent = e.parentNode;
      expect(parent.childNodes[0].tagName).toBe('DIV');
      expect(parent.childNodes[1].tagName).toBe('SPAN');
      expect(parent.childNodes[2].tagName).toBe('P');
      expect(parent.childNodes[3].tagName).toBe('H2');
      expect(parent.childNodes[4].tagName).toBe('H3');
    });

    itRenders('a nested strict mode', async render => {
      const e = await render(
        <React.StrictMode>
          <React.StrictMode>
            <div>text1</div>
          </React.StrictMode>
          <span>text2</span>
          <React.StrictMode>
            <React.StrictMode>
              <React.StrictMode>
                {null}
                <p />
              </React.StrictMode>
              {false}
            </React.StrictMode>
          </React.StrictMode>
        </React.StrictMode>,
      );
      const parent = e.parentNode;
      expect(parent.childNodes[0].tagName).toBe('DIV');
      expect(parent.childNodes[1].tagName).toBe('SPAN');
      expect(parent.childNodes[2].tagName).toBe('P');
    });

    itRenders('an empty strict mode', async render => {
      expect(
        (
          await render(
            <div>
              <React.StrictMode />
            </div>,
          )
        ).firstChild,
      ).toBe(null);
    });
  });
});
