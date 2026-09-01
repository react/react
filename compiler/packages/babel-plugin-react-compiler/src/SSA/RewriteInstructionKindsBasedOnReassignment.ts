/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {
  DeclarationId,
  GeneratedSource,
  HIRFunction,
  InstructionKind,
  LValue,
  LValuePattern,
  Place,
} from '../HIR/HIR';
import {printPlace} from '../HIR/PrintHIR';
import {eachPatternOperand} from '../HIR/visitors';

/**
 * This pass rewrites the InstructionKind of instructions which declare/assign variables,
 * converting the first declaration to a Const/Let depending on whether it is subsequently
 * reassigned, and ensuring that subsequent reassignments are marked as a Reassign. Note
 * that declarations which were const in the original program cannot become `let`, but the
 * inverse is not true: a `let` which was reassigned in the source may be converted to a
 * `const` if the reassignment is not used and was removed by dead code elimination.
 *
 * NOTE: this is a subset of the operations previously performed by the LeaveSSA pass.
 */
export function rewriteInstructionKindsBasedOnReassignment(
  fn: HIRFunction,
): void {
  const declarations = new Map<DeclarationId, LValue | LValuePattern>();
  for (const param of fn.params) {
    let place: Place = param.kind === 'Identifier' ? param : param.place;
    if (place.identifier.name !== null) {
      declarations.set(place.identifier.declarationId, {
        kind: InstructionKind.Let,
        place,
      });
    }
  }
  for (const place of fn.context) {
    if (place.identifier.name !== null) {
      declarations.set(place.identifier.declarationId, {
        kind: InstructionKind.Let,
        place,
      });
    }
  }
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      const {value} = instr;
      switch (value.kind) {
        case 'DeclareLocal': {
          const lvalue = value.lvalue;
          CompilerError.invariant(
            !declarations.has(lvalue.place.identifier.declarationId),
            {
              reason: `Expected variable not to be defined prior to declaration`,
              description: `${printPlace(lvalue.place)} was already defined`,
              loc: lvalue.place.loc,
            },
          );
          declarations.set(lvalue.place.identifier.declarationId, lvalue);
          break;
        }
        case 'StoreLocal': {
          const lvalue = value.lvalue;
          if (lvalue.place.identifier.name !== null) {
            const declaration = declarations.get(
              lvalue.place.identifier.declarationId,
            );
            if (declaration === undefined) {
              CompilerError.invariant(
                !declarations.has(lvalue.place.identifier.declarationId),
                {
                  reason: `Expected variable not to be defined prior to declaration`,
                  description: `${printPlace(lvalue.place)} was already defined`,
                  loc: lvalue.place.loc,
                },
              );
              declarations.set(lvalue.place.identifier.declarationId, lvalue);
              lvalue.kind = InstructionKind.Const;
            } else {
              declaration.kind = InstructionKind.Let;
              lvalue.kind = InstructionKind.Reassign;
            }
          }
          break;
        }
        case 'Destructure': {
          const lvalue = value.lvalue;
          let kind: InstructionKind | null = null;
          for (const place of eachPatternOperand(lvalue.pattern)) {
            if (place.identifier.name === null) {
              CompilerError.invariant(
                kind === null || kind === InstructionKind.Const,
                {
                  reason: `Expected consistent kind for destructuring`,
                  description: `other places were \`${kind}\` but '${printPlace(
                    place,
                  )}' is const`,
                  loc: place.loc,
                },
              );
              kind = InstructionKind.Const;
            } else {
              const declaration = declarations.get(
                place.identifier.declarationId,
              );
              if (declaration === undefined) {
                CompilerError.invariant(block.kind !== 'value', {
                  reason: `TODO: Handle reassignment in a value block where the original declaration was removed by dead code elimination (DCE)`,
                  loc: place.loc,
                });
                declarations.set(place.identifier.declarationId, lvalue);
                CompilerError.invariant(
                  kind === null || kind === InstructionKind.Const,
                  {
                    reason: `Expected consistent kind for destructuring`,
                    description: `Other places were \`${kind}\` but '${printPlace(
                      place,
                    )}' is const`,
                    loc: place.loc,
                  },
                );
                kind = InstructionKind.Const;
              } else {
                CompilerError.invariant(
                  kind === null || kind === InstructionKind.Reassign,
                  {
                    reason: `Expected consistent kind for destructuring`,
                    description: `Other places were \`${kind}\` but '${printPlace(
                      place,
                    )}' is reassigned`,
                    loc: place.loc,
                  },
                );
                kind = InstructionKind.Reassign;
                declaration.kind = InstructionKind.Let;
              }
            }
          }
          CompilerError.invariant(kind !== null, {
            reason: 'Expected at least one operand',
            loc: GeneratedSource,
          });
          lvalue.kind = kind;
          break;
        }
        case 'PostfixUpdate':
        case 'PrefixUpdate': {
          const lvalue = value.lvalue;
          const declaration = declarations.get(lvalue.identifier.declarationId);
          CompilerError.invariant(declaration !== undefined, {
            reason: `Expected variable to have been defined`,
            description: `No declaration for ${printPlace(lvalue)}`,
            loc: lvalue.loc,
          });
          declaration.kind = InstructionKind.Let;
          break;
        }
      }
    }
  }
}
