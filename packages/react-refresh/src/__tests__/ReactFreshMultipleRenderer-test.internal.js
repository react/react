/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

jest.resetModules();
const React = require('react');
let ReactFreshRuntime;
if (__DEV__) {
  ReactFreshRuntime = require('react-refresh/runtime');
  ReactFreshRuntime.injectIntoGlobalHook(global);
}
const ReactDOMClient = require('react-dom/client');
const act = require('internal-test-utils').act;

jest.resetModules();
const ReactART = require('react-art');
const ARTSVGMode = require('art/modes/svg');
const ARTCurrentMode = require('art/modes/current');
ARTCurrentMode.setCurrent(ARTSVGMode);

describe('ReactFresh', () => {
  let container;

  beforeEach(() => {
    if (__DEV__) {
      container = document.createElement('div');
      document.body.appendChild(container);
    }
  });

  afterEach(() => {
    if (__DEV__) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it('can update components managed by different renderers independently', async () => {
    if (__DEV__) {
      const InnerV1 = function () {
        return <ReactART.Shape fill="blue" />;
      };
      ReactFreshRuntime.register(InnerV1, 'Inner');

      const OuterV1 = function () {
        return (
          <div style={{color: 'blue'}}>
            <ReactART.Surface>
              <InnerV1 />
            </ReactART.Surface>
          </div>
        );
      };
      ReactFreshRuntime.register(OuterV1, 'Outer');

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<OuterV1 />);
      });
      const el = container.firstChild;
      const pathEl = el.querySelector('path');
      expect(el.style.color).toBe('blue');
      expect(pathEl.getAttributeNS(null, 'fill')).toBe('rgb(0, 0, 255)');

      // Perform a hot update to the ART-rendered component.
      const InnerV2 = function () {
        return <ReactART.Shape fill="red" />;
      };
      ReactFreshRuntime.register(InnerV2, 'Inner');

      ReactFreshRuntime.performReactRefresh();
      expect(container.firstChild).toBe(el);
      expect(el.querySelector('path')).toBe(pathEl);
      expect(el.style.color).toBe('blue');
      expect(pathEl.getAttributeNS(null, 'fill')).toBe('rgb(255, 0, 0)');

      // Perform a hot update to the DOM-rendered component.
      const OuterV2 = function () {
        return (
          <div style={{color: 'red'}}>
            <ReactART.Surface>
              <InnerV1 />
            </ReactART.Surface>
          </div>
        );
      };
      ReactFreshRuntime.register(OuterV2, 'Outer');

      ReactFreshRuntime.performReactRefresh();
      expect(el.style.color).toBe('red');
      expect(container.firstChild).toBe(el);
      expect(el.querySelector('path')).toBe(pathEl);
      expect(pathEl.getAttributeNS(null, 'fill')).toBe('rgb(255, 0, 0)');
    }
  });
});
