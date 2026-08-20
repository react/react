/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import buildMakeReadOnly from '../makeReadOnly';

describe('makeReadOnly', () => {
  let logger: jest.Func;
  let makeReadOnly: <T>(value: T, source: string) => T;

  beforeEach(() => {
    logger = jest.fn();
    makeReadOnly = buildMakeReadOnly(logger, []);
  });

  describe('Tracking mutations', () => {
    it('can be called with all primitives', () => {
      const a = 5;
      const b = true;
      const c = null;
      expect(makeReadOnly(a, 'test1')).toBe(a);
      expect(makeReadOnly(b, 'test1')).toBe(b);
      expect(makeReadOnly(c, 'test1')).toBe(c);
    });

    it('retains referential equality', () => {
      const valA = {};
      const valB = {a: valA, _: valA};
      const o = {a: valA, b: valB, c: 'c'};
      expect(makeReadOnly(o, 'test2')).toBe(o);
      expect(makeReadOnly(o.a, 'test2')).toBe(valA);
      expect(makeReadOnly(o.b, 'test2')).toBe(valB);
      expect(makeReadOnly(o.b.a, 'test2')).toBe(valA);
      expect(makeReadOnly(o.b._, 'test2')).toBe(valA);
      expect(makeReadOnly(o.c, 'test2')).toBe('c');
    });

    it('deals with cyclic references', () => {
      const o: any = {};
      o.self_ref = o;
      expect(makeReadOnly(o, 'test3')).toBe(o);
      expect(makeReadOnly(o.self_ref, 'test3')).toBe(o);
    });
    it('logs direct interior mutability', () => {
      const o = {a: 0};
      makeReadOnly(o, 'test4');
      o.a = 42;
      expect(logger).toBeCalledWith('FORGET_MUTATE_IMMUT', 'test4', 'a', 42);
    });

    it('tracks changes to known RO properties', () => {
      const o: any = {a: {}};
      makeReadOnly(o, 'test5');
      o.a = 42;
      expect(logger).toBeCalledWith('FORGET_MUTATE_IMMUT', 'test5', 'a', 42);
      expect(o.a).toBe(42);
      const newVal = {x: 0};
      o.a = newVal;
      expect(logger).toBeCalledWith(
        'FORGET_MUTATE_IMMUT',
        'test5',
        'a',
        newVal,
      );
      expect(o.a).toBe(newVal);
    });

    it('logs aliased mutations', () => {
      const o: any = {a: {x: 4}};

      const alias = o;
      makeReadOnly(o, 'test6');
      const newVal = {};
      alias.a = newVal;
      expect(logger).toBeCalledWith(
        'FORGET_MUTATE_IMMUT',
        'test6',
        'a',
        newVal,
      );
      expect(o.a).toBe(newVal);
    });

    it('logs transitive interior mutability', () => {
      const o: any = {a: {x: 0}};
      makeReadOnly(o, 'test7');
      o.a.x = 42;
      expect(logger).toBeCalledWith('FORGET_MUTATE_IMMUT', 'test7', 'x', 42);
    });

    describe('todo', () => {
      it('does not track newly added or deleted vals if makeReadOnly is only called once', () => {
        // this is a limitation of the current "proxy" approach,
        // which overwrites object properties with getters and setters
        const x: any = {a: {}};
        makeReadOnly(x, 'test8');

        delete x.a;
        x.b = 0;
        expect(logger).toBeCalledTimes(0);
      });
      it('does not log aliased indirect mutations', () => {
        // this could be easily implemented by making caching eager
        const innerObj = {x: 0};
        const o = {a: innerObj};
        makeReadOnly(o, 'test9');
        innerObj.x = 42;
        expect(o.a.x).toBe(42);

        const o1 = {a: {x: 0}};
        const innerObj1 = o1.a;
        makeReadOnly(o1, 'test9');
        innerObj1.x = 42;

        expect(o1.a.x).toBe(42);
        expect(logger).toBeCalledTimes(0);
      });

      it('does not track objects with getter/setters', () => {
        let backedX: string | null = null;
        const o = {
          set val(val: string | null) {
            backedX = val;
          },
          get val(): string | null {
            return backedX;
          },
        };
        expect(makeReadOnly(o, 'test10')).toBe(o);
        expect(makeReadOnly(o.val, 'test10')).toBe(null);

        o.val = '40';
        expect(logger).toBeCalledTimes(0);
      });
    });
  });

  describe('Tracking adding or deleting properties', () => {
    it('tracks new properties added between calls to makeReadOnly', () => {
      const o: any = {};
      makeReadOnly(o, 'test11');
      o.a = 'new value';
      makeReadOnly(o, 'test11');
      expect(logger).toBeCalledWith('FORGET_ADD_PROP_IMMUT', 'test11', 'a');
    });
    it('tracks properties deleted between calls to makeReadOnly', () => {
      const o: any = {a: 0};
      makeReadOnly(o, 'test12');
      delete o.a;
      makeReadOnly(o, 'test12');
      expect(logger).toBeCalledWith('FORGET_DELETE_PROP_IMMUT', 'test12', 'a');
    });

    // it("tracks properties deleted and re-added between calls to makeReadOnly", () => {
    //   const o: any = { a: 0 };
    //   makeReadOnly(o);
    //   delete o.a;
    //   o.a = {};
    //   makeReadOnly(o);
    //   expect(logger).toBeCalledWith("FORGET_CHANGE_PROP_IMMUT", "a");
    // });
  });
});
