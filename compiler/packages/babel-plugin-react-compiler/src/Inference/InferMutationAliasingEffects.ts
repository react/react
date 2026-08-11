/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  CompilerDiagnostic,
  CompilerError,
  Effect,
  SourceLocation,
  ValueKind,
} from '..';
import {
  BasicBlock,
  BlockId,
  DeclarationId,
  Environment,
  FunctionExpression,
  GeneratedSource,
  getHookKind,
  HIRFunction,
  Hole,
  IdentifierId,
  Instruction,
  InstructionKind,
  InstructionValue,
  isArrayType,
  isJsxType,
  isMapType,
  isPrimitiveType,
  isRefOrRefValue,
  isSetType,
  makeIdentifierId,
  Phi,
  Place,
  SpreadPattern,
  Type,
  ValueReason,
} from '../HIR';
import {
  eachInstructionValueOperand,
  eachPatternItem,
  eachTerminalOperand,
  eachTerminalSuccessor,
} from '../HIR/visitors';

import {
  assertExhaustive,
  getOrInsertDefault,
  getOrInsertWith,
  Set_isSuperset,
} from '../Utils/utils';
import {
  printAliasingEffect,
  printAliasingSignature,
  printIdentifier,
  printInstruction,
  printInstructionValue,
  printPlace,
} from '../HIR/PrintHIR';
import {FunctionSignature} from '../HIR/ObjectShape';
import prettyFormat from 'pretty-format';
import {createTemporaryPlace} from '../HIR/HIRBuilder';
import {
  AliasingEffect,
  AliasingSignature,
  hashEffect,
  MutationReason,
} from './AliasingEffects';
import {ErrorCategory} from '../CompilerError';

const DEBUG = false;

/**
 * Infers the mutation/aliasing effects for instructions and terminals and annotates
 * them on the HIR, making the effects of builtin instructions/functions as well as
 * user-defined functions explicit. These effects then form the basis for subsequent
 * analysis to determine the mutable range of each value in the program — the set of
 * instructions over which the value is created and mutated — as well as validation
 * against invalid code.
 *
 * At a high level the approach is:
 * - Determine a set of candidate effects based purely on the syntax of the instruction
 *   and the types involved. These candidate effects are cached the first time each
 *   instruction is visited. The idea is to reason about the semantics of the instruction
 *   or function in isolation, separately from how those effects may interact with later
 *   abstract interpretation.
 * - Then we do abstract interpretation over the HIR, iterating until reaching a fixpoint.
 *   This phase tracks the abstract kind of each value (mutable, primitive, frozen, etc)
 *   and the set of values pointed to by each identifier. Each candidate effect is "applied"
 *   to the current abtract state, and effects may be dropped or rewritten accordingly.
 *   For example, a "MutateConditionally <x>" effect may be dropped if x is not a mutable
 *   value. A "Mutate <y>" effect may get converted into a "MutateFrozen <error>" effect
 *   if y is mutable, etc.
 */
export function inferMutationAliasingEffects(
  fn: HIRFunction,
  {isFunctionExpression}: {isFunctionExpression: boolean} = {
    isFunctionExpression: false,
  },
): void {
  const initialState = InferenceState.empty(fn.env, isFunctionExpression);

  // Map of blocks to the last (merged) incoming state that was processed
  const statesByBlock: Map<BlockId, InferenceState> = new Map();

  for (const ref of fn.context) {
    // TODO: using InstructionValue as a bit of a hack, but it's pragmatic
    const value: InstructionValue = {
      kind: 'ObjectExpression',
      properties: [],
      loc: ref.loc,
    };
    initialState.initialize(value, {
      kind: ValueKind.Context,
      reason: new Set([ValueReason.Other]),
    });
    initialState.define(ref, value);
  }

  const paramKind: AbstractValue = isFunctionExpression
    ? {
        kind: ValueKind.Mutable,
        reason: new Set([ValueReason.Other]),
      }
    : {
        kind: ValueKind.Frozen,
        reason: new Set([ValueReason.ReactiveFunctionArgument]),
      };

  if (fn.fnType === 'Component') {
    CompilerError.invariant(fn.params.length <= 2, {
      reason:
        'Expected React component to have not more than two parameters: one for props and for ref',
      loc: fn.loc,
    });
    const [props, ref] = fn.params;
    if (props != null) {
      inferParam(props, initialState, paramKind);
    }
    if (ref != null) {
      const place = ref.kind === 'Identifier' ? ref : ref.place;
      const value: InstructionValue = {
        kind: 'ObjectExpression',
        properties: [],
        loc: place.loc,
      };
      initialState.initialize(value, {
        kind: ValueKind.Mutable,
        reason: new Set([ValueReason.Other]),
      });
      initialState.define(place, value);
    }
  } else {
    for (const param of fn.params) {
      inferParam(param, initialState, paramKind);
    }
  }

  /*
   * Multiple predecessors may be visited prior to reaching a given successor,
   * so track the list of incoming state for each successor block.
   * These are merged when reaching that block again.
   */
  const queuedStates: Map<BlockId, InferenceState> = new Map();
  function queue(blockId: BlockId, state: InferenceState): void {
    let queuedState = queuedStates.get(blockId);
    if (queuedState != null) {
      // merge the queued states for this block
      state = queuedState.merge(state) ?? queuedState;
      queuedStates.set(blockId, state);
    } else {
      /*
       * this is the first queued state for this block, see whether
       * there are changed relative to the last time it was processed.
       */
      const prevState = statesByBlock.get(blockId);
      const nextState = prevState != null ? prevState.merge(state) : state;
      if (nextState != null) {
        queuedStates.set(blockId, nextState);
      }
    }
  }
  queue(fn.body.entry, initialState);

  const hoistedContextDeclarations = findHoistedContextDeclarations(fn);

  const context = new Context(
    isFunctionExpression,
    fn,
    hoistedContextDeclarations,
    findNonMutatedDestructureSpreads(fn),
  );

  let iterationCount = 0;
  while (queuedStates.size !== 0) {
    iterationCount++;
    if (iterationCount > 100) {
      CompilerError.invariant(false, {
        reason: `[InferMutationAliasingEffects] Potential infinite loop`,
        description: `A value, temporary place, or effect was not cached properly`,
        loc: fn.loc,
      });
    }
    for (const [blockId, block] of fn.body.blocks) {
      const incomingState = queuedStates.get(blockId);
      queuedStates.delete(blockId);
      if (incomingState == null) {
        continue;
      }

      statesByBlock.set(blockId, incomingState);
      const state = incomingState.clone();
      inferBlock(context, state, block);

      for (const nextBlockId of eachTerminalSuccessor(block.terminal)) {
        queue(nextBlockId, state);
      }
    }
  }
  return;
}

function findHoistedContextDeclarations(
  fn: HIRFunction,
): Map<DeclarationId, Place | null> {
  const hoisted = new Map<DeclarationId, Place | null>();
  function visit(place: Place): void {
    if (
      hoisted.has(place.identifier.declarationId) &&
      hoisted.get(place.identifier.declarationId) == null
    ) {
      // If this is the first load of the value, store the location
      hoisted.set(place.identifier.declarationId, place);
    }
  }
  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      if (instr.value.kind === 'DeclareContext') {
        const kind = instr.value.lvalue.kind;
        if (
          kind == InstructionKind.HoistedConst ||
          kind == InstructionKind.HoistedFunction ||
          kind == InstructionKind.HoistedLet
        ) {
          hoisted.set(instr.value.lvalue.place.identifier.declarationId, null);
        }
      } else {
        for (const operand of eachInstructionValueOperand(instr.value)) {
          visit(operand);
        }
      }
    }
    for (const operand of eachTerminalOperand(block.terminal)) {
      visit(operand);
    }
  }
  return hoisted;
}

class Context {
  internedEffects: Map<string, AliasingEffect> = new Map();
  instructionSignatureCache: Map<Instruction, InstructionSignature> = new Map();
  effectInstructionValueCache: Map<AliasingEffect, InstructionValue> =
    new Map();
  applySignatureCache: Map<
    AliasingSignature,
    Map<AliasingEffect, Array<AliasingEffect> | null>
  > = new Map();
  catchHandlers: Map<BlockId, Place> = new Map();
  functionSignatureCache: Map<FunctionExpression, AliasingSignature> =
    new Map();
  isFuctionExpression: boolean;
  fn: HIRFunction;
  hoistedContextDeclarations: Map<DeclarationId, Place | null>;
  nonMutatingSpreads: Set<IdentifierId>;

  constructor(
    isFunctionExpression: boolean,
    fn: HIRFunction,
    hoistedContextDeclarations: Map<DeclarationId, Place | null>,
    nonMutatingSpreads: Set<IdentifierId>,
  ) {
    this.isFuctionExpression = isFunctionExpression;
    this.fn = fn;
    this.hoistedContextDeclarations = hoistedContextDeclarations;
    this.nonMutatingSpreads = nonMutatingSpreads;
  }

  cacheApplySignature(
    signature: AliasingSignature,
    effect: Extract<AliasingEffect, {kind: 'Apply'}>,
    f: () => Array<AliasingEffect> | null,
  ): Array<AliasingEffect> | null {
    const inner = getOrInsertDefault(
      this.applySignatureCache,
      signature,
      new Map(),
    );
    return getOrInsertWith(inner, effect, f);
  }

  internEffect(effect: AliasingEffect): AliasingEffect {
    const hash = hashEffect(effect);
    let interned = this.internedEffects.get(hash);
    if (interned == null) {
      this.internedEffects.set(hash, effect);
      interned = effect;
    }
    return interned;
  }
}

/**
 * Finds objects created via ObjectPattern spread destructuring
 * (`const {x, ...spread} = ...`) where a) the rvalue is known frozen and
 * b) the spread value cannot possibly be directly mutated. The idea is that
 * for this set of values, we can treat the spread object as frozen.
 *
 * The primary use case for this is props spreading:
 *
 * ```
 * function Component({prop, ...otherProps}) {
 *   const transformedProp = transform(prop, otherProps.foo);
 *   // pass `otherProps` down:
 *   return <Foo {...otherProps} prop={transformedProp} />;
 * }
 * ```
 *
 * Here we know that since `otherProps` cannot be mutated, we don't have to treat
 * it as mutable: `otherProps.foo` only reads a value that must be frozen, so it
 * can be treated as frozen too.
 */
function findNonMutatedDestructureSpreads(fn: HIRFunction): Set<IdentifierId> {
  const knownFrozen = new Set<IdentifierId>();
  if (fn.fnType === 'Component') {
    const [props] = fn.params;
    if (props != null && props.kind === 'Identifier') {
      knownFrozen.add(props.identifier.id);
    }
  } else {
    for (const param of fn.params) {
      if (param.kind === 'Identifier') {
        knownFrozen.add(param.identifier.id);
      }
    }
  }

  // Map of temporaries to identifiers for spread objects
  const candidateNonMutatingSpreads = new Map<IdentifierId, IdentifierId>();
  for (const block of fn.body.blocks.values()) {
    if (candidateNonMutatingSpreads.size !== 0) {
      for (const phi of block.phis) {
        for (const operand of phi.operands.values()) {
          const spread = candidateNonMutatingSpreads.get(operand.identifier.id);
          if (spread != null) {
            candidateNonMutatingSpreads.delete(spread);
          }
        }
      }
    }
    for (const instr of block.instructions) {
      const {lvalue, value} = instr;
      switch (value.kind) {
        case 'Destructure': {
          if (
            !knownFrozen.has(value.value.identifier.id) ||
            !(
              value.lvalue.kind === InstructionKind.Let ||
              value.lvalue.kind === InstructionKind.Const
            ) ||
            value.lvalue.pattern.kind !== 'ObjectPattern'
          ) {
            continue;
          }
          for (const item of value.lvalue.pattern.properties) {
            if (item.kind !== 'Spread') {
              continue;
            }
            candidateNonMutatingSpreads.set(
              item.place.identifier.id,
              item.place.identifier.id,
            );
          }
          break;
        }
        case 'LoadLocal': {
          const spread = candidateNonMutatingSpreads.get(
            value.place.identifier.id,
          );
          if (spread != null) {
            candidateNonMutatingSpreads.set(lvalue.identifier.id, spread);
          }
          break;
        }
        case 'StoreLocal': {
          const spread = candidateNonMutatingSpreads.get(
            value.value.identifier.id,
          );
          if (spread != null) {
            candidateNonMutatingSpreads.set(lvalue.identifier.id, spread);
            candidateNonMutatingSpreads.set(
              value.lvalue.place.identifier.id,
              spread,
            );
          }
          break;
        }
        case 'JsxFragment':
        case 'JsxExpression': {
          // Passing objects created with spread to jsx can't mutate them
          break;
        }
        case 'PropertyLoad': {
          // Properties must be frozen since the original value was frozen
          break;
        }
        case 'CallExpression':
        case 'MethodCall': {
          const callee =
            value.kind === 'CallExpression' ? value.callee : value.property;
          if (getHookKind(fn.env, callee.identifier) != null) {
            // Hook calls have frozen arguments, and non-ref returns are frozen
            if (!isRefOrRefValue(lvalue.identifier)) {
              knownFrozen.add(lvalue.identifier.id);
            }
          } else {
            // Non-hook calls check their operands, since they are potentially mutable
            if (candidateNonMutatingSpreads.size !== 0) {
              // Otherwise any reference to the spread object itself may mutate
              for (const operand of eachInstructionValueOperand(value)) {
                const spread = candidateNonMutatingSpreads.get(
                  operand.identifier.id,
                );
                if (spread != null) {
                  candidateNonMutatingSpreads.delete(spread);
                }
              }
            }
          }
          break;
        }
        default: {
          if (candidateNonMutatingSpreads.size !== 0) {
            // Otherwise any reference to the spread object itself may mutate
            for (const operand of eachInstructionValueOperand(value)) {
              const spread = candidateNonMutatingSpreads.get(
                operand.identifier.id,
              );
              if (spread != null) {
                candidateNonMutatingSpreads.delete(spread);
              }
            }
          }
        }
      }
    }
  }

  const nonMutatingSpreads = new Set<IdentifierId>();
  for (const [key, value] of candidateNonMutatingSpreads) {
    if (key === value) {
      nonMutatingSpreads.add(key);
    }
  }
  return nonMutatingSpreads;
}

function inferParam(
  param: Place | SpreadPattern,
  initialState: InferenceState,
  paramKind: AbstractValue,
): void {
  const place = param.kind === 'Identifier' ? param : param.place;
  const value: InstructionValue = {
    kind: 'Primitive',
    loc: place.loc,
    value: undefined,
  };
  initialState.initialize(value, paramKind);
  initialState.define(place, value);
}

function inferBlock(
  context: Context,
  state: InferenceState,
  block: BasicBlock,
): void {
  for (const phi of block.phis) {
    state.inferPhi(phi);
  }

  for (const instr of block.instructions) {
    let instructionSignature = context.instructionSignatureCache.get(instr);
    if (instructionSignature == null) {
      instructionSignature = computeSignatureForInstruction(
        context,
        state.env,
        instr,
      );
      context.instructionSignatureCache.set(instr, instructionSignature);
    }
    const effects = applySignature(context, state, instructionSignature, instr);
    instr.effects = effects;
  }
  const terminal = block.terminal;
  if (terminal.kind === 'try' && terminal.handlerBinding != null) {
    context.catchHandlers.set(terminal.handler, terminal.handlerBinding);
  } else if (terminal.kind === 'maybe-throw' && terminal.handler !== null) {
    const handlerParam = context.catchHandlers.get(terminal.handler);
    if (handlerParam != null) {
      CompilerError.invariant(state.kind(handlerParam) != null, {
        reason:
          'Expected catch binding to be initialized with a DeclareLocal Catch instruction',
        loc: terminal.loc,
      });
      const effects: Array<AliasingEffect> = [];
      for (const instr of block.instructions) {
        if (
          instr.value.kind === 'CallExpression' ||
          instr.value.kind === 'MethodCall'
        ) {
          /**
           * Many instructions can error, but only calls can throw their result as the error
           * itself. For example, `c = a.b` can throw if `a` is nullish, but the thrown value
           * is an error object synthesized by the JS runtime. Whereas `throwsInput(x)` can
           * throw (effectively) the result of the call.
           *
           * TODO: call applyEffect() instead. This meant that the catch param wasn't inferred
           * as a mutable value, though. See `try-catch-try-value-modified-in-catch-escaping.js`
           * fixture as an example
           */
          state.appendAlias(handlerParam, instr.lvalue);
          const kind = state.kind(instr.lvalue).kind;
          if (kind === ValueKind.Mutable || kind == ValueKind.Context) {
            effects.push(
              context.internEffect({
                kind: 'Alias',
                from: instr.lvalue,
                into: handlerParam,
              }),
            );
          }
        }
      }
      terminal.effects = effects.length !== 0 ? effects : null;
    }
  } else if (terminal.kind === 'return') {
    if (!context.isFuctionExpression) {
      terminal.effects = [
        context.internEffect({
          kind: 'Freeze',
          value: terminal.value,
          reason: ValueReason.JsxCaptured,
        }),
      ];
    }
  }
}

/**
 * Applies the signature to the given state to determine the precise set of effects
 * that will occur in practice. This takes into account the inferred state of each
 * variable. For example, the signature may have a `ConditionallyMutate x` effect.
 * Here, we check the abstract type of `x` and either record a `Mutate x` if x is mutable
 * or no effect if x is a primitive, global, or frozen.
 *
 * This phase may also emit errors, for example MutateLocal on a frozen value is invalid.
 */
function applySignature(
  context: Context,
  state: InferenceState,
  signature: InstructionSignature,
  instruction: Instruction,
): Array<AliasingEffect> | null {
  const effects: Array<AliasingEffect> = [];
  /**
   * For function instructions, eagerly validate that they aren't mutating
   * a known-frozen value.
   *
   * TODO: make sure we're also validating against global mutations somewhere, but
   * account for this being allowed in effects/event handlers.
   */
  if (
    instruction.value.kind === 'FunctionExpression' ||
    instruction.value.kind === 'ObjectMethod'
  ) {
    const aliasingEffects =
      instruction.value.loweredFunc.func.aliasingEffects ?? [];
    const context = new Set(
      instruction.value.loweredFunc.func.context.map(p => p.identifier.id),
    );
    for (const effect of aliasingEffects) {
      if (effect.kind === 'Mutate' || effect.kind === 'MutateTransitive') {
        if (!context.has(effect.value.identifier.id)) {
          continue;
        }
        const value = state.kind(effect.value);
        switch (value.kind) {
          case ValueKind.Frozen: {
            const reason = getWriteErrorReason({
              kind: value.kind,
              reason: value.reason,
            });
            const variable =
              effect.value.identifier.name !== null &&
              effect.value.identifier.name.kind === 'named'
                ? `\`${effect.value.identifier.name.value}\``
                : 'value';
            const diagnostic = CompilerDiagnostic.create({
              category: ErrorCategory.Immutability,
              reason: 'This value cannot be modified',
              description: reason,
            }).withDetails({
              kind: 'error',
              loc: effect.value.loc,
              message: `${variable} cannot be modified`,
            });
            if (
              effect.kind === 'Mutate' &&
              effect.reason?.kind === 'AssignCurrentProperty'
            ) {
              diagnostic.withDetails({
                kind: 'hint',
                message: `Hint: If this value is a Ref (value returned by \`useRef()\`), rename the variable to end in "Ref".`,
              });
            }
            effects.push({
              kind: 'MutateFrozen',
              place: effect.value,
              error: diagnostic,
            });
          }
        }
      }
    }
  }

  /*
   * Track which values we've already aliased once, so that we can switch to
   * appendAlias() for subsequent aliases into the same value
   */
  const initialized = new Set<IdentifierId>();

  if (DEBUG) {
    console.log(printInstruction(instruction));
  }

  for (const effect of signature.effects) {
    applyEffect(context, state, effect, initialized, effects);
  }
  if (DEBUG) {
    console.log(
      prettyFormat(state.debugAbstractValue(state.kind(instruction.lvalue))),
    );
    console.log(
      effects.map(effect => `  ${printAliasingEffect(effect)}`).join('\n'),
    );
  }
  if (
    !(state.isDefined(instruction.lvalue) && state.kind(instruction.lvalue))
  ) {
    CompilerError.invariant(false, {
      reason: `Expected instruction lvalue to be initialized`,
      loc: instruction.loc,
    });
  }
  return effects.length !== 0 ? effects : null;
}

function applyEffect(
  context: Context,
  state: InferenceState,
  _effect: AliasingEffect,
  initialized: Set<IdentifierId>,
  effects: Array<AliasingEffect>,
): void {
  const effect = context.internEffect(_effect);
  if (DEBUG) {
    console.log(printAliasingEffect(effect));
  }
  switch (effect.kind) {
    case 'Freeze': {
      const didFreeze = state.freeze(effect.value, effect.reason);
      if (didFreeze) {
        effects.push(effect);
      }
      break;
    }
    case 'Create': {
      CompilerError.invariant(!initialized.has(effect.into.identifier.id), {
        reason: `Cannot re-initialize variable within an instruction`,
        description: `Re-initialized ${printPlace(effect.into)} in ${printAliasingEffect(effect)}`,
        loc: effect.into.loc,
      });
      initialized.add(effect.into.identifier.id);

      let value = context.effectInstructionValueCache.get(effect);
      if (value == null) {
        value = {
          kind: 'ObjectExpression',
          properties: [],
          loc: effect.into.loc,
        };
        context.effectInstructionValueCache.set(effect, value);
      }
      state.initialize(value, {
        kind: effect.value,
        reason: new Set([effect.reason]),
      });
      state.define(effect.into, value);
      effects.push(effect);
      break;
    }
    case 'ImmutableCapture': {
      const kind = state.kind(effect.from).kind;
      switch (kind) {
        case ValueKind.Global:
        case ValueKind.Primitive: {
          // no-op: we don't need to track data flow for copy types
          break;
        }
        default: {
          effects.push(effect);
        }
      }
      break;
    }
    case 'CreateFrom': {
      CompilerError.invariant(!initialized.has(effect.into.identifier.id), {
        reason: `Cannot re-initialize variable within an instruction`,
        description: `Re-initialized ${printPlace(effect.into)} in ${printAliasingEffect(effect)}`,
        loc: effect.into.loc,
      });
      initialized.add(effect.into.identifier.id);

      const fromValue = state.kind(effect.from);
      let value = context.effectInstructionValueCache.get(effect);
      if (value == null) {
        value = {
          kind: 'ObjectExpression',
          properties: [],
          loc: effect.into.loc,
        };
        context.effectInstructionValueCache.set(effect, value);
      }
      state.initialize(value, {
        kind: fromValue.kind,
        reason: new Set(fromValue.reason),
      });
      state.define(effect.into, value);
      switch (fromValue.kind) {
        case ValueKind.Primitive:
        case ValueKind.Global: {
          effects.push({
            kind: 'Create',
            value: fromValue.kind,
            into: effect.into,
            reason: [...fromValue.reason][0] ?? ValueReason.Other,
          });
          break;
        }
        case ValueKind.Frozen: {
          effects.push({
            kind: 'Create',
            value: fromValue.kind,
            into: effect.into,
            reason: [...fromValue.reason][0] ?? ValueReason.Other,
          });
          applyEffect(
            context,
            state,
            {
              kind: 'ImmutableCapture',
              from: effect.from,
              into: effect.into,
            },
            initialized,
            effects,
          );
          break;
        }
        default: {
          effects.push(effect);
        }
      }
      break;
    }
    case 'CreateFunction': {
      CompilerError.invariant(!initialized.has(effect.into.identifier.id), {
        reason: `Cannot re-initialize variable within an instruction`,
        description: `Re-initialized ${printPlace(effect.into)} in ${printAliasingEffect(effect)}`,
        loc: effect.into.loc,
      });
      initialized.add(effect.into.identifier.id);

      effects.push(effect);
      /**
       * We consider the function mutable if it has any mutable context variables or
       * any side-effects that need to be tracked if the function is called.
       */
      const hasCaptures = effect.captures.some(capture => {
        switch (state.kind(capture).kind) {
          case ValueKind.Context:
          case ValueKind.Mutable: {
            return true;
          }
          default: {
            return false;
          }
        }
      });
      const hasTrackedSideEffects =
        effect.function.loweredFunc.func.aliasingEffects?.some(
          effect =>
            // TODO; include "render" here?
            effect.kind === 'MutateFrozen' ||
            effect.kind === 'MutateGlobal' ||
            effect.kind === 'Impure',
        );
      // For legacy compatibility
      const capturesRef = effect.function.loweredFunc.func.context.some(
        operand => isRefOrRefValue(operand.identifier),
      );
      const isMutable = hasCaptures || hasTrackedSideEffects || capturesRef;
      for (const operand of effect.function.loweredFunc.func.context) {
        if (operand.effect !== Effect.Capture) {
          continue;
        }
        const kind = state.kind(operand).kind;
        if (
          kind === ValueKind.Primitive ||
          kind == ValueKind.Frozen ||
          kind == ValueKind.Global
        ) {
          operand.effect = Effect.Read;
        }
      }
      state.initialize(effect.function, {
        kind: isMutable ? ValueKind.Mutable : ValueKind.Frozen,
        reason: new Set([]),
      });
      state.define(effect.into, effect.function);
      for (const capture of effect.captures) {
        applyEffect(
          context,
          state,
          {
            kind: 'Capture',
            from: capture,
            into: effect.into,
          },
          initialized,
          effects,
        );
      }
      break;
    }
    case 'MaybeAlias':
    case 'Alias':
    case 'Capture': {
      CompilerError.invariant(
        effect.kind === 'Capture' ||
          effect.kind === 'MaybeAlias' ||
          initialized.has(effect.into.identifier.id),
        {
          reason: `Expected destination to already be initialized within this instruction`,
          description:
            `Destination ${printPlace(effect.into)} is not initialized in this ` +
            `instruction for effect ${printAliasingEffect(effect)}`,
          loc: effect.into.loc,
        },
      );
      /*
       * Capture describes potential information flow: storing a pointer to one value
       * within another. If the destination is not mutable, or the source value has
       * copy-on-write semantics, then we can prune the effect
       */
      const intoKind = state.kind(effect.into).kind;
      let destinationType: 'context' | 'mutable' | null = null;
      switch (intoKind) {
        case ValueKind.Context: {
          destinationType = 'context';
          break;
        }
        case ValueKind.Mutable:
        case ValueKind.MaybeFrozen: {
          destinationType = 'mutable';
          break;
        }
      }
      const fromKind = state.kind(effect.from).kind;
      let sourceType: 'context' | 'mutable' | 'frozen' | null = null;
      switch (fromKind) {
        case ValueKind.Context: {
          sourceType = 'context';
          break;
        }
        case ValueKind.Global:
        case ValueKind.Primitive: {
          break;
        }
        case ValueKind.MaybeFrozen:
        case ValueKind.Frozen: {
          sourceType = 'frozen';
          break;
        }
        default: {
          sourceType = 'mutable';
          break;
        }
      }

      if (sourceType === 'frozen') {
        applyEffect(
          context,
          state,
          {
            kind: 'ImmutableCapture',
            from: effect.from,
            into: effect.into,
          },
          initialized,
          effects,
        );
      } else if (
        (sourceType === 'mutable' && destinationType === 'mutable') ||
        effect.kind === 'MaybeAlias'
      ) {
        effects.push(effect);
      } else if (
        (sourceType === 'context' && destinationType != null) ||
        (sourceType === 'mutable' && destinationType === 'context')
      ) {
        applyEffect(
          context,
          state,
          {kind: 'MaybeAlias', from: effect.from, into: effect.into},
          initialized,
          effects,
        );
      }
      break;
    }
    case 'Assign': {
      CompilerError.invariant(!initialized.has(effect.into.identifier.id), {
        reason: `Cannot re-initialize variable within an instruction`,
        description: `Re-initialized ${printPlace(effect.into)} in ${printAliasingEffect(effect)}`,
        loc: effect.into.loc,
      });
      initialized.add(effect.into.identifier.id);

      /*
       * Alias represents potential pointer aliasing. If the type is a global,
       * a primitive (copy-on-write semantics) then we can prune the effect
       */
      const fromValue = state.kind(effect.from);
      const fromKind = fromValue.kind;
      switch (fromKind) {
        case ValueKind.Frozen: {
          applyEffect(
            context,
            state,
            {
              kind: 'ImmutableCapture',
              from: effect.from,
              into: effect.into,
            },
            initialized,
            effects,
          );
          let value = context.effectInstructionValueCache.get(effect);
          if (value == null) {
            value = {
              kind: 'Primitive',
              value: undefined,
              loc: effect.from.loc,
            };
            context.effectInstructionValueCache.set(effect, value);
          }
          state.initialize(value, {
            kind: fromKind,
            reason: new Set(fromValue.reason),
          });
          state.define(effect.into, value);
          break;
        }
        case ValueKind.Global:
        case ValueKind.Primitive: {
          let value = context.effectInstructionValueCache.get(effect);
          if (value == null) {
            value = {
              kind: 'Primitive',
              value: undefined,
              loc: effect.from.loc,
            };
            context.effectInstructionValueCache.set(effect, value);
          }
          state.initialize(value, {
            kind: fromKind,
            reason: new Set(fromValue.reason),
          });
          state.define(effect.into, value);
          break;
        }
        default: {
          state.assign(effect.into, effect.from);
          effects.push(effect);
          break;
        }
      }
      break;
    }
    case 'Apply': {
      const functionValues = state.values(effect.function);
      if (
        functionValues.length === 1 &&
        functionValues[0].kind === 'FunctionExpression' &&
        functionValues[0].loweredFunc.func.aliasingEffects != null
      ) {
        /*
         * We're calling a locally declared function, we already know it's effects!
         * We just have to substitute in the args for the params
         */
        const functionExpr = functionValues[0];
        let signature = context.functionSignatureCache.get(functionExpr);
        if (signature == null) {
          signature = buildSignatureFromFunctionExpression(
            state.env,
            functionExpr,
          );
          context.functionSignatureCache.set(functionExpr, signature);
        }
        if (DEBUG) {
          console.log(
            `constructed alias signature:\n${printAliasingSignature(signature)}`,
          );
        }
        const signatureEffects = context.cacheApplySignature(
          signature,
          effect,
          () =>
            computeEffectsForSignature(
              state.env,
              signature,
              effect.into,
              effect.receiver,
              effect.args,
              functionExpr.loweredFunc.func.context,
              effect.loc,
            ),
        );
        if (signatureEffects != null) {
          applyEffect(
            context,
            state,
            {kind: 'MutateTransitiveConditionally', value: effect.function},
            initialized,
            effects,
          );
          for (const signatureEffect of signatureEffects) {
            applyEffect(context, state, signatureEffect, initialized, effects);
          }
          break;
        }
      }
      let signatureEffects = null;
      if (effect.signature?.aliasing != null) {
        const signature = effect.signature.aliasing;
        signatureEffects = context.cacheApplySignature(
          effect.signature.aliasing,
          effect,
          () =>
            computeEffectsForSignature(
              state.env,
              signature,
              effect.into,
              effect.receiver,
              effect.args,
              [],
              effect.loc,
            ),
        );
      }
      if (signatureEffects != null) {
        for (const signatureEffect of signatureEffects) {
          applyEffect(context, state, signatureEffect, initialized, effects);
        }
      } else if (effect.signature != null) {
        const legacyEffects = computeEffectsForLegacySignature(
          state,
          effect.signature,
          effect.into,
          effect.receiver,
          effect.args,
          effect.loc,
        );
        for (const legacyEffect of legacyEffects) {
          applyEffect(context, state, legacyEffect, initialized, effects);
        }
      } else {
        applyEffect(
          context,
          state,
          {
            kind: 'Create',
            into: effect.into,
            value: ValueKind.Mutable,
            reason: ValueReason.Other,
          },
          initialized,
          effects,
        );
        /*
         * If no signature then by default:
         * - All operands are conditionally mutated, except some instruction
         *   variants are assumed to not mutate the callee (such as `new`)
         * - All operands are captured into (but not directly aliased as)
         *   every other argument.
         */
        for (const arg of [effect.receiver, effect.function, ...effect.args]) {
          if (arg.kind === 'Hole') {
            continue;
          }
          const operand = arg.kind === 'Identifier' ? arg : arg.place;
          if (operand !== effect.function || effect.mutatesFunction) {
            applyEffect(
              context,
              state,
              {
                kind: 'MutateTransitiveConditionally',
                value: operand,
              },
              initialized,
              effects,
            );
          }
          const mutateIterator =
            arg.kind === 'Spread' ? conditionallyMutateIterator(operand) : null;
          if (mutateIterator) {
            applyEffect(context, state, mutateIterator, initialized, effects);
          }
          applyEffect(
            context,
            state,
            // OK: recording information flow
            {kind: 'MaybeAlias', from: operand, into: effect.into},
            initialized,
            effects,
          );
          for (const otherArg of [
            effect.receiver,
            effect.function,
            ...effect.args,
          ]) {
            if (otherArg.kind === 'Hole') {
              continue;
            }
            const other =
              otherArg.kind === 'Identifier' ? otherArg : otherArg.place;
            if (other === arg) {
              continue;
            }
            applyEffect(
              context,
              state,
              {
                /*
                 * OK: a function might store one operand into another,
                 * but it can't force one to alias another
                 */
                kind: 'Capture',
                from: operand,
                into: other,
              },
              initialized,
              effects,
            );
          }
        }
      }
      break;
    }
    case 'Mutate':
    case 'MutateConditionally':
    case 'MutateTransitive':
    case 'MutateTransitiveConditionally': {
      const mutationKind = state.mutate(effect.kind, effect.value);
      if (mutationKind === 'mutate') {
        effects.push(effect);
      } else if (mutationKind === 'mutate-ref') {
        // no-op
      } else if (
        mutationKind !== 'none' &&
        (effect.kind === 'Mutate' || effect.kind === 'MutateTransitive')
      ) {
        const value = state.kind(effect.value);
        if (DEBUG) {
          console.log(`invalid mutation: ${printAliasingEffect(effect)}`);
          console.log(prettyFormat(state.debugAbstractValue(value)));
        }

        if (
          mutationKind === 'mutate-frozen' &&
          context.hoistedContextDeclarations.has(
            effect.value.identifier.declarationId,
          )
        ) {
          const variable =
            effect.value.identifier.name !== null &&
            effect.value.identifier.name.kind === 'named'
              ? `\`${effect.value.identifier.name.value}\``
              : null;
          const hoistedAccess = context.hoistedContextDeclarations.get(
            effect.value.identifier.declarationId,
          );
          const diagnostic = CompilerDiagnostic.create({
            category: ErrorCategory.Immutability,
            reason: 'Cannot access variable before it is declared',
            description: `${variable ?? 'This variable'} is accessed before it is declared, which prevents the earlier access from updating when this value changes over time`,
          });
          if (hoistedAccess != null && hoistedAccess.loc != effect.value.loc) {
            diagnostic.withDetails({
              kind: 'error',
              loc: hoistedAccess.loc,
              message: `${variable ?? 'variable'} accessed before it is declared`,
            });
          }
          diagnostic.withDetails({
            kind: 'error',
            loc: effect.value.loc,
            message: `${variable ?? 'variable'} is declared here`,
          });

          applyEffect(
            context,
            state,
            {
              kind: 'MutateFrozen',
              place: effect.value,
              error: diagnostic,
            },
            initialized,
            effects,
          );
        } else {
          const reason = getWriteErrorReason({
            kind: value.kind,
            reason: value.reason,
          });
          const variable =
            effect.value.identifier.name !== null &&
            effect.value.identifier.name.kind === 'named'
              ? `\`${effect.value.identifier.name.value}\``
              : 'value';
          const diagnostic = CompilerDiagnostic.create({
            category: ErrorCategory.Immutability,
            reason: 'This value cannot be modified',
            description: reason,
          }).withDetails({
            kind: 'error',
            loc: effect.value.loc,
            message: `${variable} cannot be modified`,
          });
          if (
            effect.kind === 'Mutate' &&
            effect.reason?.kind === 'AssignCurrentProperty'
          ) {
            diagnostic.withDetails({
              kind: 'hint',
              message: `Hint: If this value is a Ref (value returned by \`useRef()\`), rename the variable to end in "Ref".`,
            });
          }
          applyEffect(
            context,
            state,
            {
              kind:
                value.kind === ValueKind.Frozen
                  ? 'MutateFrozen'
                  : 'MutateGlobal',
              place: effect.value,
              error: diagnostic,
            },
            initialized,
            effects,
          );
        }
      }
      break;
    }
    case 'Impure':
    case 'Render':
    case 'MutateFrozen':
    case 'MutateGlobal': {
      effects.push(effect);
      break;
    }
    default: {
      assertExhaustive(
        effect,
        `Unexpected effect kind '${(effect as any).kind as any}'`,
      );
    }
  }
}

class InferenceState {
  env: Environment;
  #isFunctionExpression: boolean;

  // The kind of each value, based on its allocation site
  #values: Map<InstructionValue, AbstractValue>;
  /*
   * The set of values pointed to by each identifier. This is a set
   * to accommodate phi points (where a variable may have different
   * values from different control flow paths).
   */
  #variables: Map<IdentifierId, Set<InstructionValue>>;

  constructor(
    env: Environment,
    isFunctionExpression: boolean,
    values: Map<InstructionValue, AbstractValue>,
    variables: Map<IdentifierId, Set<InstructionValue>>,
  ) {
    this.env = env;
    this.#isFunctionExpression = isFunctionExpression;
    this.#values = values;
    this.#variables = variables;
  }

  static empty(
    env: Environment,
    isFunctionExpression: boolean,
  ): InferenceState {
    return new InferenceState(env, isFunctionExpression, new Map(), new Map());
  }

  get isFunctionExpression(): boolean {
    return this.#isFunctionExpression;
  }

  // (Re)initializes a @param value with its default @param kind.
  initialize(value: InstructionValue, kind: AbstractValue): void {
    CompilerError.invariant(value.kind !== 'LoadLocal', {
      reason:
        '[InferMutationAliasingEffects] Expected all top-level identifiers to be defined as variables, not values',
      loc: value.loc,
    });
    this.#values.set(value, kind);
  }

  values(place: Place): Array<InstructionValue> {
    const values = this.#variables.get(place.identifier.id);
    CompilerError.invariant(values != null, {
      reason: `[InferMutationAliasingEffects] Expected value kind to be initialized`,
      description: `${printPlace(place)}`,
      message: 'this is uninitialized',
      loc: place.loc,
    });
    return Array.from(values);
  }

  // Lookup the kind of the given @param value.
  kind(place: Place): AbstractValue {
    const values = this.#variables.get(place.identifier.id);
    CompilerError.invariant(values != null, {
      reason: `[InferMutationAliasingEffects] Expected value kind to be initialized`,
      description: `${printPlace(place)}`,
      message: 'this is uninitialized',
      loc: place.loc,
    });
    let mergedKind: AbstractValue | null = null;
    for (const value of values) {
      const kind = this.#values.get(value)!;
      mergedKind =
        mergedKind !== null ? mergeAbstractValues(mergedKind, kind) : kind;
    }
    CompilerError.invariant(mergedKind !== null, {
      reason: `[InferMutationAliasingEffects] Expected at least one value`,
      description: `No value found at \`${printPlace(place)}\``,
      loc: place.loc,
    });
    return mergedKind;
  }

  // Updates the value at @param place to point to the same value as @param value.
  assign(place: Place, value: Place): void {
    const values = this.#variables.get(value.identifier.id);
    CompilerError.invariant(values != null, {
      reason: `[InferMutationAliasingEffects] Expected value for identifier to be initialized`,
      description: `${printIdentifier(value.identifier)}`,
      message: 'Expected value for identifier to be initialized',
      loc: value.loc,
    });
    this.#variables.set(place.identifier.id, new Set(values));
  }

  appendAlias(place: Place, value: Place): void {
    const values = this.#variables.get(value.identifier.id);
    CompilerError.invariant(values != null, {
      reason: `[InferMutationAliasingEffects] Expected value for identifier to be initialized`,
      description: `${printIdentifier(value.identifier)}`,
      message: 'Expected value for identifier to be initialized',
      loc: value.loc,
    });
    const prevValues = this.values(place);
    this.#variables.set(
      place.identifier.id,
      new Set([...prevValues, ...values]),
    );
  }

  // Defines (initializing or updating) a variable with a specific kind of value.
  define(place: Place, value: InstructionValue): void {
    CompilerError.invariant(this.#values.has(value), {
      reason: `[InferMutationAliasingEffects] Expected value to be initialized`,
      description: printInstructionValue(value),
      loc: value.loc,
    });
    this.#variables.set(place.identifier.id, new Set([value]));
  }

  isDefined(place: Place): boolean {
    return this.#variables.has(place.identifier.id);
  }

  /**
   * Marks @param place as transitively frozen. Returns true if the value was not
   * already frozen, false if the value is already frozen (or already known immutable).
   */
  freeze(place: Place, reason: ValueReason): boolean {
    const value = this.kind(place);
    switch (value.kind) {
      case ValueKind.Context:
      case ValueKind.Mutable:
      case ValueKind.MaybeFrozen: {
        const values = this.values(place);
        for (const instrValue of values) {
          this.freezeValue(instrValue, reason);
        }
        return true;
      }
      case ValueKind.Frozen:
      case ValueKind.Global:
      case ValueKind.Primitive: {
        return false;
      }
      default: {
        assertExhaustive(
          value.kind,
          `Unexpected value kind '${(value as any).kind}'`,
        );
      }
    }
  }

  freezeValue(value: InstructionValue, reason: ValueReason): void {
    this.#values.set(value, {
      kind: ValueKind.Frozen,
      reason: new Set([reason]),
    });
    if (
      value.kind === 'FunctionExpression' &&
      (this.env.config.enablePreserveExistingMemoizationGuarantees ||
        this.env.config.enableTransitivelyFreezeFunctionExpressions)
    ) {
      for (const place of value.loweredFunc.func.context) {
        this.freeze(place, reason);
      }
    }
  }

  mutate(
    variant:
      | 'Mutate'
      | 'MutateConditionally'
      | 'MutateTransitive'
      | 'MutateTransitiveConditionally',
    place: Place,
  ): 'none' | 'mutate' | 'mutate-frozen' | 'mutate-global' | 'mutate-ref' {
    if (isRefOrRefValue(place.identifier)) {
      return 'mutate-ref';
    }
    const kind = this.kind(place).kind;
    switch (variant) {
      case 'MutateConditionally':
      case 'MutateTransitiveConditionally': {
        switch (kind) {
          case ValueKind.Mutable:
          case ValueKind.Context: {
            return 'mutate';
          }
          default: {
            return 'none';
          }
        }
      }
      case 'Mutate':
      case 'MutateTransitive': {
        switch (kind) {
          case ValueKind.Mutable:
          case ValueKind.Context: {
            return 'mutate';
          }
          case ValueKind.Primitive: {
            // technically an error, but it's not React specific
            return 'none';
          }
          case ValueKind.Frozen: {
            return 'mutate-frozen';
          }
          case ValueKind.Global: {
            return 'mutate-global';
          }
          case ValueKind.MaybeFrozen: {
            return 'mutate-frozen';
          }
          default: {
            assertExhaustive(kind, `Unexpected kind ${kind}`);
          }
        }
      }
      default: {
        assertExhaustive(variant, `Unexpected mutation variant ${variant}`);
      }
    }
  }

  /*
   * Combine the contents of @param this and @param other, returning a new
   * instance with the combined changes _if_ there are any changes, or
   * returning null if no changes would occur. Changes include:
   * - new entries in @param other that did not exist in @param this
   * - entries whose values differ in @param this and @param other,
   *    and where joining the values produces a different value than
   *    what was in @param this.
   *
   * Note that values are joined using a lattice operation to ensure
   * termination.
   */
  merge(other: InferenceState): InferenceState | null {
    let nextValues: Map<InstructionValue, AbstractValue> | null = null;
    let nextVariables: Map<IdentifierId, Set<InstructionValue>> | null = null;

    for (const [id, thisValue] of this.#values) {
      const otherValue = other.#values.get(id);
      if (otherValue !== undefined) {
        const mergedValue = mergeAbstractValues(thisValue, otherValue);
        if (mergedValue !== thisValue) {
          nextValues = nextValues ?? new Map(this.#values);
          nextValues.set(id, mergedValue);
        }
      }
    }
    for (const [id, otherValue] of other.#values) {
      if (this.#values.has(id)) {
        // merged above
        continue;
      }
      nextValues = nextValues ?? new Map(this.#values);
      nextValues.set(id, otherValue);
    }

    for (const [id, thisValues] of this.#variables) {
      const otherValues = other.#variables.get(id);
      if (otherValues !== undefined) {
        let mergedValues: Set<InstructionValue> | null = null;
        for (const otherValue of otherValues) {
          if (!thisValues.has(otherValue)) {
            mergedValues = mergedValues ?? new Set(thisValues);
            mergedValues.add(otherValue);
          }
        }
        if (mergedValues !== null) {
          nextVariables = nextVariables ?? new Map(this.#variables);
          nextVariables.set(id, mergedValues);
        }
      }
    }
    for (const [id, otherValues] of other.#variables) {
      if (this.#variables.has(id)) {
        continue;
      }
      nextVariables = nextVariables ?? new Map(this.#variables);
      nextVariables.set(id, new Set(otherValues));
    }

    if (nextVariables === null && nextValues === null) {
      return null;
    } else {
      return new InferenceState(
        this.env,
        this.#isFunctionExpression,
        nextValues ?? new Map(this.#values),
        nextVariables ?? new Map(this.#variables),
      );
    }
  }

  /*
   * Returns a copy of this state.
   * TODO: consider using persistent data structures to make
   * clone cheaper.
   */
  clone(): InferenceState {
    return new InferenceState(
      this.env,
      this.#isFunctionExpression,
      new Map(this.#values),
      new Map(this.#variables),
    );
  }

  /*
   * For debugging purposes, dumps the state to a plain
   * object so that it can printed as JSON.
   */
  debug(): any {
    const result: any = {values: {}, variables: {}};
    const objects: Map<InstructionValue, number> = new Map();
    function identify(value: InstructionValue): number {
      let id = objects.get(value);
      if (id == null) {
        id = objects.size;
        objects.set(value, id);
      }
      return id;
    }
    for (const [value, kind] of this.#values) {
      const id = identify(value);
      result.values[id] = {
        abstract: this.debugAbstractValue(kind),
        value: printInstructionValue(value),
      };
    }
    for (const [variable, values] of this.#variables) {
      result.variables[`$${variable}`] = [...values].map(identify);
    }
    return result;
  }

  debugAbstractValue(value: AbstractValue): any {
    return {
      kind: value.kind,
      reason: [...value.reason],
    };
  }

  inferPhi(phi: Phi): void {
    const values: Set<InstructionValue> = new Set();
    for (const [_, operand] of phi.operands) {
      const operandValues = this.#variables.get(operand.identifier.id);
      // This is a backedge that will be handled later by State.merge
      if (operandValues === undefined) continue;
      for (const v of operandValues) {
        values.add(v);
      }
    }

    if (values.size > 0) {
      this.#variables.set(phi.place.identifier.id, values);
    }
  }
}

/**
 * Returns a value that represents the combined states of the two input values.
 * If the two values are semantically equivalent, it returns the first argument.
 */
function mergeAbstractValues(
  a: AbstractValue,
  b: AbstractValue,
): AbstractValue {
  const kind = mergeValueKinds(a.kind, b.kind);
  if (
    kind === a.kind &&
    kind === b.kind &&
    Set_isSuperset(a.reason, b.reason)
  ) {
    return a;
  }
  const reason = new Set(a.reason);
  for (const r of b.reason) {
    reason.add(r);
  }
  return {kind, reason};
}

type InstructionSignature = {
  effects: ReadonlyArray<AliasingEffect>;
};

function conditionallyMutateIterator(place: Place): AliasingEffect | null {
  if (
    !(
      isArrayType(place.identifier) ||
      isSetType(place.identifier) ||
      isMapType(place.identifier)
    )
  ) {
    return {
      kind: 'MutateTransitiveConditionally',
      value: place,
    };
  }
  return null;
}

/**
 * Computes an effect signature for the instruction _without_ looking at the inference state,
 * and only using the semantics of the instructions and the inferred types. The idea is to make
 * it easy to check that the semantics of each instruction are preserved by describing only the
 * effects and not making decisions based on the inference state.
 *
 * Then in applySignature(), above, we refine this signature based on the inference state.
 *
 * NOTE: this function is designed to be cached so it's only computed once upon first visiting
 * an instruction.
 */
function computeSignatureForInstruction(
  context: Context,
  env: Environment,
  instr: Instruction,
): InstructionSignature {
  const {lvalue, value} = instr;
  const effects: Array<AliasingEffect> = [];
  switch (value.kind) {
    case 'ArrayExpression': {
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Mutable,
        reason: ValueReason.Other,
      });
      // All elements are captured into part of the output value
      for (const element of value.elements) {
        if (element.kind === 'Identifier') {
          effects.push({
            kind: 'Capture',
            from: element,
            into: lvalue,
          });
        } else if (element.kind === 'Spread') {
          const mutateIterator = conditionallyMutateIterator(element.place);
          if (mutateIterator != null) {
            effects.push(mutateIterator);
          }
          effects.push({
            kind: 'Capture',
            from: element.place,
            into: lvalue,
          });
        } else {
          continue;
        }
      }
      break;
    }
    case 'ObjectExpression': {
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Mutable,
        reason: ValueReason.Other,
      });
      for (const property of value.properties) {
        if (property.kind === 'ObjectProperty') {
          effects.push({
            kind: 'Capture',
            from: property.place,
            into: lvalue,
          });
        } else {
          effects.push({
            kind: 'Capture',
            from: property.place,
            into: lvalue,
          });
        }
      }
      break;
    }
    case 'Await': {
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Mutable,
        reason: ValueReason.Other,
      });
      // Potentially mutates the receiver (awaiting it changes its state and can run side effects)
      effects.push({kind: 'MutateTransitiveConditionally', value: value.value});
      /**
       * Data from the promise may be returned into the result, but await does not directly return
       * the promise itself
       */
      effects.push({
        kind: 'Capture',
        from: value.value,
        into: lvalue,
      });
      break;
    }
    case 'NewExpression':
    case 'CallExpression':
    case 'MethodCall': {
      let callee;
      let receiver;
      let mutatesCallee;
      if (value.kind === 'NewExpression') {
        callee = value.callee;
        receiver = value.callee;
        mutatesCallee = false;
      } else if (value.kind === 'CallExpression') {
        callee = value.callee;
        receiver = value.callee;
        mutatesCallee = true;
      } else if (value.kind === 'MethodCall') {
        callee = value.property;
        receiver = value.receiver;
        mutatesCallee = false;
      } else {
        assertExhaustive(
          value,
          `Unexpected value kind '${(value as any).kind}'`,
        );
      }
      const signature = getFunctionCallSignature(env, callee.identifier.type);
      effects.push({
        kind: 'Apply',
        receiver,
        function: callee,
        mutatesFunction: mutatesCallee,
        args: value.args,
        into: lvalue,
        signature,
        loc: value.loc,
      });
      break;
    }
    case 'PropertyDelete':
    case 'ComputedDelete': {
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Primitive,
        reason: ValueReason.Other,
      });
      // Mutates the object by removing the property, no aliasing
      effects.push({kind: 'Mutate', value: value.object});
      break;
    }
    case 'PropertyLoad':
    case 'ComputedLoad': {
      if (isPrimitiveType(lvalue.identifier)) {
        effects.push({
          kind: 'Create',
          into: lvalue,
          value: ValueKind.Primitive,
          reason: ValueReason.Other,
        });
      } else {
        effects.push({
          kind: 'CreateFrom',
          from: value.object,
          into: lvalue,
        });
      }
      break;
    }
    case 'PropertyStore':
    case 'ComputedStore': {
      /**
       * Add a hint about naming as "ref"/"-Ref", but only if we weren't able to infer any
       * type for the object. In some cases the variable may be named like a ref, but is
       * also used as a ref callback such that we infer the type as a function rather than
       * a ref.
       */
      const mutationReason: MutationReason | null =
        value.kind === 'PropertyStore' &&
        value.property === 'current' &&
        value.object.identifier.type.kind === 'Type'
          ? {kind: 'AssignCurrentProperty'}
          : null;
      effects.push({
        kind: 'Mutate',
        value: value.object,
        reason: mutationReason,
      });
      effects.push({
        kind: 'Capture',
        from: value.value,
        into: value.object,
      });
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Primitive,
        reason: ValueReason.Other,
      });
      break;
    }
    case 'ObjectMethod':
    case 'FunctionExpression': {
      /**
       * We've already analyzed the function expression in AnalyzeFunctions. There, we assign
       * a Capture effect to any context variable that appears (locally) to be aliased and/or
       * mutated. The precise effects are annotated on the function expression's aliasingEffects
       * property, but we don't want to execute those effects yet. We can only use those when
       * we know exactly how the function is invoked — via an Apply effect from a custom signature.
       *
       * But in the general case, functions can be passed around and possibly called in ways where
       * we don't know how to interpret their precise effects. For example:
       *
       * ```
       * const a = {};
       *
       * // We don't want to consider a as mutating here, this just declares the function
       * const f = () => { maybeMutate(a) };
       *
       * // We don't want to consider a as mutating here either, it can't possibly call f yet
       * const x = [f];
       *
       * // Here we have to assume that f can be called (transitively), and have to consider a
       * // as mutating
       * callAllFunctionInArray(x);
       * ```
       *
       * So for any context variables that were inferred as captured or mutated, we record a
       * Capture effect. If the resulting function is transitively mutated, this will mean
       * that those operands are also considered mutated. If the function is never called,
       * they won't be!
       *
       * This relies on the rule that:
       * Capture a -> b and MutateTransitive(b) => Mutate(a)
       *
       * Substituting:
       * Capture contextvar -> function and MutateTransitive(function) => Mutate(contextvar)
       *
       * Note that if the type of the context variables are frozen, global, or primitive, the
       * Capture will either get pruned or downgraded to an ImmutableCapture.
       */
      effects.push({
        kind: 'CreateFunction',
        into: lvalue,
        function: value,
        captures: value.loweredFunc.func.context.filter(
          operand => operand.effect === Effect.Capture,
        ),
      });
      break;
    }
    case 'GetIterator': {
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Mutable,
        reason: ValueReason.Other,
      });
      if (
        isArrayType(value.collection.identifier) ||
        isMapType(value.collection.identifier) ||
        isSetType(value.collection.identifier)
      ) {
        /*
         * Builtin collections are known to return a fresh iterator on each call,
         * so the iterator does not alias the collection
         */
        effects.push({
          kind: 'Capture',
          from: value.collection,
          into: lvalue,
        });
      } else {
        /*
         * Otherwise, the object may return itself as the iterator, so we have to
         * assume that the result directly aliases the collection. Further, the
         * method to get the iterator could potentially mutate the collection
         */
        effects.push({kind: 'Alias', from: value.collection, into: lvalue});
        effects.push({
          kind: 'MutateTransitiveConditionally',
          value: value.collection,
        });
      }
      break;
    }
    case 'IteratorNext': {
      /*
       * Technically advancing an iterator will always mutate it (for any reasonable implementation)
       * But because we create an alias from the collection to the iterator if we don't know the type,
       * then it's possible the iterator is aliased to a frozen value and we wouldn't want to error.
       * so we mark this as conditional mutation to allow iterating frozen values.
       */
      effects.push({kind: 'MutateConditionally', value: value.iterator});
      // Extracts part of the original collection into the result
      effects.push({
        kind: 'CreateFrom',
        from: value.collection,
        into: lvalue,
      });
      break;
    }
    case 'NextPropertyOf': {
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Primitive,
        reason: ValueReason.Other,
      });
      break;
    }
    case 'JsxExpression':
    case 'JsxFragment': {
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Frozen,
        reason: ValueReason.JsxCaptured,
      });
      for (const operand of eachInstructionValueOperand(value)) {
        effects.push({
          kind: 'Freeze',
          value: operand,
          reason: ValueReason.JsxCaptured,
        });
        effects.push({
          kind: 'Capture',
          from: operand,
          into: lvalue,
        });
      }
      if (value.kind === 'JsxExpression') {
        if (value.tag.kind === 'Identifier') {
          // Tags are render function, by definition they're called during render
          effects.push({
            kind: 'Render',
            place: value.tag,
          });
        }
        if (value.children != null) {
          // Children are typically called during render, not used as an event/effect callback
          for (const child of value.children) {
            effects.push({
              kind: 'Render',
              place: child,
            });
          }
        }
        for (const prop of value.props) {
          if (
            prop.kind === 'JsxAttribute' &&
            prop.place.identifier.type.kind === 'Function' &&
            (isJsxType(prop.place.identifier.type.return) ||
              (prop.place.identifier.type.return.kind === 'Phi' &&
                prop.place.identifier.type.return.operands.some(operand =>
                  isJsxType(operand),
                )))
          ) {
            // Any props which return jsx are assumed to be called during render
            effects.push({
              kind: 'Render',
              place: prop.place,
            });
          }
        }
      }
      break;
    }
    case 'DeclareLocal': {
      // TODO check this
      effects.push({
        kind: 'Create',
        into: value.lvalue.place,
        // TODO: what kind here???
        value: ValueKind.Primitive,
        reason: ValueReason.Other,
      });
      effects.push({
        kind: 'Create',
        into: lvalue,
        // TODO: what kind here???
        value: ValueKind.Primitive,
        reason: ValueReason.Other,
      });
      break;
    }
    case 'Destructure': {
      for (const patternItem of eachPatternItem(value.lvalue.pattern)) {
        const place =
          patternItem.kind === 'Identifier' ? patternItem : patternItem.place;
        if (isPrimitiveType(place.identifier)) {
          effects.push({
            kind: 'Create',
            into: place,
            value: ValueKind.Primitive,
            reason: ValueReason.Other,
          });
        } else if (patternItem.kind === 'Identifier') {
          effects.push({
            kind: 'CreateFrom',
            from: value.value,
            into: place,
          });
        } else {
          // Spread creates a new object/array that captures from the RValue
          effects.push({
            kind: 'Create',
            into: place,
            reason: ValueReason.Other,
            value: context.nonMutatingSpreads.has(place.identifier.id)
              ? ValueKind.Frozen
              : ValueKind.Mutable,
          });
          effects.push({
            kind: 'Capture',
            from: value.value,
            into: place,
          });
        }
      }
      effects.push({kind: 'Assign', from: value.value, into: lvalue});
      break;
    }
    case 'LoadContext': {
      /*
       * Context variables are like mutable boxes. Loading from one
       * is equivalent to a PropertyLoad from the box, so we model it
       * with the same effect we use there (CreateFrom)
       */
      effects.push({kind: 'CreateFrom', from: value.place, into: lvalue});
      break;
    }
    case 'DeclareContext': {
      // Context variables are conceptually like mutable boxes
      const kind = value.lvalue.kind;
      if (
        !context.hoistedContextDeclarations.has(
          value.lvalue.place.identifier.declarationId,
        ) ||
        kind === InstructionKind.HoistedConst ||
        kind === InstructionKind.HoistedFunction ||
        kind === InstructionKind.HoistedLet
      ) {
        /**
         * If this context variable is not hoisted, or this is the declaration doing the hoisting,
         * then we create the box.
         */
        effects.push({
          kind: 'Create',
          into: value.lvalue.place,
          value: ValueKind.Mutable,
          reason: ValueReason.Other,
        });
      } else {
        /**
         * Otherwise this may be a "declare", but there was a previous DeclareContext that
         * hoisted this variable, and we're mutating it here.
         */
        effects.push({kind: 'Mutate', value: value.lvalue.place});
      }
      effects.push({
        kind: 'Create',
        into: lvalue,
        // The result can't be referenced so this value doesn't matter
        value: ValueKind.Primitive,
        reason: ValueReason.Other,
      });
      break;
    }
    case 'StoreContext': {
      /*
       * Context variables are like mutable boxes, so semantically
       * we're either creating (let/const) or mutating (reassign) a box,
       * and then capturing the value into it.
       */
      if (
        value.lvalue.kind === InstructionKind.Reassign ||
        context.hoistedContextDeclarations.has(
          value.lvalue.place.identifier.declarationId,
        )
      ) {
        effects.push({kind: 'Mutate', value: value.lvalue.place});
      } else {
        effects.push({
          kind: 'Create',
          into: value.lvalue.place,
          value: ValueKind.Mutable,
          reason: ValueReason.Other,
        });
      }
      effects.push({
        kind: 'Capture',
        from: value.value,
        into: value.lvalue.place,
      });
      effects.push({kind: 'Assign', from: value.value, into: lvalue});
      break;
    }
    case 'LoadLocal': {
      effects.push({kind: 'Assign', from: value.place, into: lvalue});
      break;
    }
    case 'StoreLocal': {
      effects.push({
        kind: 'Assign',
        from: value.value,
        into: value.lvalue.place,
      });
      effects.push({kind: 'Assign', from: value.value, into: lvalue});
      break;
    }
    case 'PostfixUpdate':
    case 'PrefixUpdate': {
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Primitive,
        reason: ValueReason.Other,
      });
      effects.push({
        kind: 'Create',
        into: value.lvalue,
        value: ValueKind.Primitive,
        reason: ValueReason.Other,
      });
      break;
    }
    case 'StoreGlobal': {
      const variable = `\`${value.name}\``;
      effects.push({
        kind: 'MutateGlobal',
        place: value.value,
        error: CompilerDiagnostic.create({
          category: ErrorCategory.Globals,
          reason:
            'Cannot reassign variables declared outside of the component/hook',
          description: `Variable ${variable} is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render)`,
        }).withDetails({
          kind: 'error',
          loc: instr.loc,
          message: `${variable} cannot be reassigned`,
        }),
      });
      effects.push({kind: 'Assign', from: value.value, into: lvalue});
      break;
    }
    case 'TypeCastExpression': {
      effects.push({kind: 'Assign', from: value.value, into: lvalue});
      break;
    }
    case 'LoadGlobal': {
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Global,
        reason: ValueReason.Global,
      });
      break;
    }
    case 'StartMemoize':
    case 'FinishMemoize': {
      if (env.config.enablePreserveExistingMemoizationGuarantees) {
        for (const operand of eachInstructionValueOperand(value)) {
          effects.push({
            kind: 'Freeze',
            value: operand,
            reason: ValueReason.HookCaptured,
          });
        }
      }
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Primitive,
        reason: ValueReason.Other,
      });
      break;
    }
    case 'TaggedTemplateExpression':
    case 'BinaryExpression':
    case 'Debugger':
    case 'JSXText':
    case 'MetaProperty':
    case 'Primitive':
    case 'RegExpLiteral':
    case 'TemplateLiteral':
    case 'UnaryExpression':
    case 'UnsupportedNode': {
      effects.push({
        kind: 'Create',
        into: lvalue,
        value: ValueKind.Primitive,
        reason: ValueReason.Other,
      });
      break;
    }
  }
  return {
    effects,
  };
}

/**
 * Creates a set of aliasing effects given a legacy FunctionSignature. This makes all of the
 * old implicit behaviors from the signatures and InferReferenceEffects explicit, see comments
 * in the body for details.
 *
 * The goal of this method is to make it easier to migrate incrementally to the new system,
 * so we don't have to immediately write new signatures for all the methods to get expected
 * compilation output.
 */
function computeEffectsForLegacySignature(
  state: InferenceState,
  signature: FunctionSignature,
  lvalue: Place,
  receiver: Place,
  args: Array<Place | SpreadPattern | Hole>,
  loc: SourceLocation,
): Array<AliasingEffect> {
  const returnValueReason = signature.returnValueReason ?? ValueReason.Other;
  const effects: Array<AliasingEffect> = [];
  effects.push({
    kind: 'Create',
    into: lvalue,
    value: signature.returnValueKind,
    reason: returnValueReason,
  });
  if (signature.impure && state.env.config.validateNoImpureFunctionsInRender) {
    effects.push({
      kind: 'Impure',
      place: receiver,
      error: CompilerDiagnostic.create({
        category: ErrorCategory.Purity,
        reason: 'Cannot call impure function during render',
        description:
          (signature.canonicalName != null
            ? `\`${signature.canonicalName}\` is an impure function. `
            : '') +
          'Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent)',
      }).withDetails({
        kind: 'error',
        loc,
        message: 'Cannot call impure function',
      }),
    });
  }
  if (signature.knownIncompatible != null && state.env.enableValidations) {
    const errors = new CompilerError();
    errors.pushDiagnostic(
      CompilerDiagnostic.create({
        category: ErrorCategory.IncompatibleLibrary,
        reason: 'Use of incompatible library',
        description: [
          'This API returns functions which cannot be memoized without leading to stale UI. ' +
            'To prevent this, by default React Compiler will skip memoizing this component/hook. ' +
            'However, you may see issues if values from this API are passed to other components/hooks that are ' +
            'memoized',
        ].join(''),
      }).withDetails({
        kind: 'error',
        loc: receiver.loc,
        message: signature.knownIncompatible,
      }),
    );
    throw errors;
  }
  const stores: Array<Place> = [];
  const captures: Array<Place> = [];
  function visit(place: Place, effect: Effect): void {
    switch (effect) {
      case Effect.Store: {
        effects.push({
          kind: 'Mutate',
          value: place,
        });
        stores.push(place);
        break;
      }
      case Effect.Capture: {
        captures.push(place);
        break;
      }
      case Effect.ConditionallyMutate: {
        effects.push({
          kind: 'MutateTransitiveConditionally',
          value: place,
        });
        break;
      }
      case Effect.ConditionallyMutateIterator: {
        const mutateIterator = conditionallyMutateIterator(place);
        if (mutateIterator != null) {
          effects.push(mutateIterator);
        }
        effects.push({
          kind: 'Capture',
          from: place,
          into: lvalue,
        });
        break;
      }
      case Effect.Freeze: {
        effects.push({
          kind: 'Freeze',
          value: place,
          reason: returnValueReason,
        });
        break;
      }
      case Effect.Mutate: {
        effects.push({kind: 'MutateTransitive', value: place});
        break;
      }
      case Effect.Read: {
        effects.push({
          kind: 'ImmutableCapture',
          from: place,
          into: lvalue,
        });
        break;
      }
    }
  }

  if (
    signature.mutableOnlyIfOperandsAreMutable &&
    areArgumentsImmutableAndNonMutating(state, args)
  ) {
    effects.push({
      kind: 'Alias',
      from: receiver,
      into: lvalue,
    });
    for (const arg of args) {
      if (arg.kind === 'Hole') {
        continue;
      }
      const place = arg.kind === 'Identifier' ? arg : arg.place;
      effects.push({
        kind: 'ImmutableCapture',
        from: place,
        into: lvalue,
      });
    }
    return effects;
  }

  if (signature.calleeEffect !== Effect.Capture) {
    /*
     * InferReferenceEffects and FunctionSignature have an implicit assumption that the receiver
     * is captured into the return value. Consider for example the signature for Array.proto.pop:
     * the calleeEffect is Store, since it's a known mutation but non-transitive. But the return
     * of the pop() captures from the receiver! This isn't specified explicitly. So we add this
     * here, and rely on applySignature() to downgrade this to ImmutableCapture (or prune) if
     * the type doesn't actually need to be captured based on the input and return type.
     */
    effects.push({
      kind: 'Alias',
      from: receiver,
      into: lvalue,
    });
  }
  visit(receiver, signature.calleeEffect);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.kind === 'Hole') {
      continue;
    }
    const place = arg.kind === 'Identifier' ? arg : arg.place;
    const signatureEffect =
      arg.kind === 'Identifier' && i < signature.positionalParams.length
        ? signature.positionalParams[i]!
        : (signature.restParam ?? Effect.ConditionallyMutate);
    const effect = getArgumentEffect(signatureEffect, arg);

    visit(place, effect);
  }
  if (captures.length !== 0) {
    if (stores.length === 0) {
      // If no stores, then capture into the return value
      for (const capture of captures) {
        effects.push({kind: 'Alias', from: capture, into: lvalue});
      }
    } else {
      // Else capture into the stores
      for (const capture of captures) {
        for (const store of stores) {
          effects.push({kind: 'Capture', from: capture, into: store});
        }
      }
    }
  }
  return effects;
}

/**
 * Returns true if all of the arguments are both non-mutable (immutable or frozen)
 * _and_ are not functions which might mutate their arguments. Note that function
 * expressions count as frozen so long as they do not mutate free variables: this
 * function checks that such functions also don't mutate their inputs.
 */
function areArgumentsImmutableAndNonMutating(
  state: InferenceState,
  args: Array<Place | SpreadPattern | Hole>,
): boolean {
  for (const arg of args) {
    if (arg.kind === 'Hole') {
      continue;
    }
    if (arg.kind === 'Identifier' && arg.identifier.type.kind === 'Function') {
      const fnShape = state.env.getFunctionSignature(arg.identifier.type);
      if (fnShape != null) {
        return (
          !fnShape.positionalParams.some(isKnownMutableEffect) &&
          (fnShape.restParam == null ||
            !isKnownMutableEffect(fnShape.restParam))
        );
      }
    }
    const place = arg.kind === 'Identifier' ? arg : arg.place;

    const kind = state.kind(place).kind;
    switch (kind) {
      case ValueKind.Primitive:
      case ValueKind.Frozen: {
        /*
         * Only immutable values, or frozen lambdas are allowed.
         * A lambda may appear frozen even if it may mutate its inputs,
         * so we have a second check even for frozen value types
         */
        break;
      }
      default: {
        /**
         * Globals, module locals, and other locally defined functions may
         * mutate their arguments.
         */
        return false;
      }
    }
    const values = state.values(place);
    for (const value of values) {
      if (
        value.kind === 'FunctionExpression' &&
        value.loweredFunc.func.params.some(param => {
          const place = param.kind === 'Identifier' ? param : param.place;
          const range = place.identifier.mutableRange;
          return range.end > range.start + 1;
        })
      ) {
        // This is a function which may mutate its inputs
        return false;
      }
    }
  }
  return true;
}

function computeEffectsForSignature(
  env: Environment,
  signature: AliasingSignature,
  lvalue: Place,
  receiver: Place,
  args: Array<Place | SpreadPattern | Hole>,
  // Used for signatures constructed dynamically which reference context variables
  context: Array<Place> = [],
  loc: SourceLocation,
): Array<AliasingEffect> | null {
  if (
    // Not enough args
    signature.params.length > args.length ||
    // Too many args and there is no rest param to hold them
    (args.length > signature.params.length && signature.rest == null)
  ) {
    return null;
  }
  // Build substitutions
  const mutableSpreads = new Set<IdentifierId>();
  const substitutions: Map<IdentifierId, Array<Place>> = new Map();
  substitutions.set(signature.receiver, [receiver]);
  substitutions.set(signature.returns, [lvalue]);
  const params = signature.params;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.kind === 'Hole') {
      continue;
    } else if (params == null || i >= params.length || arg.kind === 'Spread') {
      if (signature.rest == null) {
        return null;
      }
      const place = arg.kind === 'Identifier' ? arg : arg.place;
      getOrInsertWith(substitutions, signature.rest, () => []).push(place);

      if (arg.kind === 'Spread') {
        const mutateIterator = conditionallyMutateIterator(arg.place);
        if (mutateIterator != null) {
          mutableSpreads.add(arg.place.identifier.id);
        }
      }
    } else {
      const param = params[i];
      substitutions.set(param, [arg]);
    }
  }

  /*
   * Signatures constructed dynamically from function expressions will reference values
   * other than their receiver/args/etc. We populate the substitution table with these
   * values so that we can still exit for unpopulated substitutions
   */
  for (const operand of context) {
    substitutions.set(operand.identifier.id, [operand]);
  }

  const effects: Array<AliasingEffect> = [];
  for (const signatureTemporary of signature.temporaries) {
    const temp = createTemporaryPlace(env, receiver.loc);
    substitutions.set(signatureTemporary.identifier.id, [temp]);
  }

  // Apply substitutions
  for (const effect of signature.effects) {
    switch (effect.kind) {
      case 'MaybeAlias':
      case 'Assign':
      case 'ImmutableCapture':
      case 'Alias':
      case 'CreateFrom':
      case 'Capture': {
        const from = substitutions.get(effect.from.identifier.id) ?? [];
        const to = substitutions.get(effect.into.identifier.id) ?? [];
        for (const fromId of from) {
          for (const toId of to) {
            effects.push({
              kind: effect.kind,
              from: fromId,
              into: toId,
            });
          }
        }
        break;
      }
      case 'Impure':
      case 'MutateFrozen':
      case 'MutateGlobal': {
        const values = substitutions.get(effect.place.identifier.id) ?? [];
        for (const value of values) {
          effects.push({kind: effect.kind, place: value, error: effect.error});
        }
        break;
      }
      case 'Render': {
        const values = substitutions.get(effect.place.identifier.id) ?? [];
        for (const value of values) {
          effects.push({kind: effect.kind, place: value});
        }
        break;
      }
      case 'Mutate':
      case 'MutateTransitive':
      case 'MutateTransitiveConditionally':
      case 'MutateConditionally': {
        const values = substitutions.get(effect.value.identifier.id) ?? [];
        for (const id of values) {
          effects.push({kind: effect.kind, value: id});
        }
        break;
      }
      case 'Freeze': {
        const values = substitutions.get(effect.value.identifier.id) ?? [];
        for (const value of values) {
          if (mutableSpreads.has(value.identifier.id)) {
            CompilerError.throwTodo({
              reason: 'Support spread syntax for hook arguments',
              loc: value.loc,
            });
          }
          effects.push({kind: 'Freeze', value, reason: effect.reason});
        }
        break;
      }
      case 'Create': {
        const into = substitutions.get(effect.into.identifier.id) ?? [];
        for (const value of into) {
          effects.push({
            kind: 'Create',
            into: value,
            value: effect.value,
            reason: effect.reason,
          });
        }
        break;
      }
      case 'Apply': {
        const applyReceiver = substitutions.get(effect.receiver.identifier.id);
        if (applyReceiver == null || applyReceiver.length !== 1) {
          return null;
        }
        const applyFunction = substitutions.get(effect.function.identifier.id);
        if (applyFunction == null || applyFunction.length !== 1) {
          return null;
        }
        const applyInto = substitutions.get(effect.into.identifier.id);
        if (applyInto == null || applyInto.length !== 1) {
          return null;
        }
        const applyArgs: Array<Place | SpreadPattern | Hole> = [];
        for (const arg of effect.args) {
          if (arg.kind === 'Hole') {
            applyArgs.push(arg);
          } else if (arg.kind === 'Identifier') {
            const applyArg = substitutions.get(arg.identifier.id);
            if (applyArg == null || applyArg.length !== 1) {
              return null;
            }
            applyArgs.push(applyArg[0]);
          } else {
            const applyArg = substitutions.get(arg.place.identifier.id);
            if (applyArg == null || applyArg.length !== 1) {
              return null;
            }
            applyArgs.push({kind: 'Spread', place: applyArg[0]});
          }
        }
        effects.push({
          kind: 'Apply',
          mutatesFunction: effect.mutatesFunction,
          receiver: applyReceiver[0],
          args: applyArgs,
          function: applyFunction[0],
          into: applyInto[0],
          signature: effect.signature,
          loc,
        });
        break;
      }
      case 'CreateFunction': {
        CompilerError.throwTodo({
          reason: `Support CreateFrom effects in signatures`,
          loc: receiver.loc,
        });
      }
      default: {
        assertExhaustive(
          effect,
          `Unexpected effect kind '${(effect as any).kind}'`,
        );
      }
    }
  }
  return effects;
}

function buildSignatureFromFunctionExpression(
  env: Environment,
  fn: FunctionExpression,
): AliasingSignature {
  let rest: IdentifierId | null = null;
  const params: Array<IdentifierId> = [];
  for (const param of fn.loweredFunc.func.params) {
    if (param.kind === 'Identifier') {
      params.push(param.identifier.id);
    } else {
      rest = param.place.identifier.id;
    }
  }
  return {
    receiver: makeIdentifierId(0),
    params,
    rest: rest ?? createTemporaryPlace(env, fn.loc).identifier.id,
    returns: fn.loweredFunc.func.returns.identifier.id,
    effects: fn.loweredFunc.func.aliasingEffects ?? [],
    temporaries: [],
  };
}

export type AbstractValue = {
  kind: ValueKind;
  reason: ReadonlySet<ValueReason>;
};

export function getWriteErrorReason(abstractValue: AbstractValue): string {
  if (abstractValue.reason.has(ValueReason.Global)) {
    return 'Modifying a variable defined outside a component or hook is not allowed. Consider using an effect';
  } else if (abstractValue.reason.has(ValueReason.JsxCaptured)) {
    return 'Modifying a value used previously in JSX is not allowed. Consider moving the modification before the JSX';
  } else if (abstractValue.reason.has(ValueReason.Context)) {
    return `Modifying a value returned from 'useContext()' is not allowed.`;
  } else if (abstractValue.reason.has(ValueReason.KnownReturnSignature)) {
    return 'Modifying a value returned from a function whose return value should not be mutated';
  } else if (abstractValue.reason.has(ValueReason.ReactiveFunctionArgument)) {
    return 'Modifying component props or hook arguments is not allowed. Consider using a local variable instead';
  } else if (abstractValue.reason.has(ValueReason.State)) {
    return "Modifying a value returned from 'useState()', which should not be modified directly. Use the setter function to update instead";
  } else if (abstractValue.reason.has(ValueReason.ReducerState)) {
    return "Modifying a value returned from 'useReducer()', which should not be modified directly. Use the dispatch function to update instead";
  } else if (abstractValue.reason.has(ValueReason.Effect)) {
    return 'Modifying a value used previously in an effect function or as an effect dependency is not allowed. Consider moving the modification before calling useEffect()';
  } else if (abstractValue.reason.has(ValueReason.HookCaptured)) {
    return 'Modifying a value previously passed as an argument to a hook is not allowed. Consider moving the modification before calling the hook';
  } else if (abstractValue.reason.has(ValueReason.HookReturn)) {
    return 'Modifying a value returned from a hook is not allowed. Consider moving the modification into the hook where the value is constructed';
  } else {
    return 'This modifies a variable that React considers immutable';
  }
}

function getArgumentEffect(
  signatureEffect: Effect | null,
  arg: Place | SpreadPattern,
): Effect {
  if (signatureEffect != null) {
    if (arg.kind === 'Identifier') {
      return signatureEffect;
    } else if (
      signatureEffect === Effect.Mutate ||
      signatureEffect === Effect.ConditionallyMutate
    ) {
      return signatureEffect;
    } else {
      // see call-spread-argument-mutable-iterator test fixture
      if (signatureEffect === Effect.Freeze) {
        CompilerError.throwTodo({
          reason: 'Support spread syntax for hook arguments',
          loc: arg.place.loc,
        });
      }
      // effects[i] is Effect.Capture | Effect.Read | Effect.Store
      return Effect.ConditionallyMutateIterator;
    }
  } else {
    return Effect.ConditionallyMutate;
  }
}

export function getFunctionCallSignature(
  env: Environment,
  type: Type,
): FunctionSignature | null {
  if (type.kind !== 'Function') {
    return null;
  }
  return env.getFunctionSignature(type);
}

export function isKnownMutableEffect(effect: Effect): boolean {
  switch (effect) {
    case Effect.Store:
    case Effect.ConditionallyMutate:
    case Effect.ConditionallyMutateIterator:
    case Effect.Mutate: {
      return true;
    }

    case Effect.Unknown: {
      CompilerError.invariant(false, {
        reason: 'Unexpected unknown effect',
        loc: GeneratedSource,
      });
    }
    case Effect.Read:
    case Effect.Capture:
    case Effect.Freeze: {
      return false;
    }
    default: {
      assertExhaustive(effect, `Unexpected effect \`${effect}\``);
    }
  }
}

/**
 * Joins two values using the following rules:
 * == Effect Transitions ==
 *
 * Freezing an immutable value has not effect:
 *                ┌───────────────┐
 *                │               │
 *                ▼               │ Freeze
 * ┌──────────────────────────┐  │
 * │        Immutable         │──┘
 * └──────────────────────────┘
 *
 * Freezing a mutable or maybe-frozen value makes it frozen. Freezing a frozen
 * value has no effect:
 *                                                     ┌───────────────┐
 * ┌─────────────────────────┐     Freeze             │               │
 * │       MaybeFrozen       │────┐                   ▼               │ Freeze
 * └─────────────────────────┘    │     ┌──────────────────────────┐  │
 *                                 ├────▶│          Frozen          │──┘
 *                                 │     └──────────────────────────┘
 * ┌─────────────────────────┐    │
 * │         Mutable         │────┘
 * └─────────────────────────┘
 *
 * == Join Lattice ==
 * - immutable | mutable => mutable
 *     The justification is that immutable and mutable values are different types,
 *     and functions can introspect them to tell the difference (if the argument
 *     is null return early, else if its an object mutate it).
 * - frozen | mutable => maybe-frozen
 *     Frozen values are indistinguishable from mutable values at runtime, so callers
 *     cannot dynamically avoid mutation of "frozen" values. If a value could be
 *     frozen we have to distinguish it from a mutable value. But it also isn't known
 *     frozen yet, so we distinguish as maybe-frozen.
 * - immutable | frozen => frozen
 *     This is subtle and falls out of the above rules. If a value could be any of
 *     immutable, mutable, or frozen, then at runtime it could either be a primitive
 *     or a reference type, and callers can't distinguish frozen or not for reference
 *     types. To ensure that any sequence of joins btw those three states yields the
 *     correct maybe-frozen, these two have to produce a frozen value.
 * - <any> | maybe-frozen => maybe-frozen
 * - immutable | context => context
 * - mutable | context => context
 * - frozen | context => maybe-frozen
 *
 * ┌──────────────────────────┐
 * │        Immutable         │───┐
 * └──────────────────────────┘   │
 *                                 │    ┌─────────────────────────┐
 *                                 ├───▶│         Frozen          │──┐
 * ┌──────────────────────────┐   │    └─────────────────────────┘  │
 * │          Frozen          │───┤                                 │  ┌─────────────────────────┐
 * └──────────────────────────┘   │                                 ├─▶│       MaybeFrozen       │
 *                                 │    ┌─────────────────────────┐  │  └─────────────────────────┘
 *                                 ├───▶│       MaybeFrozen       │──┘
 * ┌──────────────────────────┐   │    └─────────────────────────┘
 * │         Mutable          │───┘
 * └──────────────────────────┘
 */
function mergeValueKinds(a: ValueKind, b: ValueKind): ValueKind {
  if (a === b) {
    return a;
  } else if (a === ValueKind.MaybeFrozen || b === ValueKind.MaybeFrozen) {
    return ValueKind.MaybeFrozen;
    // after this a and b differ and neither are MaybeFrozen
  } else if (a === ValueKind.Mutable || b === ValueKind.Mutable) {
    if (a === ValueKind.Frozen || b === ValueKind.Frozen) {
      // frozen | mutable
      return ValueKind.MaybeFrozen;
    } else if (a === ValueKind.Context || b === ValueKind.Context) {
      // context | mutable
      return ValueKind.Context;
    } else {
      // mutable | immutable
      return ValueKind.Mutable;
    }
  } else if (a === ValueKind.Context || b === ValueKind.Context) {
    if (a === ValueKind.Frozen || b === ValueKind.Frozen) {
      // frozen | context
      return ValueKind.MaybeFrozen;
    } else {
      // context | immutable
      return ValueKind.Context;
    }
  } else if (a === ValueKind.Frozen || b === ValueKind.Frozen) {
    return ValueKind.Frozen;
  } else if (a === ValueKind.Global || b === ValueKind.Global) {
    return ValueKind.Global;
  } else {
    CompilerError.invariant(
      a === ValueKind.Primitive && b == ValueKind.Primitive,
      {
        reason: `Unexpected value kind in mergeValues()`,
        description: `Found kinds ${a} and ${b}`,
        loc: GeneratedSource,
      },
    );
    return ValueKind.Primitive;
  }
}
