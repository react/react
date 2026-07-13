/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  HIRFunction,
  IdentifierId,
  InstructionValue,
  makeInstructionId,
  MutableRange,
  Place,
  ReactiveScope,
} from '../HIR';
import {Macro} from '../HIR/Environment';
import {eachInstructionValueOperand} from '../HIR/visitors';

/**
 * Whether a macro requires its arguments to be transitively inlined (eg fbt)
 * or just avoid having the top-level values be converted to variables (eg fbt.param)
 */
enum InlineLevel {
  Transitive = 'Transitive',
  Shallow = 'Shallow',
}
type MacroDefinition = {
  level: InlineLevel;
  properties: Map<string, MacroDefinition> | null;
};

const SHALLOW_MACRO: MacroDefinition = {
  level: InlineLevel.Shallow,
  properties: null,
};
const TRANSITIVE_MACRO: MacroDefinition = {
  level: InlineLevel.Transitive,
  properties: null,
};
const FBT_MACRO: MacroDefinition = {
  level: InlineLevel.Transitive,
  properties: new Map([['*', SHALLOW_MACRO]]),
};
FBT_MACRO.properties!.set('enum', FBT_MACRO);

/**
 * This pass supports the `fbt` translation system (https://facebook.github.io/fbt/)
 * as well as similar user-configurable macro-like APIs where it's important that
 * the name of the function not be changed, and it's literal arguments not be turned
 * into temporaries.
 *
 * ## FBT
 *
 * FBT provides the `<fbt>` JSX element and `fbt()` calls (which take params in the
 * form of `<fbt:param>` children or `fbt.param()` arguments, respectively). These
 * tags/functions have restrictions on what types of syntax may appear as props/children/
 * arguments, notably that variable references may not appear directly — variables
 * must always be wrapped in a `<fbt:param>` or `fbt.param()`.
 *
 * To ensure that Forget doesn't rewrite code to violate this restriction, we force
 * operands to fbt tags/calls have the same scope as the tag/call itself.
 *
 * Note that this still allows the props/arguments of `<fbt:param>`/`fbt.param()`
 * to be independently memoized.
 *
 * ## User-defined macro-like function
 *
 * Users can also specify their own functions to be treated similarly to fbt via the
 * `customMacros` environment configuration. By default, user-supplied custom macros
 * have their arguments transitively inlined.
 */
export function memoizeFbtAndMacroOperandsInSameScope(
  fn: HIRFunction,
): Set<IdentifierId> {
  const macroKinds = new Map<Macro, MacroDefinition>([
    ...Array.from(FBT_TAGS.entries()),
    ...(fn.env.config.customMacros ?? []).map(
      name => [name, TRANSITIVE_MACRO] as [Macro, MacroDefinition],
    ),
  ]);
  /**
   * Forward data-flow analysis to identify all macro tags, including
   * things like `fbt.foo.bar(...)`
   */
  const macroTags = populateMacroTags(fn, macroKinds);

  /**
   * Reverse data-flow analysis to merge arguments to macro *invocations*
   * based on the kind of the macro
   */
  const macroValues = mergeMacroArguments(fn, macroTags, macroKinds);

  return macroValues;
}

const FBT_TAGS: Map<string, MacroDefinition> = new Map([
  ['fbt', FBT_MACRO],
  ['fbt:param', SHALLOW_MACRO],
  ['fbt:enum', FBT_MACRO],
  ['fbt:plural', SHALLOW_MACRO],
  ['fbs', FBT_MACRO],
  ['fbs:param', SHALLOW_MACRO],
  ['fbs:enum', FBT_MACRO],
  ['fbs:plural', SHALLOW_MACRO],
]);
export const SINGLE_CHILD_FBT_TAGS: Set<string> = new Set([
  'fbt:param',
  'fbs:param',
]);

function populateMacroTags(
  fn: HIRFunction,
  macroKinds: Map<Macro, MacroDefinition>,
): Map<IdentifierId, MacroDefinition> {
  const macroTags = new Map<IdentifierId, MacroDefinition>();
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {lvalue, value} = instr;
      switch (value.kind) {
        case 'Primitive': {
          if (typeof value.value === 'string') {
            const macroDefinition = macroKinds.get(value.value);
            if (macroDefinition != null) {
              /*
               * We don't distinguish between tag names and strings, so record
               * all `fbt` string literals in case they are used as a jsx tag.
               */
              macroTags.set(lvalue.identifier.id, macroDefinition);
            }
          }
          break;
        }
        case 'LoadGlobal': {
          let macroDefinition = macroKinds.get(value.binding.name);
          if (macroDefinition != null) {
            macroTags.set(lvalue.identifier.id, macroDefinition);
          }
          break;
        }
        case 'PropertyLoad': {
          if (typeof value.property === 'string') {
            const macroDefinition = macroTags.get(value.object.identifier.id);
            if (macroDefinition != null) {
              const propertyDefinition =
                macroDefinition.properties != null
                  ? (macroDefinition.properties.get(value.property) ??
                    macroDefinition.properties.get('*'))
                  : null;
              const propertyMacro = propertyDefinition ?? macroDefinition;
              macroTags.set(lvalue.identifier.id, propertyMacro);
            }
          }
          break;
        }
      }
    }
  }
  return macroTags;
}

function mergeMacroArguments(
  fn: HIRFunction,
  macroTags: Map<IdentifierId, MacroDefinition>,
  macroKinds: Map<Macro, MacroDefinition>,
): Set<IdentifierId> {
  const macroValues = new Set<IdentifierId>(macroTags.keys());
  for (const block of Array.from(fn.body.blocks.values()).reverse()) {
    for (let i = block.instructions.length - 1; i >= 0; i--) {
      const instr = block.instructions[i]!;
      const {lvalue, value} = instr;
      switch (value.kind) {
        case 'DeclareContext':
        case 'DeclareLocal':
        case 'Destructure':
        case 'LoadContext':
        case 'LoadLocal':
        case 'PostfixUpdate':
        case 'PrefixUpdate':
        case 'StoreContext':
        case 'StoreLocal': {
          // Instructions that never need to be merged
          break;
        }
        case 'CallExpression':
        case 'MethodCall': {
          const scope = lvalue.identifier.scope;
          if (scope == null) {
            continue;
          }
          const callee =
            value.kind === 'CallExpression' ? value.callee : value.property;
          const macroDefinition =
            macroTags.get(callee.identifier.id) ??
            macroTags.get(lvalue.identifier.id);
          if (macroDefinition != null) {
            visitOperands(
              macroDefinition,
              scope,
              lvalue,
              value,
              macroValues,
              macroTags,
            );
          }
          break;
        }
        case 'JsxExpression': {
          const scope = lvalue.identifier.scope;
          if (scope == null) {
            continue;
          }
          let macroDefinition;
          if (value.tag.kind === 'Identifier') {
            macroDefinition = macroTags.get(value.tag.identifier.id);
          } else {
            macroDefinition = macroKinds.get(value.tag.name);
          }
          macroDefinition ??= macroTags.get(lvalue.identifier.id);
          if (macroDefinition != null) {
            visitOperands(
              macroDefinition,
              scope,
              lvalue,
              value,
              macroValues,
              macroTags,
            );
          }
          break;
        }
        default: {
          const scope = lvalue.identifier.scope;
          if (scope == null) {
            continue;
          }
          const macroDefinition = macroTags.get(lvalue.identifier.id);
          if (macroDefinition != null) {
            visitOperands(
              macroDefinition,
              scope,
              lvalue,
              value,
              macroValues,
              macroTags,
            );
          }
          break;
        }
      }
    }
    for (const phi of block.phis) {
      const scope = phi.place.identifier.scope;
      if (scope == null) {
        continue;
      }
      const macroDefinition = macroTags.get(phi.place.identifier.id);
      if (
        macroDefinition == null ||
        macroDefinition.level === InlineLevel.Shallow
      ) {
        continue;
      }
      macroValues.add(phi.place.identifier.id);
      for (const operand of phi.operands.values()) {
        operand.identifier.scope = scope;
        expandFbtScopeRange(scope.range, operand.identifier.mutableRange);
        macroTags.set(operand.identifier.id, macroDefinition);
        macroValues.add(operand.identifier.id);
      }
    }
  }
  return macroValues;
}

function expandFbtScopeRange(
  fbtRange: MutableRange,
  extendWith: MutableRange,
): void {
  if (extendWith.start !== 0) {
    fbtRange.start = makeInstructionId(
      Math.min(fbtRange.start, extendWith.start),
    );
  }
}

function visitOperands(
  macroDefinition: MacroDefinition,
  scope: ReactiveScope,
  lvalue: Place,
  value: InstructionValue,
  macroValues: Set<IdentifierId>,
  macroTags: Map<IdentifierId, MacroDefinition>,
): void {
  macroValues.add(lvalue.identifier.id);
  for (const operand of eachInstructionValueOperand(value)) {
    if (macroDefinition.level === InlineLevel.Transitive) {
      operand.identifier.scope = scope;
      expandFbtScopeRange(scope.range, operand.identifier.mutableRange);
      macroTags.set(operand.identifier.id, macroDefinition);
    }
    macroValues.add(operand.identifier.id);
  }
}
