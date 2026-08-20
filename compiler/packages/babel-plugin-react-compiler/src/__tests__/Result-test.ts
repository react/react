/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {Err, Ok, Result} from '../Utils/Result';

function addMax10(a: number, b: number): Result<number, string> {
  const n = a + b;
  return n > 10 ? Err(`${n} is too high`) : Ok(n);
}

function onlyFoo(foo: string): Result<string, string> {
  return foo === 'foo' ? Ok(foo) : Err(foo);
}

class CustomDummyError extends Error {}

describe('Result', () => {
  test('.map', () => {
    expect(addMax10(1, 1).map(n => n * 2)).toEqual(Ok(4));
    expect(addMax10(10, 10).map(n => n * 2)).toEqual(Err('20 is too high'));
  });

  test('.mapErr', () => {
    expect(addMax10(1, 1).mapErr(e => `not a number: ${e}`)).toEqual(Ok(2));
    expect(addMax10(10, 10).mapErr(e => `couldn't add: ${e}`)).toEqual(
      Err("couldn't add: 20 is too high"),
    );
  });

  test('.mapOr', () => {
    expect(onlyFoo('foo').mapOr(42, v => v.length)).toEqual(3);
    expect(onlyFoo('bar').mapOr(42, v => v.length)).toEqual(42);
  });

  test('.mapOrElse', () => {
    expect(
      onlyFoo('foo').mapOrElse(
        () => 42,
        v => v.length,
      ),
    ).toEqual(3);
    expect(
      onlyFoo('bar').mapOrElse(
        () => 42,
        v => v.length,
      ),
    ).toEqual(42);
  });

  test('.andThen', () => {
    expect(addMax10(1, 1).andThen(n => Ok(n * 2))).toEqual(Ok(4));
    expect(addMax10(10, 10).andThen(n => Ok(n * 2))).toEqual(
      Err('20 is too high'),
    );
  });

  test('.and', () => {
    expect(addMax10(1, 1).and(Ok(4))).toEqual(Ok(4));
    expect(addMax10(10, 10).and(Ok(4))).toEqual(Err('20 is too high'));
    expect(addMax10(1, 1).and(Err('hehe'))).toEqual(Err('hehe'));
    expect(addMax10(10, 10).and(Err('hehe'))).toEqual(Err('20 is too high'));
  });

  test('.or', () => {
    expect(addMax10(1, 1).or(Ok(4))).toEqual(Ok(2));
    expect(addMax10(10, 10).or(Ok(4))).toEqual(Ok(4));
    expect(addMax10(1, 1).or(Err('hehe'))).toEqual(Ok(2));
    expect(addMax10(10, 10).or(Err('hehe'))).toEqual(Err('hehe'));
  });

  test('.orElse', () => {
    expect(addMax10(1, 1).orElse(str => Err(str.toUpperCase()))).toEqual(Ok(2));
    expect(addMax10(10, 10).orElse(str => Err(str.toUpperCase()))).toEqual(
      Err('20 IS TOO HIGH'),
    );
  });

  test('.isOk', () => {
    expect(addMax10(1, 1).isOk()).toBeTruthy();
    expect(addMax10(10, 10).isOk()).toBeFalsy();
  });

  test('.isErr', () => {
    expect(addMax10(1, 1).isErr()).toBeFalsy();
    expect(addMax10(10, 10).isErr()).toBeTruthy();
  });

  test('.expect', () => {
    expect(addMax10(1, 1).expect('a number under 10')).toEqual(2);
    expect(() => {
      addMax10(10, 10).expect('a number under 10');
    }).toThrowErrorMatchingInlineSnapshot(
      `"a number under 10: 20 is too high"`,
    );
  });

  test('.expectErr', () => {
    expect(() => {
      addMax10(1, 1).expectErr('a number under 10');
    }).toThrowErrorMatchingInlineSnapshot(`"a number under 10: 2"`);
    expect(addMax10(10, 10).expectErr('a number under 10')).toEqual(
      '20 is too high',
    );
  });

  test('.unwrap', () => {
    expect(addMax10(1, 1).unwrap()).toEqual(2);
    expect(() => {
      addMax10(10, 10).unwrap();
    }).toThrowErrorMatchingInlineSnapshot(
      `"Can't unwrap \`Err\` to \`Ok\`: 20 is too high"`,
    );
    expect(() => {
      Err(new CustomDummyError('oops')).unwrap();
    }).toThrowErrorMatchingInlineSnapshot(`"oops"`);
  });

  test('.unwrapOr', () => {
    expect(addMax10(1, 1).unwrapOr(4)).toEqual(2);
    expect(addMax10(10, 10).unwrapOr(4)).toEqual(4);
  });

  test('.unwrapOrElse', () => {
    expect(addMax10(1, 1).unwrapOrElse(() => 4)).toEqual(2);
    expect(addMax10(10, 10).unwrapOrElse(s => s.length)).toEqual(14);
  });

  test('.unwrapErr', () => {
    expect(() => {
      addMax10(1, 1).unwrapErr();
    }).toThrowErrorMatchingInlineSnapshot(
      `"Can't unwrap \`Ok\` to \`Err\`: 2"`,
    );
    expect(addMax10(10, 10).unwrapErr()).toEqual('20 is too high');
    expect(() => {
      Ok(new CustomDummyError('oops')).unwrapErr();
    }).toThrowErrorMatchingInlineSnapshot(`"oops"`);
  });
});
