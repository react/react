/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export {};

let structuralCheck: (...args: Array<unknown>) => void;
let consoleError: jest.SpyInstance;

beforeEach(() => {
  jest.resetModules();
  structuralCheck =
    require('../../../react-compiler-runtime/src').$structuralCheck;
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

function check(oldValue: unknown, newValue: unknown) {
  structuralCheck(oldValue, newValue, 'value', 'Component', 'test', '1:1');
}

it('reports differences between ordinary strings', () => {
  check('before', 'after');
  expect(consoleError).toHaveBeenCalledTimes(1);
  expect(consoleError).toHaveBeenCalledWith(
    'Component:1:1 [test] value changed from before to after at depth 0',
  );
});

it('does not report equal strings', () => {
  check('same', 'same');
  expect(consoleError).not.toHaveBeenCalled();
});

it('preserves value diagnostics for numeric strings', () => {
  check('1', '2');
  expect(consoleError).toHaveBeenCalledTimes(1);
  expect(consoleError).toHaveBeenCalledWith(
    'Component:1:1 [test] value changed from 1 to 2 at depth 0',
  );
});

it('reports the values of numeric and nonnumeric strings', () => {
  check('1', 'after');
  expect(consoleError).toHaveBeenCalledTimes(1);
  expect(consoleError).toHaveBeenCalledWith(
    'Component:1:1 [test] value changed from 1 to after at depth 0',
  );
});

it('does not report two NaN values', () => {
  check(NaN, NaN);
  expect(consoleError).not.toHaveBeenCalled();
});

it.each([
  [NaN, 1, 'NaN', 'non-NaN value'],
  [1, NaN, 'non-NaN value', 'NaN'],
])(
  'reports NaN versus a number (%s, %s)',
  (oldValue, newValue, oldText, newText) => {
    check(oldValue, newValue);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      `Component:1:1 [test] value changed from ${oldText} to ${newText} at depth 0`,
    );
  },
);

it('reports the property path for nested strings', () => {
  check({text: 'before'}, {text: 'after'});
  expect(consoleError).toHaveBeenCalledTimes(1);
  expect(consoleError).toHaveBeenCalledWith(
    'Component:1:1 [test] value.text changed from before to after at depth 1',
  );
});

it('reports the array index for nested strings', () => {
  check(['before'], ['after']);
  expect(consoleError).toHaveBeenCalledTimes(1);
  expect(consoleError).toHaveBeenCalledWith(
    'Component:1:1 [test] value[0] changed from before to after at depth 1',
  );
});

it('deduplicates identical diagnostics', () => {
  check('before', 'after');
  check('before', 'after');
  expect(consoleError).toHaveBeenCalledTimes(1);
});

it('preserves strict equality for signed zero', () => {
  check(0, -0);
  expect(consoleError).not.toHaveBeenCalled();
});

it('continues to ignore function differences', () => {
  check(
    () => 1,
    () => 2,
  );
  expect(consoleError).not.toHaveBeenCalled();
});
