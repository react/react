/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  FunctionExpression,
  getHookKind,
  HIRFunction,
  IdentifierId,
} from '../HIR';

export function nameAnonymousFunctions(fn: HIRFunction): void {
  if (fn.id == null) {
    return;
  }
  const parentName = fn.id;
  const functions = nameAnonymousFunctionsImpl(fn);
  function visit(node: Node, prefix: string): void {
    if (node.generatedName != null && node.fn.nameHint == null) {
      /**
       * Note that we don't generate a name for functions that already had one,
       * so we'll only add the prefix to anonymous functions regardless of
       * nesting depth.
       */
      const name = `${prefix}${node.generatedName}]`;
      node.fn.nameHint = name;
      node.fn.loweredFunc.func.nameHint = name;
    }
    /**
     * Whether or not we generated a name for the function at this node,
     * traverse into its nested functions to assign them names
     */
    const nextPrefix = `${prefix}${node.generatedName ?? node.fn.name ?? '<anonymous>'} > `;
    for (const inner of node.inner) {
      visit(inner, nextPrefix);
    }
  }
  for (const node of functions) {
    visit(node, `${parentName}[`);
  }
}

type Node = {
  fn: FunctionExpression;
  generatedName: string | null;
  inner: Array<Node>;
};

function nameAnonymousFunctionsImpl(fn: HIRFunction): Array<Node> {
  // Functions that we track to generate names for
  const functions: Map<IdentifierId, Node> = new Map();
  // Tracks temporaries that read from variables/globals/properties
  const names: Map<IdentifierId, string> = new Map();
  // Tracks all function nodes to bubble up for later renaming
  const nodes: Array<Node> = [];
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {lvalue, value} = instr;
      switch (value.kind) {
        case 'LoadGlobal': {
          names.set(lvalue.identifier.id, value.binding.name);
          break;
        }
        case 'LoadContext':
        case 'LoadLocal': {
          const name = value.place.identifier.name;
          if (name != null && name.kind === 'named') {
            names.set(lvalue.identifier.id, name.value);
          }
          const func = functions.get(value.place.identifier.id);
          if (func != null) {
            functions.set(lvalue.identifier.id, func);
          }
          break;
        }
        case 'PropertyLoad': {
          const objectName = names.get(value.object.identifier.id);
          if (objectName != null) {
            names.set(
              lvalue.identifier.id,
              `${objectName}.${String(value.property)}`,
            );
          }
          break;
        }
        case 'FunctionExpression': {
          const inner = nameAnonymousFunctionsImpl(value.loweredFunc.func);
          const node: Node = {
            fn: value,
            generatedName: null,
            inner,
          };
          /**
           * Bubble-up all functions, even if they're named, so that we can
           * later generate names for any inner anonymous functions
           */
          nodes.push(node);
          if (value.name == null) {
            // but only generate names for anonymous functions
            functions.set(lvalue.identifier.id, node);
          }
          break;
        }
        case 'StoreContext':
        case 'StoreLocal': {
          const node = functions.get(value.value.identifier.id);
          const variableName = value.lvalue.place.identifier.name;
          if (
            node != null &&
            node.generatedName == null &&
            variableName != null &&
            variableName.kind === 'named'
          ) {
            node.generatedName = variableName.value;
            functions.delete(value.value.identifier.id);
          }
          break;
        }
        case 'CallExpression':
        case 'MethodCall': {
          const callee =
            value.kind === 'MethodCall' ? value.property : value.callee;
          const hookKind = getHookKind(fn.env, callee.identifier);
          let calleeName: string | null = null;
          if (hookKind != null && hookKind !== 'Custom') {
            calleeName = hookKind;
          } else {
            calleeName = names.get(callee.identifier.id) ?? '(anonymous)';
          }
          let fnArgCount = 0;
          for (const arg of value.args) {
            if (arg.kind === 'Identifier' && functions.has(arg.identifier.id)) {
              fnArgCount++;
            }
          }
          for (let i = 0; i < value.args.length; i++) {
            const arg = value.args[i]!;
            if (arg.kind === 'Spread') {
              continue;
            }
            const node = functions.get(arg.identifier.id);
            if (node != null && node.generatedName == null) {
              const generatedName =
                fnArgCount > 1 ? `${calleeName}(arg${i})` : `${calleeName}()`;
              node.generatedName = generatedName;
              functions.delete(arg.identifier.id);
            }
          }
          break;
        }
        case 'JsxExpression': {
          for (const attr of value.props) {
            if (attr.kind === 'JsxSpreadAttribute') {
              continue;
            }
            const node = functions.get(attr.place.identifier.id);
            if (node != null && node.generatedName == null) {
              const elementName =
                value.tag.kind === 'BuiltinTag'
                  ? value.tag.name
                  : (names.get(value.tag.identifier.id) ?? null);
              const propName =
                elementName == null
                  ? attr.name
                  : `<${elementName}>.${attr.name}`;
              node.generatedName = `${propName}`;
              functions.delete(attr.place.identifier.id);
            }
          }
          break;
        }
      }
    }
  }
  return nodes;
}
