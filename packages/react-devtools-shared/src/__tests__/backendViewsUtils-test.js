/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('backend views utils', () => {
  let getEffectiveZoom;

  beforeEach(() => {
    getEffectiveZoom =
      require('react-devtools-shared/src/backend/views/utils').getEffectiveZoom;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('getEffectiveZoom', () => {
    it('should return 1 when no zoom is applied', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      expect(getEffectiveZoom(element)).toBe(1);
    });

    it('should prefer currentCSSZoom when the browser provides it', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);
      Object.defineProperty(element, 'currentCSSZoom', {value: 0.9});

      expect(getEffectiveZoom(element)).toBe(0.9);
    });

    it('should accumulate zoom from the ancestor chain', () => {
      const grandparent = document.createElement('div');
      const parent = document.createElement('div');
      const element = document.createElement('div');
      grandparent.appendChild(parent);
      parent.appendChild(element);
      document.body.appendChild(grandparent);

      const zooms = new Map([
        [grandparent, '0.5'],
        [parent, '2'],
        [element, '0.9'],
      ]);
      jest
        .spyOn(window, 'getComputedStyle')
        .mockImplementation(node => ({zoom: zooms.get(node) ?? ''}) as any);

      expect(getEffectiveZoom(element)).toBeCloseTo(0.9);
      expect(getEffectiveZoom(parent)).toBeCloseTo(1);
      expect(getEffectiveZoom(grandparent)).toBeCloseTo(0.5);
    });

    it('should ignore unsupported or invalid computed zoom values', () => {
      const parent = document.createElement('div');
      const element = document.createElement('div');
      parent.appendChild(element);
      document.body.appendChild(parent);

      const zooms = new Map([
        [parent, 'normal'],
        [element, '0'],
      ]);
      jest
        .spyOn(window, 'getComputedStyle')
        .mockImplementation(node => ({zoom: zooms.get(node) ?? ''}) as any);

      expect(getEffectiveZoom(element)).toBe(1);
    });
  });
});
