/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('DevToolsFiberSuspense', () => {
  let isRSCStreamIO;
  let isLaterStreamEntry;

  function createIO(overrides) {
    return {
      name: 'RSC stream',
      start: 0,
      end: 0,
      value: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    const DevToolsFiberSuspense = require('../DevToolsFiberSuspense');
    isRSCStreamIO = DevToolsFiberSuspense.isRSCStreamIO;
    isLaterStreamEntry = DevToolsFiberSuspense.isLaterStreamEntry;
  });

  describe('isRSCStreamIO', () => {
    it('should match the capitalized stream name', () => {
      expect(isRSCStreamIO(createIO({name: 'RSC stream'}))).toBe(true);
    });

    it('should match the lowercase stream name', () => {
      expect(isRSCStreamIO(createIO({name: 'rsc stream'}))).toBe(true);
    });

    it('should not match other names', () => {
      expect(isRSCStreamIO(createIO({name: 'fetch'}))).toBe(false);
      expect(isRSCStreamIO(createIO({name: 'Rsc Stream'}))).toBe(false);
      expect(isRSCStreamIO(createIO({name: 'RSC stream '}))).toBe(false);
      expect(isRSCStreamIO(createIO({name: ''}))).toBe(false);
    });

    it('should not depend on the value being set', () => {
      expect(isRSCStreamIO(createIO({value: null}))).toBe(true);
      expect(isRSCStreamIO(createIO({value: Promise.resolve()}))).toBe(true);
    });
  });

  describe('isLaterStreamEntry', () => {
    it('should return false for the same entry', () => {
      const io = createIO({end: 10, byteSize: 100});
      expect(isLaterStreamEntry(io, io)).toBe(false);
    });

    it('should return true when the new entry has a larger byte size', () => {
      const newIO = createIO({end: 5, byteSize: 200});
      const existingIO = createIO({end: 10, byteSize: 100});
      expect(isLaterStreamEntry(newIO, existingIO)).toBe(true);
    });

    it('should return false when the new entry has a smaller byte size and earlier end', () => {
      const newIO = createIO({end: 5, byteSize: 100});
      const existingIO = createIO({end: 10, byteSize: 200});
      expect(isLaterStreamEntry(newIO, existingIO)).toBe(false);
    });

    it('should fall back to end time when the byte size is not larger', () => {
      const newIO = createIO({end: 20, byteSize: 100});
      const existingIO = createIO({end: 10, byteSize: 200});
      expect(isLaterStreamEntry(newIO, existingIO)).toBe(true);
    });

    it('should return false when byte sizes are equal and end is not later', () => {
      const newIO = createIO({end: 10, byteSize: 100});
      const existingIO = createIO({end: 10, byteSize: 100});
      expect(isLaterStreamEntry(newIO, existingIO)).toBe(false);
    });

    it('should compare end times when the new entry has no byte size', () => {
      const existingIO = createIO({end: 10, byteSize: 100});
      expect(isLaterStreamEntry(createIO({end: 20}), existingIO)).toBe(true);
      expect(isLaterStreamEntry(createIO({end: 5}), existingIO)).toBe(false);
    });

    it('should compare end times when the existing entry has no byte size', () => {
      const newIO = createIO({end: 5, byteSize: 100});
      expect(isLaterStreamEntry(newIO, createIO({end: 10}))).toBe(false);
      expect(isLaterStreamEntry(newIO, createIO({end: 1}))).toBe(true);
    });

    it('should compare end times when neither entry has a byte size', () => {
      expect(
        isLaterStreamEntry(createIO({end: 20}), createIO({end: 10})),
      ).toBe(true);
      expect(
        isLaterStreamEntry(createIO({end: 10}), createIO({end: 20})),
      ).toBe(false);
      expect(
        isLaterStreamEntry(createIO({end: 10}), createIO({end: 10})),
      ).toBe(false);
    });

    it('should treat a zero byte size as a defined size', () => {
      const newIO = createIO({end: 5, byteSize: 1});
      const existingIO = createIO({end: 10, byteSize: 0});
      expect(isLaterStreamEntry(newIO, existingIO)).toBe(true);
    });

    it('should return false for a distinct but identical entry', () => {
      const newIO = createIO({end: 10, byteSize: 50});
      const existingIO = createIO({end: 10, byteSize: 50});
      expect(newIO).not.toBe(existingIO);
      expect(isLaterStreamEntry(newIO, existingIO)).toBe(false);
    });
  });
});
