/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from '@babel/types';
import invariant from 'invariant';

type SourceLocations = Map<string, Map<string, string>>;

function forEachDeclaration(
  ast: t.Node,
  visit: (key: string, binding: t.Identifier, node: t.Node) => void,
): void {
  t.traverse(ast, (node, ancestors) => {
    if (!t.isVariableDeclaration(node) && !t.isVariableDeclarator(node)) {
      return;
    }
    const parent = ancestors[ancestors.length - 1];
    // Loop headers wrap source declarators in a synthetic VariableDeclaration.
    if (
      t.isVariableDeclaration(node) &&
      parent !== undefined &&
      t.isFor(parent.node) &&
      parent.key !== 'body'
    ) {
      return;
    }
    for (const binding of Object.values(t.getBindingIdentifiers(node))) {
      visit(`${node.type}:${binding.name}`, binding, node);
    }
  });
}

function bindingLocation(binding: t.Identifier): string {
  const loc = binding.loc;
  return JSON.stringify(
    loc == null
      ? null
      : [loc.start.line, loc.start.column, loc.end.line, loc.end.column],
  );
}

function sourceRange(node: t.Node): string {
  const position = (
    value: t.SourceLocation['start'],
  ): {line: number; column: number; index: number | null} => ({
    line: value.line,
    column: value.column,
    index: value.index ?? null,
  });
  return JSON.stringify({
    start: node.start ?? null,
    end: node.end ?? null,
    loc:
      node.loc == null
        ? null
        : {start: position(node.loc.start), end: position(node.loc.end)},
  });
}

/*
 * Match surviving declarations by their source bindings. Each binding in a
 * grouped declaration points to the whole statement's original range.
 */
export function collectSourceLocations(ast: t.Node): SourceLocations {
  const locations: SourceLocations = new Map();
  forEachDeclaration(ast, (key, binding, node) => {
    let declarations = locations.get(key);
    if (declarations === undefined) {
      declarations = new Map();
      locations.set(key, declarations);
    }
    declarations.set(bindingLocation(binding), sourceRange(node));
  });
  return locations;
}

export function assertSourceLocations(
  locations: SourceLocations,
  ast: t.Node,
): void {
  forEachDeclaration(ast, (key, binding, node) => {
    const declarations = locations.get(key);
    if (declarations === undefined) {
      return;
    }
    const expected = declarations.get(bindingLocation(binding));
    invariant(
      expected !== undefined,
      `Source binding location changed for ${key}`,
    );
    const actual = sourceRange(node);
    invariant(
      actual === expected,
      `Source range changed for ${key}:\nExpected: ${expected}\nReceived: ${actual}`,
    );
  });
}
