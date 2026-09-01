/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-keywords-and-reserved-words
 */

/**
 * Note: `await` and `yield` are contextually allowed as identifiers.
 *   await: reserved inside async functions and modules
 *   yield: reserved inside generator functions
 *
 * Note: `async` is not reserved.
 */
const RESERVED_WORDS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
]);

/**
 * Reserved when a module has a 'use strict' directive.
 */
const STRICT_MODE_RESERVED_WORDS = new Set([
  'let',
  'static',
  'implements',
  'interface',
  'package',
  'private',
  'protected',
  'public',
]);
/**
 * The names arguments and eval are not keywords, but they are subject to some restrictions in
 * strict mode code.
 */
const STRICT_MODE_RESTRICTED_WORDS = new Set(['eval', 'arguments']);

/**
 * Conservative check for whether an identifer name is reserved or not. We assume that code is
 * written with strict mode.
 */
export function isReservedWord(identifierName: string): boolean {
  return (
    RESERVED_WORDS.has(identifierName) ||
    STRICT_MODE_RESERVED_WORDS.has(identifierName) ||
    STRICT_MODE_RESTRICTED_WORDS.has(identifierName)
  );
}
